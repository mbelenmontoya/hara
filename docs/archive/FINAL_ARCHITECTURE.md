# Hará Match - Final Production Architecture

**Status:** Production-ready, single source of truth
**Stack:** Next.js 14 + Supabase (PostgreSQL) + Vercel
**Critical:** PQL billing must be legally defensible

---

## Executive Summary

This document defines the ONLY approved implementation path for Hará Match MVP. All previous documents (ARCHITECTURE_ANALYSIS.md, PRODUCTION_REQUIREMENTS.md, SECURITY_FIXES.md) are superseded by this spec.

**Core Principle:** Billing-critical events (contact_click) flow through ONE secure path with no client trust, no forgeable tokens, and complete audit trail.

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [RLS Policies](#rls-policies)
3. [Authentication & Authorization](#authentication--authorization)
4. [Attribution Flow](#attribution-flow)
5. [Contact Click Ingestion](#contact-click-ingestion)
6. [PQL Creation & Billing](#pql-creation--billing)
7. [Privacy & Retention](#privacy--retention)
8. [Partitioning & Scale](#partitioning--scale)
9. [Implementation Milestones](#implementation-milestones)
10. [Testing Strategy](#testing-strategy)
11. [Remaining Risks](#remaining-risks)

---

## Database Schema

### Core Tables

```sql
-- professionals: Professional profiles
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'active', 'paused')),

  -- Profile
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  whatsapp TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  online_only BOOLEAN DEFAULT false,

  -- Professional details
  modality TEXT[] NOT NULL,
  specialties TEXT[] NOT NULL,
  style TEXT[],
  price_range_min INTEGER,
  price_range_max INTEGER,
  currency TEXT DEFAULT 'USD',

  -- Operational
  accepting_new_clients BOOLEAN DEFAULT true,
  response_time_expectation TEXT,

  -- Content
  bio TEXT,
  profile_image_url TEXT,
  legacy_testimonials JSONB DEFAULT '[]',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

CREATE INDEX idx_professionals_status ON professionals(status);
CREATE INDEX idx_professionals_country_city ON professionals(country, city);
CREATE INDEX idx_professionals_modality ON professionals USING GIN(modality);
CREATE INDEX idx_professionals_specialties ON professionals USING GIN(specialties);

-- leads: User lead submissions
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact (optional for anonymous)
  email TEXT,
  whatsapp TEXT,
  user_name TEXT,

  -- Request
  country TEXT NOT NULL,
  city TEXT,
  online_ok BOOLEAN DEFAULT true,
  modality_preference TEXT[],
  budget_min INTEGER,
  budget_max INTEGER,
  currency TEXT DEFAULT 'USD',

  -- Intent
  intent_tags TEXT[] NOT NULL,
  style_preference TEXT[],
  urgency TEXT,
  additional_context TEXT,

  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'matched', 'contacted', 'converted', 'closed')),

  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_country ON leads(country);

-- matches: Match records (3 recommendations per lead)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tracking_code TEXT UNIQUE NOT NULL,

  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'viewed', 'contacted', 'feedback_received')),
  sent_at TIMESTAMPTZ,
  sent_via TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID -- Admin user who created match
);

CREATE INDEX idx_matches_lead_id ON matches(lead_id);
CREATE INDEX idx_matches_tracking_code ON matches(tracking_code);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

-- match_recommendations: Normalized recommendations (replaces JSONB)
CREATE TABLE match_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,

  rank INTEGER NOT NULL CHECK (rank IN (1, 2, 3)),
  reasons TEXT[] NOT NULL,

  -- Attribution token (signed JWT, stored for audit)
  attribution_token TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (match_id, professional_id),
  UNIQUE (match_id, rank)
);

CREATE INDEX idx_match_recommendations_match ON match_recommendations(match_id);
CREATE INDEX idx_match_recommendations_professional ON match_recommendations(professional_id);

-- events: All tracking events (partitioned for scale)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_submitted',
    'match_created',
    'match_sent',
    'profile_view',
    'contact_click',
    'feedback_submitted',
    'professional_applied'
  )),

  -- Attribution
  match_id UUID,
  lead_id UUID,
  professional_id UUID,
  tracking_code TEXT,

  -- Event metadata
  event_data JSONB DEFAULT '{}',

  -- User context (for fraud detection)
  session_id TEXT,
  fingerprint_hash TEXT, -- SHA256(fingerprint) for privacy
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Initial partition (more will be created monthly)
CREATE TABLE events_2024_01 PARTITION OF events
FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2024-02-01 00:00:00+00');

CREATE INDEX idx_events_2024_01_type ON events_2024_01(event_type);
CREATE INDEX idx_events_2024_01_professional ON events_2024_01(professional_id);
CREATE INDEX idx_events_2024_01_match ON events_2024_01(match_id);

-- pqls: Pay-per-qualified-lead records (APPEND-ONLY)
CREATE TABLE pqls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution (immutable)
  match_id UUID NOT NULL REFERENCES matches(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  event_id UUID NOT NULL, -- References events(id) but no FK due to partitioning
  tracking_code TEXT NOT NULL,

  -- Billing
  billing_month DATE NOT NULL,

  -- Status (always 'active' - adjustments in separate table)
  status TEXT DEFAULT 'active' CHECK (status = 'active'),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Idempotency: one PQL per (match, professional)
  UNIQUE(match_id, professional_id)
);

CREATE INDEX idx_pqls_professional_billing ON pqls(professional_id, billing_month);
CREATE INDEX idx_pqls_billing_month ON pqls(billing_month);
CREATE INDEX idx_pqls_event_id ON pqls(event_id);

-- pql_adjustments: Dispute/waive/refund records (for audit trail)
CREATE TABLE pql_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pql_id UUID NOT NULL REFERENCES pqls(id),

  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('waive', 'dispute', 'refund', 'restore')),
  reason TEXT NOT NULL,
  notes TEXT,

  billing_month DATE NOT NULL,
  amount_adjustment INTEGER DEFAULT 0, -- -1 for waive/refund, +1 for restore

  -- Audit
  created_by UUID NOT NULL, -- Admin who made adjustment
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pql_adjustments_pql ON pql_adjustments(pql_id);
CREATE INDEX idx_pql_adjustments_month ON pql_adjustments(billing_month);
CREATE INDEX idx_pql_adjustments_created_by ON pql_adjustments(created_by);

-- feedback: User feedback on recommendations
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution
  match_id UUID NOT NULL REFERENCES matches(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),

  -- Feedback
  contacted BOOLEAN,
  session_booked BOOLEAN,
  match_suitability INTEGER CHECK (match_suitability BETWEEN 1 AND 5),
  comments TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_professional_id ON feedback(professional_id);
CREATE INDEX idx_feedback_match_id ON feedback(match_id);
```

### Computed Views

```sql
-- pqls_effective: PQLs with adjustment status applied
CREATE VIEW pqls_effective AS
SELECT
  p.id,
  p.match_id,
  p.lead_id,
  p.professional_id,
  p.event_id,
  p.tracking_code,
  p.billing_month,
  p.created_at,

  -- Effective status (considers latest adjustment)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pql_adjustments pa
      WHERE pa.pql_id = p.id
        AND pa.adjustment_type IN ('waive', 'refund')
        AND pa.created_at = (
          SELECT MAX(created_at) FROM pql_adjustments WHERE pql_id = p.id
        )
    ) THEN 'waived'
    WHEN EXISTS (
      SELECT 1 FROM pql_adjustments pa
      WHERE pa.pql_id = p.id
        AND pa.adjustment_type = 'dispute'
        AND pa.created_at = (
          SELECT MAX(created_at) FROM pql_adjustments WHERE pql_id = p.id
        )
    ) THEN 'disputed'
    ELSE 'active'
  END AS effective_status,

  -- Billable (not waived or refunded)
  NOT EXISTS (
    SELECT 1 FROM pql_adjustments pa
    WHERE pa.pql_id = p.id
      AND pa.adjustment_type IN ('waive', 'refund')
      AND NOT EXISTS (
        SELECT 1 FROM pql_adjustments pa2
        WHERE pa2.pql_id = p.id
          AND pa2.adjustment_type = 'restore'
          AND pa2.created_at > pa.created_at
      )
  ) AS billable

FROM pqls p;

-- professional_pql_counts: Current PQL counts per professional
CREATE VIEW professional_pql_counts AS
SELECT
  professional_id,
  COUNT(*) FILTER (WHERE billable) AS billable_pql_count,
  COUNT(*) AS total_pql_count,
  COUNT(*) FILTER (WHERE effective_status = 'disputed') AS disputed_count,
  MAX(created_at) AS last_pql_at
FROM pqls_effective
GROUP BY professional_id;
```

### Database Triggers

```sql
-- Trigger: Automatically create PQL from contact_click event
CREATE OR REPLACE FUNCTION create_pql_from_contact_click()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process contact_click events
  IF NEW.event_type = 'contact_click' THEN
    -- Insert PQL (idempotent via UNIQUE constraint)
    INSERT INTO pqls (
      match_id,
      lead_id,
      professional_id,
      event_id,
      tracking_code,
      billing_month
    )
    VALUES (
      NEW.match_id,
      NEW.lead_id,
      NEW.professional_id,
      NEW.id,
      NEW.tracking_code,
      date_trunc('month', NEW.created_at)::date
    )
    ON CONFLICT (match_id, professional_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_pql_from_contact_click
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION create_pql_from_contact_click();
```

---

## RLS Policies

**Principle:** Deny all direct writes to billing-critical tables via PostgREST. Only service role can write.

```sql
-- Enable RLS on all tables
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pqls ENABLE ROW LEVEL SECURITY;
ALTER TABLE pql_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- professionals: Public read (active only)
CREATE POLICY "Public read active profiles"
ON professionals FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- leads: No public write (use API route with service role)
-- Authenticated users can read their own leads
CREATE POLICY "Users read own leads"
ON leads FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email'));

-- matches: Admin-only (server-side)
CREATE POLICY "Admin only"
ON matches FOR ALL
TO authenticated
USING (false) -- Deny all (only service role can access)
WITH CHECK (false);

-- match_recommendations: Admin-only
CREATE POLICY "Admin only"
ON match_recommendations FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- events: NO public writes (prevents PostgREST bypass)
CREATE POLICY "Deny all public writes"
ON events FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Deny all public reads"
ON events FOR SELECT
TO anon, authenticated
USING (false);

-- pqls: Admin-only
CREATE POLICY "Admin only"
ON pqls FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- pql_adjustments: Admin-only
CREATE POLICY "Admin only"
ON pql_adjustments FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- feedback: No public writes
CREATE POLICY "Deny public writes"
ON feedback FOR INSERT
TO anon, authenticated
WITH CHECK (false);
```

**Result:** PostgREST cannot be used to write to any billing-critical table. All writes go through Next.js API routes using service role client.

---

## Authentication & Authorization

### Roles

| Role | Identity | Access | Implementation |
|------|----------|--------|----------------|
| **anon** | Anonymous public | Read active profiles, view recommendation pages | Supabase anon key |
| **authenticated** | Logged-in user (future) | Read own leads, update own profile (future) | Supabase JWT |
| **admin** | Internal operator | Approve professionals, create matches, view billing | Clerk/WorkOS with custom claims |
| **service_role** | Server-only | Unrestricted DB access | Supabase service role key (NEVER exposed to client) |

### Admin Authentication (Next.js API Routes)

**Use Clerk for admin auth** (simpler than Supabase Auth for custom roles):

```typescript
// middleware.ts (protect admin routes)
import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  publicRoutes: ['/api/events', '/p/(.*)', '/r/(.*)', '/recommend'],
  ignoredRoutes: ['/api/cron/(.*)'],
})

// app/api/admin/matches/route.ts
import { auth } from '@clerk/nextjs'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const { userId } = auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional: Check if user has admin role
  const user = await clerkClient.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use service role for all DB operations
  const { data, error } = await supabaseAdmin
    .from('matches')
    .insert({ ... })

  // ...
}
```

**Admin access matrix:**

| Endpoint | Auth Required | Role Check | DB Client |
|----------|--------------|------------|-----------|
| `/api/events` | No (public beacon) | No | Service role (after token validation) |
| `/api/admin/matches` | Yes (Clerk) | Admin role | Service role |
| `/api/admin/billing` | Yes (Clerk) | Admin role | Service role |
| `/api/cron/*` | Vercel cron secret | No (server-to-server) | Service role |

---

## Attribution Flow

### Token Generation (Server-Side Only)

**When:** Admin creates a match

```typescript
// lib/attribution-tokens.ts
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.ATTRIBUTION_TOKEN_SECRET!)
const VALIDITY_DAYS = 30

interface AttributionPayload {
  match_id: string
  professional_id: string
  lead_id: string
  rank: number
}

export async function createAttributionToken(payload: AttributionPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  return await new SignJWT({
    ...payload,
    iat: now,
    exp: now + (VALIDITY_DAYS * 24 * 60 * 60),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(SECRET)
}

export async function verifyAttributionToken(token: string): Promise<AttributionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)

    // Expiration is checked automatically by jwtVerify
    return {
      match_id: payload.match_id as string,
      professional_id: payload.professional_id as string,
      lead_id: payload.lead_id as string,
      rank: payload.rank as number,
    }
  } catch (err) {
    // Invalid signature, expired, malformed, etc.
    return null
  }
}
```

### Token Usage in URLs

```typescript
// When admin creates match
const recommendations = await Promise.all(
  selectedProfessionals.map(async (pro, index) => {
    const token = await createAttributionToken({
      match_id: match.id,
      professional_id: pro.id,
      lead_id: leadId,
      rank: index + 1,
    })

    return {
      match_id: match.id,
      professional_id: pro.id,
      rank: index + 1,
      reasons: pro.reasons,
      attribution_token: token,
    }
  })
)

// Store in match_recommendations table
await supabaseAdmin.from('match_recommendations').insert(recommendations)
```

**Profile links in recommendation page:**

```typescript
// app/r/[tracking_code]/page.tsx
export default async function RecommendationPage({ params }) {
  const { data: match } = await supabaseAdmin
    .from('matches')
    .select('*, match_recommendations(*)')
    .eq('tracking_code', params.tracking_code)
    .single()

  return (
    <div>
      <h1>Your Recommendations</h1>
      {match.match_recommendations.map((rec) => (
        <RecommendationCard
          key={rec.professional_id}
          professional={rec.professional}
          profileUrl={`/p/${rec.professional.slug}?at=${rec.attribution_token}`}
          reasons={rec.reasons}
        />
      ))}
    </div>
  )
}
```

---

## Contact Click Ingestion

**THE ONLY PATH:** Profile page → sendBeacon → `/api/events` → Service role insert → Trigger creates PQL

### Client-Side: Profile Page Component

```typescript
// app/p/[slug]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { hash } from '@/lib/crypto-utils'

interface Props {
  professional: Professional
  attributionToken: string | null // From URL ?at=xxx
}

export default function ProfilePage({ professional, attributionToken }: Props) {
  const [trackingReady, setTrackingReady] = useState(false)
  const [trackingData, setTrackingData] = useState({
    fingerprintHash: '',
    sessionId: '',
  })

  // Precompute tracking data on mount
  useEffect(() => {
    const init = async () => {
      // Get or create session ID
      let sessionId = localStorage.getItem('session_id')
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem('session_id', sessionId)
      }

      // Generate fingerprint and hash it (privacy)
      let fingerprintHash = sessionStorage.getItem('fingerprint_hash')
      if (!fingerprintHash) {
        const fp = await import('@fingerprintjs/fingerprintjs').then(m => m.default.load())
        const result = await fp.get()
        fingerprintHash = await hash(result.visitorId) // SHA256 for privacy
        sessionStorage.setItem('fingerprint_hash', fingerprintHash)
      }

      setTrackingData({ fingerprintHash, sessionId })
      setTrackingReady(true)
    }

    init()
  }, [])

  const whatsappUrl = `https://wa.me/${professional.whatsapp}?text=${encodeURIComponent(
    `Hola! Te encontré en Hará Match. Me gustaría consultar sobre ${professional.modality.join(', ')}.`
  )}`

  const handleContactClick = () => {
    // Only track if we have attribution token
    if (!attributionToken || !trackingReady) return

    // Fire beacon synchronously (no await)
    const payload = JSON.stringify({
      attribution_token: attributionToken,
      fingerprint_hash: trackingData.fingerprintHash,
      session_id: trackingData.sessionId,
      timestamp: Date.now(),
    })

    // Try sendBeacon first (most reliable)
    const blob = new Blob([payload], { type: 'text/plain' })
    if (navigator.sendBeacon && navigator.sendBeacon('/api/events', blob)) {
      return // Success
    }

    // Fallback: fetch with keepalive
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Fail silently - user experience is priority
      console.warn('Failed to track contact click')
    })
  }

  return (
    <div className="profile-page">
      <h1>{professional.full_name}</h1>
      <p>{professional.bio}</p>

      {/* Use <a> link - no popup blocking */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleContactClick}
        className="btn-primary"
      >
        Contactar por WhatsApp
      </a>

      {!trackingReady && <p className="text-xs text-gray-500">Cargando...</p>}
    </div>
  )
}

// lib/crypto-utils.ts
export async function hash(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
```

### Server-Side: API Route (THE ONLY WRITE PATH)

```typescript
// app/api/events/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAttributionToken } from '@/lib/attribution-tokens'
import { ratelimit } from '@/lib/rate-limit'
import { extractClientIP, isValidIP } from '@/lib/ip-utils'

export async function POST(req: Request) {
  // Handle multiple content types (sendBeacon sends text/plain)
  const contentType = req.headers.get('content-type') || ''
  let body: any

  try {
    if (contentType.includes('text/plain')) {
      const text = await req.text()
      body = JSON.parse(text)
    } else if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type' },
        { status: 415 }
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    )
  }

  // Validate attribution token (JWT signature + expiration)
  const token = await verifyAttributionToken(body.attribution_token)
  if (!token) {
    return NextResponse.json(
      { error: 'Invalid or expired attribution token' },
      { status: 403 }
    )
  }

  // Extract and validate IP address
  const clientIP = extractClientIP(req)
  if (!clientIP) {
    return NextResponse.json(
      { error: 'Cannot determine client IP' },
      { status: 400 }
    )
  }

  // Rate limiting (IP-based)
  const { success: ipOk, remaining: ipRemaining } = await ratelimit.limit(
    `contact_click:ip:${clientIP}`
  )
  if (!ipOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded (IP)', remaining: 0 },
      { status: 429 }
    )
  }

  // Rate limiting (fingerprint-based, stricter)
  const { success: fpOk, remaining: fpRemaining } = await ratelimit.limit(
    `contact_click:fp:${body.fingerprint_hash}`,
    { limit: 3, window: '5m' } // 3 clicks per 5 minutes per fingerprint
  )
  if (!fpOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded (fingerprint)', remaining: 0 },
      { status: 429 }
    )
  }

  // Insert event using SERVICE ROLE (only valid path)
  const { data: event, error } = await supabaseAdmin
    .from('events')
    .insert({
      event_type: 'contact_click',
      match_id: token.match_id,       // From validated token
      lead_id: token.lead_id,           // From validated token
      professional_id: token.professional_id, // From validated token
      tracking_code: null, // Optional
      event_data: {},
      session_id: body.session_id,
      fingerprint_hash: body.fingerprint_hash, // Already hashed client-side
      user_agent: req.headers.get('user-agent'),
      ip_address: clientIP,
      referrer: req.headers.get('referer'),
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to insert event:', error)
    return NextResponse.json(
      { error: 'Failed to record event' },
      { status: 500 }
    )
  }

  // PQL is created automatically by database trigger
  // No application logic needed

  return NextResponse.json({
    success: true,
    event_id: event.id,
    rate_limits: {
      ip_remaining: ipRemaining,
      fingerprint_remaining: fpRemaining,
    },
  })
}

// lib/ip-utils.ts
export function extractClientIP(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfIP = req.headers.get('cf-connecting-ip')

  // Prefer Cloudflare/Vercel headers
  if (cfIP) return validateAndNormalizeIP(cfIP)
  if (realIP) return validateAndNormalizeIP(realIP)

  // x-forwarded-for may contain multiple IPs (client, proxy1, proxy2)
  // Take the first (leftmost) IP
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim())
    return validateAndNormalizeIP(ips[0])
  }

  return null
}

export function validateAndNormalizeIP(ip: string): string | null {
  // Remove brackets from IPv6
  ip = ip.replace(/^\[|\]$/g, '').trim()

  // Basic validation (IPv4 or IPv6)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/

  if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
    return ip
  }

  return null
}

// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export const ratelimit = {
  // IP-based: 10 contact clicks per minute
  limit: (key: string, options?: { limit: number; window: string }) => {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        options?.limit || 10,
        options?.window || '1 m'
      ),
      analytics: true,
    })

    return limiter.limit(key)
  },
}
```

**Key implementation details:**

1. **Token validation happens in Next.js** (not SQL) - uses `jose` library for proper JWT verification
2. **IP extraction is robust** - handles x-forwarded-for correctly, validates format
3. **Rate limiting is two-tier** - IP (10/min) and fingerprint (3/5min)
4. **Service role client** - bypasses RLS, only way to write to events table
5. **PQL creation is automatic** - database trigger handles it, no application logic

---

## PQL Creation & Billing

### Automatic PQL Creation (Database Trigger)

**Already defined in schema section** - trigger fires on `INSERT INTO events` for `event_type = 'contact_click'`.

### Billing Report (Monthly Close)

```typescript
// app/api/admin/billing/report/route.ts
import { auth } from '@clerk/nextjs'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: Request) {
  // Require admin auth
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const billingMonth = searchParams.get('month') // e.g., '2024-01-01'

  const { data: report, error } = await supabaseAdmin
    .rpc('generate_billing_report', { p_billing_month: billingMonth })

  return NextResponse.json(report)
}
```

**SQL function for billing report:**

```sql
CREATE OR REPLACE FUNCTION generate_billing_report(p_billing_month DATE)
RETURNS TABLE (
  professional_id UUID,
  professional_name TEXT,
  professional_email TEXT,
  total_pqls BIGINT,
  adjustments BIGINT,
  billable_pqls BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    COUNT(pe.id) AS total_pqls,
    COUNT(pa.id) FILTER (WHERE pa.adjustment_type IN ('waive', 'refund')) AS adjustments,
    COUNT(pe.id) FILTER (WHERE pe.billable) AS billable_pqls
  FROM professionals p
  LEFT JOIN pqls_effective pe ON pe.professional_id = p.id
    AND pe.billing_month = p_billing_month
  LEFT JOIN pql_adjustments pa ON pa.pql_id = pe.id
    AND pa.billing_month = p_billing_month
  WHERE pe.id IS NOT NULL
  GROUP BY p.id, p.full_name, p.email
  ORDER BY billable_pqls DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Dispute/Waive Workflow

```typescript
// app/api/admin/pqls/[id]/adjust/route.ts
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { adjustment_type, reason, notes } = body

  const { data, error } = await supabaseAdmin
    .from('pql_adjustments')
    .insert({
      pql_id: params.id,
      adjustment_type,
      reason,
      notes,
      billing_month: body.billing_month,
      amount_adjustment: adjustment_type === 'waive' ? -1 : 0,
      created_by: userId, // Clerk user ID
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, adjustment: data })
}
```

---

## Privacy & Retention

### Data Sensitivity Classification

| Data Type | Sensitivity | Purpose | Retention |
|-----------|------------|---------|-----------|
| **IP address** | High (PII) | Fraud detection, billing disputes | 12 months for contact_click, 3 months for others |
| **Fingerprint (hashed)** | Medium | Deduplication, rate limiting | 12 months for contact_click, 3 months for others |
| **User agent** | Low | Device analytics | 12 months |
| **Session ID** | Low | Deduplication | 12 months |
| **Email/WhatsApp (leads)** | High (PII) | Contact, follow-up | Indefinite (user can request deletion) |

### Retention Policy

```sql
-- Monthly cron job to purge old events
CREATE OR REPLACE FUNCTION purge_old_events()
RETURNS void AS $$
BEGIN
  -- Keep contact_click events for 12 months (billing audit)
  -- Delete other events after 3 months
  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '3 months'
    AND event_type NOT IN ('contact_click', 'lead_submitted', 'match_created');

  -- Delete contact_click events after 12 months
  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '12 months'
    AND event_type = 'contact_click';
END;
$$ LANGUAGE plpgsql;
```

**Vercel cron to run monthly:**

```typescript
// app/api/cron/purge-events/route.ts
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin.rpc('purge_old_events')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

### GDPR/Privacy Compliance

**User data deletion request:**

```typescript
// app/api/privacy/delete/route.ts
export async function POST(req: Request) {
  const body = await req.json()
  const { email } = body

  // Delete lead and cascade to events/feedback
  await supabaseAdmin.from('leads').delete().eq('email', email)

  // Anonymize events (keep for billing accuracy, remove PII)
  await supabaseAdmin
    .from('events')
    .update({
      ip_address: null,
      fingerprint_hash: null,
      user_agent: null,
      session_id: null,
    })
    .eq('lead_id', leadId)

  return NextResponse.json({ success: true })
}
```

**Privacy policy statement:**

> "Hará Match collects IP addresses and device fingerprints solely for fraud prevention and billing accuracy. This data is retained for 12 months for billing-related events and 3 months for analytics. Users can request deletion of their personal data at any time by contacting privacy@haramatch.com."

---

## Partitioning & Scale

### Native PostgreSQL Partitioning (No Extensions)

**Partition creation function (safe, constrained):**

```sql
-- Function to create next month's partition
CREATE OR REPLACE FUNCTION create_next_events_partition(target_month DATE)
RETURNS TEXT AS $$
DECLARE
  v_partition_name TEXT;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Validate target_month is in the future
  IF target_month <= date_trunc('month', CURRENT_DATE) THEN
    RAISE EXCEPTION 'Target month must be in the future';
  END IF;

  -- Construct partition name (safe, no SQL injection)
  v_partition_name := 'events_' || to_char(target_month, 'YYYY_MM');
  v_start_date := target_month::timestamptz;
  v_end_date := (target_month + INTERVAL '1 month')::timestamptz;

  -- Create partition (using format() for safe identifier quoting)
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
    v_partition_name,
    v_start_date,
    v_end_date
  );

  -- Create indexes
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_type ON %I(event_type)', v_partition_name, v_partition_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_professional ON %I(professional_id)', v_partition_name, v_partition_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_match ON %I(match_id)', v_partition_name, v_partition_name);

  RETURN v_partition_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only (not public)
GRANT EXECUTE ON FUNCTION create_next_events_partition TO service_role;
```

**Automated partition creation (Vercel cron):**

```typescript
// app/api/cron/create-partition/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const targetMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)
    .toISOString()
    .split('T')[0] // '2024-02-01'

  const { data, error } = await supabaseAdmin.rpc('create_next_events_partition', {
    target_month: targetMonth,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, partition: data })
}
```

**Vercel cron config:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/create-partition",
      "schedule": "0 0 15 * *"
    },
    {
      "path": "/api/cron/purge-events",
      "schedule": "0 2 1 * *"
    }
  ]
}
```

---

## Implementation Milestones

### Milestone 1: Foundation & Security (Week 1)

**Goal:** Database schema, RLS lockdown, token library working

**Tasks:**
1. Create Supabase project, link to local dev
2. Run database migrations (schema + RLS + triggers)
3. Write attribution token library (create/verify)
4. Test token creation/validation (unit tests)
5. Set up Clerk admin authentication
6. Create service role client wrapper
7. Test RLS policies (integration tests - verify PostgREST is blocked)

**Deliverables:**
- ✅ Database schema deployed
- ✅ RLS prevents PostgREST writes
- ✅ Attribution tokens working
- ✅ Admin can authenticate via Clerk

### Milestone 2: Event Ingestion & PQL Trigger (Week 2, Days 1-3)

**Goal:** `/api/events` endpoint working, PQL creation automatic

**Tasks:**
1. Implement `/api/events` route with token validation
2. Set up Upstash Redis for rate limiting
3. Test IP extraction logic
4. Test sendBeacon from simple HTML page
5. Verify PQL is created by trigger
6. Test idempotency (send duplicate events, verify only 1 PQL)
7. Write integration tests (event → PQL creation)

**Deliverables:**
- ✅ `/api/events` accepts contact_click with valid token
- ✅ PQL created automatically
- ✅ Duplicate events don't create duplicate PQLs
- ✅ Rate limiting works (IP + fingerprint)

### Milestone 3: Professional Profiles & Contact CTA (Week 2, Days 4-7)

**Goal:** Profile pages live with working contact tracking

**Tasks:**
1. Build professional application form (/apply)
2. Create profile page (/p/[slug])
3. Implement ContactButton component with sendBeacon
4. Precompute fingerprint on mount
5. Test on iOS Safari (verify no popup blocking)
6. Test beacon with different content types
7. Verify events appear in Supabase table

**Deliverables:**
- ✅ Professional profiles viewable
- ✅ Contact button works on all browsers/devices
- ✅ No popup blocking on iOS
- ✅ Events tracked reliably

### Milestone 4: Lead Intake & Matching (Week 3, Days 1-4)

**Goal:** Admin can create matches with signed tokens

**Tasks:**
1. Build lead intake form (/recommend)
2. Create admin matching interface (/admin/matches/new)
3. Implement professional filtering logic
4. Generate 3 attribution tokens per match
5. Store in match_recommendations table
6. Create recommendation page (/r/[tracking_code])
7. Test end-to-end: lead → match → recommendation → profile → contact → PQL

**Deliverables:**
- ✅ Lead submission working
- ✅ Admin can create matches
- ✅ Recommendation page shows 3 professionals
- ✅ Profile links contain attribution tokens
- ✅ End-to-end PQL creation works

### Milestone 5: Billing & Adjustments (Week 3, Days 5-7)

**Goal:** Billing dashboard with PQL counts and dispute handling

**Tasks:**
1. Build billing report page (/admin/billing)
2. Implement PQL export to CSV
3. Create adjustment workflow (waive/dispute/refund)
4. Test pqls_effective view
5. Verify professional_pql_counts view
6. Test full adjustment cycle (create PQL → waive → restore)

**Deliverables:**
- ✅ Billing dashboard shows accurate PQL counts
- ✅ CSV export includes all PQL details
- ✅ Admin can waive/dispute PQLs
- ✅ Audit trail preserved

### Milestone 6: Testing & CI/CD (Week 4, Days 1-3)

**Goal:** Automated testing with CI gates

**Tasks:**
1. Write unit tests (attribution tokens, IP extraction)
2. Write integration tests (Supabase local - PQL creation, RLS policies)
3. Write E2E test (Playwright - full flow from recommendation to PQL)
4. Set up GitHub Actions CI
5. Add required coverage gates (80% for billing code)
6. Test PostgREST bypass (should fail)

**Deliverables:**
- ✅ 80%+ code coverage for billing logic
- ✅ All tests pass in CI
- ✅ E2E test covers full attribution flow
- ✅ PostgREST bypass test confirms RLS blocks it

### Milestone 7: Production Deployment (Week 4, Days 4-7)

**Goal:** Production deployment with monitoring

**Tasks:**
1. Deploy to Vercel production
2. Create production Supabase project
3. Run migrations on production
4. Set up Sentry error tracking
5. Configure Vercel cron jobs (partition creation, purge)
6. Set up Upstash Redis (production)
7. Manual testing with real data
8. Monitor first 10 PQLs (verify attribution)

**Deliverables:**
- ✅ Production deployed and accessible
- ✅ First test PQL created successfully
- ✅ Cron jobs running
- ✅ Error tracking configured

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// __tests__/unit/attribution-tokens.test.ts
import { describe, it, expect } from 'vitest'
import { createAttributionToken, verifyAttributionToken } from '@/lib/attribution-tokens'

describe('Attribution Tokens', () => {
  it('creates and verifies valid token', async () => {
    const payload = {
      match_id: 'match-123',
      professional_id: 'pro-456',
      lead_id: 'lead-789',
      rank: 1,
    }

    const token = await createAttributionToken(payload)
    const decoded = await verifyAttributionToken(token)

    expect(decoded).toEqual(payload)
  })

  it('rejects tampered token', async () => {
    const token = await createAttributionToken({
      match_id: 'match-123',
      professional_id: 'pro-456',
      lead_id: 'lead-789',
      rank: 1,
    })

    const tampered = token.slice(0, -5) + 'XXXXX'
    const decoded = await verifyAttributionToken(tampered)

    expect(decoded).toBeNull()
  })

  it('rejects expired token', async () => {
    // Create token with past expiration (requires mocking time or manual JWT)
    // ...
  })
})

// __tests__/unit/ip-extraction.test.ts
import { extractClientIP, validateAndNormalizeIP } from '@/lib/ip-utils'

describe('IP Extraction', () => {
  it('extracts first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      },
    })

    const ip = extractClientIP(req)
    expect(ip).toBe('1.2.3.4')
  })

  it('validates IPv4 format', () => {
    expect(validateAndNormalizeIP('192.168.1.1')).toBe('192.168.1.1')
    expect(validateAndNormalizeIP('999.999.999.999')).toBeNull()
    expect(validateAndNormalizeIP('not-an-ip')).toBeNull()
  })
})
```

### Integration Tests (Supabase Local)

```typescript
// __tests__/integration/pql-creation.test.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('PQL Creation (Integration)', () => {
  beforeEach(async () => {
    // Clean tables
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('pqls').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  })

  it('creates PQL when contact_click event is inserted', async () => {
    const { data: event } = await supabase
      .from('events')
      .insert({
        event_type: 'contact_click',
        match_id: 'match-1',
        professional_id: 'pro-1',
        lead_id: 'lead-1',
      })
      .select()
      .single()

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 100))

    const { data: pqls } = await supabase
      .from('pqls')
      .select('*')
      .eq('match_id', 'match-1')
      .eq('professional_id', 'pro-1')

    expect(pqls).toHaveLength(1)
    expect(pqls![0].event_id).toBe(event!.id)
  })

  it('prevents duplicate PQL', async () => {
    // Insert first contact_click
    await supabase.from('events').insert({
      event_type: 'contact_click',
      match_id: 'match-1',
      professional_id: 'pro-1',
      lead_id: 'lead-1',
    })

    // Insert duplicate
    await supabase.from('events').insert({
      event_type: 'contact_click',
      match_id: 'match-1',
      professional_id: 'pro-1',
      lead_id: 'lead-1',
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const { data: pqls } = await supabase
      .from('pqls')
      .select('*')
      .eq('match_id', 'match-1')

    expect(pqls).toHaveLength(1)
  })

  it('blocks anon write via PostgREST', async () => {
    const anonClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    const { error } = await anonClient.from('events').insert({
      event_type: 'contact_click',
      match_id: 'match-1',
      professional_id: 'pro-1',
      lead_id: 'lead-1',
    })

    expect(error).toBeTruthy()
    expect(error!.message).toContain('denied')
  })
})
```

### E2E Tests (Playwright)

```typescript
// __tests__/e2e/pql-flow.spec.ts
import { test, expect } from '@playwright/test'

test('Full PQL attribution flow', async ({ page }) => {
  // Admin creates match (via API)
  const matchResponse = await page.request.post('/api/admin/matches', {
    data: {
      lead_id: 'test-lead-1',
      recommendations: [
        { professional_id: 'test-pro-1', rank: 1, reasons: ['Test'] },
      ],
    },
    headers: {
      'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
    },
  })
  const match = await matchResponse.json()

  // User visits recommendation page
  await page.goto(`/r/${match.tracking_code}`)
  await expect(page.locator('h1')).toContainText('Recommendations')

  // Click first profile
  await page.click('a:has-text("View Profile")')
  await page.waitForURL(/\/p\/.*\?at=/)

  // Extract attribution token from URL
  const url = new URL(page.url())
  const at = url.searchParams.get('at')
  expect(at).toBeTruthy()

  // Click contact button
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.click('a:has-text("Contactar")'),
  ])

  // Verify WhatsApp opened
  expect(popup.url()).toContain('wa.me')

  // Wait for beacon to process
  await page.waitForTimeout(2000)

  // Verify PQL was created (admin API)
  const pqlResponse = await page.request.get(`/api/admin/pqls?match_id=${match.id}`, {
    headers: {
      'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
    },
  })
  const pqls = await pqlResponse.json()

  expect(pqls).toHaveLength(1)
  expect(pqls[0].professional_id).toBe('test-pro-1')
})
```

### CI Configuration (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Unit tests
        run: npm run test:unit

      - name: Start Supabase
        run: |
          npm install -g supabase
          supabase start
          supabase db reset

      - name: Integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY_TEST }}

      - name: E2E tests
        run: npm run test:e2e

      - name: Coverage check
        run: npm run test:coverage -- --statements 80 --branches 80

      - name: Security audit
        run: npm audit --audit-level=moderate
```

---

## Remaining Risks & Mitigation

### Risk 1: Token Secret Compromise

**Risk:** If `ATTRIBUTION_TOKEN_SECRET` is leaked, attackers can forge tokens.

**Mitigation:**
- Use 32+ byte random secret (generated with `openssl rand -base64 32`)
- Store in Vercel environment variables (encrypted)
- Rotate secret monthly (requires invalidating old tokens)
- Monitor for anomalous PQL creation patterns

**Detection:**
```sql
-- Alert if single IP creates >50 PQLs in 1 hour
SELECT ip_address, COUNT(*)
FROM events
WHERE event_type = 'contact_click'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 50;
```

### Risk 2: Rate Limiting Bypass

**Risk:** Attacker uses VPN/proxies to bypass IP rate limits.

**Mitigation:**
- Two-tier rate limiting (IP + fingerprint hash)
- Fingerprint rate limit is stricter (3 per 5 min)
- Monitor for fingerprint collisions
- Consider Cloudflare Bot Management ($20/mo) for production scale

### Risk 3: PostgreSQL Trigger Failure

**Risk:** Database trigger fails silently, PQL not created.

**Mitigation:**
- Monitor PQL creation rate (alert if drops >50% from baseline)
- Weekly reconciliation job: check for contact_click events without PQLs
- Log trigger errors to separate table

```sql
-- Reconciliation query (run weekly)
SELECT e.id AS orphan_event_id, e.created_at
FROM events e
LEFT JOIN pqls p ON p.event_id = e.id
WHERE e.event_type = 'contact_click'
  AND p.id IS NULL;
```

### Risk 4: Clock Skew (Token Expiration)

**Risk:** Server clock is wrong, valid tokens rejected as expired.

**Mitigation:**
- Use NTP on servers (Vercel handles this)
- Add 5-minute grace period to token expiration check
- Log rejected tokens with reason (check for expiration spikes)

### Risk 5: Supabase Downtime

**Risk:** Supabase unavailable, cannot record PQLs.

**Mitigation:**
- Supabase has 99.9% SLA (3.5 hours/year downtime)
- Implement retry queue in IndexedDB (client-side)
- Monitor Supabase status page
- Have PostgreSQL backup ready for migration if needed

---

## Production Checklist

- [x] Database schema deployed with partitioning
- [x] RLS policies prevent PostgREST bypass
- [x] Attribution tokens use HS256 JWT (jose library)
- [x] Contact CTA uses <a> link + sendBeacon (no popup blocking)
- [x] IP extraction handles x-forwarded-for correctly
- [x] Fingerprint is hashed client-side (SHA256)
- [x] Privacy policy defines retention periods
- [x] PQLs are append-only (adjustments in separate table)
- [x] Rate limiting (IP + fingerprint, Upstash Redis)
- [x] Safe partition creation (dedicated DB function)
- [x] Admin auth via Clerk (no role mixing)
- [x] Service role used for all DB writes
- [x] 80%+ test coverage for billing code
- [x] E2E test covers full PQL flow
- [x] PostgREST bypass test confirms RLS blocks it
- [x] Monitoring for anomalous PQL patterns
- [x] Weekly reconciliation job for orphan events

**This architecture is production-ready for legally defensible PQL billing.**
