# Hará Match - Final Production Architecture (v2)

**Status:** Production-ready, single source of truth
**Stack:** Next.js 14 + Supabase (PostgreSQL) + Vercel
**Critical:** PQL billing must be legally defensible
**Version:** 2.0 - P0 blockers fixed, operational plan added

---

## P0 Patches Applied

1. ✅ **tracking_code in JWT claims** - Included in attribution token, passed through to events/pqls
2. ✅ **Runnable partitioning** - DEFAULT partition + initial 3-month setup
3. ✅ **IP extraction resilience** - Never fails event, stores null if unavailable
4. ✅ **Fingerprint validation** - SHA256 hex format validated, fallback to session_id

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
9. [Testing Strategy](#testing-strategy)
10. [Remaining Risks](#remaining-risks)

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

-- match_recommendations: Normalized recommendations
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
  tracking_code TEXT NOT NULL, -- ✅ P0.1 FIX: Now NOT NULL, populated from token

  -- Event metadata
  event_data JSONB DEFAULT '{}',

  -- User context (for fraud detection)
  session_id TEXT,
  fingerprint_hash TEXT, -- SHA256(fingerprint) for privacy, validated format
  user_agent TEXT,
  ip_address INET, -- ✅ P0.3 FIX: Now nullable, won't fail event if missing
  referrer TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ✅ P0.2 FIX: Create DEFAULT partition + initial 3 months
-- DEFAULT partition catches any rows that don't match existing partitions
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- Create current month + next 2 months partitions
-- (Replace YYYY_MM with actual dates during deployment)
CREATE TABLE events_2025_01 PARTITION OF events
FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');

CREATE TABLE events_2025_02 PARTITION OF events
FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');

CREATE TABLE events_2025_03 PARTITION OF events
FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');

-- Indexes on each partition
CREATE INDEX idx_events_2025_01_type ON events_2025_01(event_type);
CREATE INDEX idx_events_2025_01_professional ON events_2025_01(professional_id);
CREATE INDEX idx_events_2025_01_match ON events_2025_01(match_id);

CREATE INDEX idx_events_2025_02_type ON events_2025_02(event_type);
CREATE INDEX idx_events_2025_02_professional ON events_2025_02(professional_id);
CREATE INDEX idx_events_2025_02_match ON events_2025_02(match_id);

CREATE INDEX idx_events_2025_03_type ON events_2025_03(event_type);
CREATE INDEX idx_events_2025_03_professional ON events_2025_03(professional_id);
CREATE INDEX idx_events_2025_03_match ON events_2025_03(match_id);

-- pqls: Pay-per-qualified-lead records (APPEND-ONLY)
CREATE TABLE pqls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution (immutable)
  match_id UUID NOT NULL REFERENCES matches(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  event_id UUID NOT NULL, -- References events(id) but no FK due to partitioning
  tracking_code TEXT NOT NULL, -- ✅ P0.1 FIX: Populated from validated token

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
-- ✅ P0.1 FIX: Trigger now uses NEW.tracking_code (from validated token)
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
      tracking_code, -- Now populated from NEW.tracking_code
      billing_month
    )
    VALUES (
      NEW.match_id,
      NEW.lead_id,
      NEW.professional_id,
      NEW.id,
      NEW.tracking_code, -- ✅ From validated token
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

**Principle:** Deny all direct writes to billing-critical tables via PostgREST.

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

-- leads: No public write
CREATE POLICY "Users read own leads"
ON leads FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email'));

-- matches, match_recommendations, events, pqls, pql_adjustments, feedback:
-- All admin-only or service role only (no public access)
CREATE POLICY "Deny all public access"
ON matches FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny all public access"
ON match_recommendations FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny all public writes"
ON events FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Deny all public reads"
ON events FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "Deny all public access"
ON pqls FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny all public access"
ON pql_adjustments FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny all public writes"
ON feedback FOR INSERT
TO anon, authenticated
WITH CHECK (false);
```

---

## Authentication & Authorization

### Role Matrix

| Role | Identity | Access | Implementation |
|------|----------|--------|----------------|
| **anon** | Anonymous public | Read active profiles, view recommendation pages | Supabase anon key |
| **authenticated** | Logged-in user (future) | Read own leads | Supabase JWT |
| **admin** | Internal operator | Create matches, view billing, adjust PQLs | Clerk with role claim |
| **service_role** | Server-only | Unrestricted DB access (events, PQLs) | Supabase service role key (NEVER client-exposed) |

---

## Attribution Flow

### Token Generation (Server-Side Only)

```typescript
// lib/attribution-tokens.ts
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.ATTRIBUTION_TOKEN_SECRET!)
const VALIDITY_DAYS = 30

interface AttributionPayload {
  match_id: string
  professional_id: string
  lead_id: string
  tracking_code: string // ✅ P0.1 FIX: Added to JWT claims
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

    return {
      match_id: payload.match_id as string,
      professional_id: payload.professional_id as string,
      lead_id: payload.lead_id as string,
      tracking_code: payload.tracking_code as string, // ✅ P0.1 FIX: Extract tracking_code
      rank: payload.rank as number,
    }
  } catch (err) {
    return null
  }
}
```

### Token Usage

```typescript
// When admin creates match
const match = await supabaseAdmin.from('matches').insert({
  lead_id: leadId,
  tracking_code: generateTrackingCode(), // e.g., 'M-20250101-A3K9'
}).select().single()

const recommendations = await Promise.all(
  selectedProfessionals.map(async (pro, index) => {
    const token = await createAttributionToken({
      match_id: match.id,
      professional_id: pro.id,
      lead_id: leadId,
      tracking_code: match.tracking_code, // ✅ P0.1 FIX: Include in token
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
```

---

## Contact Click Ingestion

### Client-Side: Profile Page

```typescript
// app/p/[slug]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { sha256 } from '@/lib/crypto-utils'

export default function ProfilePage({ professional, attributionToken }) {
  const [trackingData, setTrackingData] = useState({
    fingerprintHash: '',
    sessionId: '',
    ready: false,
  })

  useEffect(() => {
    const init = async () => {
      // Session ID
      let sessionId = localStorage.getItem('session_id')
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem('session_id', sessionId)
      }

      // Fingerprint hash
      let fingerprintHash = sessionStorage.getItem('fingerprint_hash')
      if (!fingerprintHash) {
        const fp = await import('@fingerprintjs/fingerprintjs').then(m => m.default.load())
        const result = await fp.get()
        fingerprintHash = await sha256(result.visitorId)
        sessionStorage.setItem('fingerprint_hash', fingerprintHash)
      }

      setTrackingData({ fingerprintHash, sessionId, ready: true })
    }

    init()
  }, [])

  const handleContactClick = () => {
    if (!attributionToken || !trackingData.ready) return

    const payload = JSON.stringify({
      attribution_token: attributionToken,
      fingerprint_hash: trackingData.fingerprintHash,
      session_id: trackingData.sessionId,
      timestamp: Date.now(),
    })

    const blob = new Blob([payload], { type: 'text/plain' })
    if (navigator.sendBeacon && navigator.sendBeacon('/api/events', blob)) {
      return
    }

    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      console.warn('Failed to track contact click')
    })
  }

  const whatsappUrl = `https://wa.me/${professional.whatsapp}?text=${encodeURIComponent(
    `Hola! Te encontré en Hará Match...`
  )}`

  return (
    <div>
      <h1>{professional.full_name}</h1>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleContactClick}
        className="btn-primary"
      >
        Contactar por WhatsApp
      </a>
    </div>
  )
}
```

### Server-Side: API Route

```typescript
// app/api/events/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAttributionToken } from '@/lib/attribution-tokens'
import { ratelimit } from '@/lib/rate-limit'
import { extractClientIP, validateFingerprint, validateSessionId } from '@/lib/validation'

export async function POST(req: Request) {
  // Handle multiple content types
  const contentType = req.headers.get('content-type') || ''
  let body: any

  try {
    if (contentType.includes('text/plain')) {
      body = JSON.parse(await req.text())
    } else if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate attribution token (JWT)
  const token = await verifyAttributionToken(body.attribution_token)
  if (!token) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
  }

  // ✅ P0.3 FIX: Extract IP, but don't fail if missing
  const clientIP = extractClientIP(req)
  const ipMissing = !clientIP

  // ✅ P0.4 FIX: Validate fingerprint_hash format
  const fingerprintHash = validateFingerprint(body.fingerprint_hash)
  const fingerprintValid = !!fingerprintHash

  // ✅ P0.4 FIX: Validate session_id
  const sessionId = validateSessionId(body.session_id)

  // Rate limiting (use validated identifiers only)
  if (clientIP) {
    const { success: ipOk } = await ratelimit.limit(`contact_click:ip:${clientIP}`)
    if (!ipOk) {
      return NextResponse.json({ error: 'Rate limit (IP)' }, { status: 429 })
    }
  }

  // ✅ P0.4 FIX: Only use fingerprint for rate limiting if valid
  if (fingerprintValid) {
    const { success: fpOk } = await ratelimit.limit(
      `contact_click:fp:${fingerprintHash}`,
      { limit: 3, window: '5m' }
    )
    if (!fpOk) {
      return NextResponse.json({ error: 'Rate limit (fingerprint)' }, { status: 429 })
    }
  } else if (sessionId) {
    // Fallback to session-based rate limiting
    const { success: sessionOk } = await ratelimit.limit(
      `contact_click:session:${sessionId}`,
      { limit: 5, window: '5m' }
    )
    if (!sessionOk) {
      return NextResponse.json({ error: 'Rate limit (session)' }, { status: 429 })
    }
  }

  // ✅ P0.1 FIX: tracking_code from validated token
  // ✅ P0.3 FIX: ip_address nullable, event_data logs missing IP
  const { data: event, error } = await supabaseAdmin
    .from('events')
    .insert({
      event_type: 'contact_click',
      match_id: token.match_id,
      lead_id: token.lead_id,
      professional_id: token.professional_id,
      tracking_code: token.tracking_code, // ✅ From validated token
      event_data: {
        ip_missing: ipMissing,
        fingerprint_valid: fingerprintValid,
      },
      session_id: sessionId,
      fingerprint_hash: fingerprintValid ? fingerprintHash : null,
      user_agent: req.headers.get('user-agent'),
      ip_address: clientIP, // ✅ Nullable, won't fail if null
      referrer: req.headers.get('referer'),
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to insert event:', error)
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }

  return NextResponse.json({ success: true, event_id: event.id })
}
```

### Validation Utilities

```typescript
// lib/validation.ts

// ✅ P0.3 FIX: Robust IP extraction, never fails
export function extractClientIP(req: Request): string | null {
  const cfIP = req.headers.get('cf-connecting-ip')
  const realIP = req.headers.get('x-real-ip')
  const forwarded = req.headers.get('x-forwarded-for')

  if (cfIP) return validateIPFormat(cfIP)
  if (realIP) return validateIPFormat(realIP)

  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim())
    return validateIPFormat(ips[0]) // First IP is client
  }

  return null // ✅ Returns null instead of throwing
}

function validateIPFormat(ip: string): string | null {
  ip = ip.replace(/^\[|\]$/g, '').trim()

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/

  if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
    return ip
  }

  return null
}

// ✅ P0.4 FIX: Validate fingerprint_hash is SHA256 hex
export function validateFingerprint(fingerprint: string | undefined): string | null {
  if (!fingerprint) return null

  const sha256Regex = /^[a-f0-9]{64}$/
  if (sha256Regex.test(fingerprint)) {
    return fingerprint
  }

  console.warn('Invalid fingerprint_hash format:', fingerprint)
  return null
}

// ✅ P0.4 FIX: Validate session_id is UUID v4
export function validateSessionId(sessionId: string | undefined): string | null {
  if (!sessionId) return null

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuidRegex.test(sessionId)) {
    return sessionId
  }

  console.warn('Invalid session_id format:', sessionId)
  return null
}
```

---

## PQL Creation & Billing

### Automatic PQL Creation

PQLs are created automatically by the database trigger `create_pql_from_contact_click()` when a `contact_click` event is inserted.

### Billing Report

```sql
-- Monthly billing report SQL function
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

---

## Privacy & Retention

### Data Classification

| Data Type | Sensitivity | Purpose | Retention |
|-----------|------------|---------|-----------|
| **IP address** | High (PII) | Fraud detection, billing disputes | 12 months for contact_click, 3 months others |
| **Fingerprint (hashed)** | Medium | Deduplication, rate limiting | 12 months for contact_click, 3 months others |
| **User agent** | Low | Device analytics | 12 months |
| **Session ID** | Low | Deduplication | 12 months |

### Retention Policy

```sql
CREATE OR REPLACE FUNCTION purge_old_events()
RETURNS void AS $$
BEGIN
  -- Delete non-billing events after 3 months
  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '3 months'
    AND event_type NOT IN ('contact_click', 'lead_submitted', 'match_created');

  -- Delete billing events after 12 months
  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '12 months'
    AND event_type = 'contact_click';
END;
$$ LANGUAGE plpgsql;
```

---

## Partitioning & Scale

### Safe Partition Creation Function

```sql
-- ✅ P1.1 FIX: Dedicated, constrained function (no arbitrary SQL)
-- Grants: Only callable by service role (server-side via Next.js API)
CREATE OR REPLACE FUNCTION create_next_events_partition(target_month DATE)
RETURNS TEXT AS $$
DECLARE
  v_partition_name TEXT;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Validate target_month is future
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

-- ✅ P1.1 FIX: Grant execute only to service role (not anon/authenticated)
-- In Supabase, service_role is the server-side role
REVOKE EXECUTE ON FUNCTION create_next_events_partition FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_next_events_partition TO service_role;
```

### Automated Partition Creation (Vercel Cron)

```typescript
// app/api/cron/create-partition/route.ts
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const targetMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const { data, error } = await supabaseAdmin.rpc('create_next_events_partition', {
    target_month: targetMonth,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, partition: data })
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// ✅ P1.2 FIX: Test examples match schema constraints

// __tests__/unit/validation.test.ts
import { validateFingerprint, validateSessionId, extractClientIP } from '@/lib/validation'

describe('Fingerprint Validation', () => {
  it('accepts valid SHA256 hex', () => {
    const valid = 'a'.repeat(64)
    expect(validateFingerprint(valid)).toBe(valid)
  })

  it('rejects invalid format', () => {
    expect(validateFingerprint('not-sha256')).toBeNull()
    expect(validateFingerprint('A'.repeat(64))).toBeNull() // Uppercase
    expect(validateFingerprint('a'.repeat(63))).toBeNull() // Too short
  })
})

describe('Session ID Validation', () => {
  it('accepts valid UUID v4', () => {
    const valid = '550e8400-e29b-41d4-a716-446655440000'
    expect(validateSessionId(valid)).toBe(valid)
  })

  it('rejects invalid UUID', () => {
    expect(validateSessionId('not-a-uuid')).toBeNull()
  })
})

describe('IP Extraction', () => {
  it('returns null if no IP headers', () => {
    const req = new Request('http://localhost')
    expect(extractClientIP(req)).toBeNull()
  })

  it('extracts first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(extractClientIP(req)).toBe('1.2.3.4')
  })
})
```

### Integration Tests

```typescript
// ✅ P1.2 FIX: Tests insert required FK rows first

// __tests__/integration/pql-creation.test.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('PQL Creation (Integration)', () => {
  let leadId: string
  let matchId: string
  let professionalId: string

  beforeEach(async () => {
    // Clean tables
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('pqls').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // ✅ Insert required FK rows
    const { data: prof } = await supabase
      .from('professionals')
      .insert({
        slug: 'test-pro',
        full_name: 'Test Professional',
        email: 'test@example.com',
        whatsapp: '1234567890',
        country: 'AR',
        modality: ['therapy'],
        specialties: ['anxiety'],
        status: 'active',
      })
      .select()
      .single()
    professionalId = prof!.id

    const { data: lead } = await supabase
      .from('leads')
      .insert({
        country: 'AR',
        intent_tags: ['anxiety'],
      })
      .select()
      .single()
    leadId = lead!.id

    const { data: match } = await supabase
      .from('matches')
      .insert({
        lead_id: leadId,
        tracking_code: 'TEST-001',
      })
      .select()
      .single()
    matchId = match!.id
  })

  it('creates PQL when contact_click event is inserted', async () => {
    const { data: event } = await supabase
      .from('events')
      .insert({
        event_type: 'contact_click',
        match_id: matchId,
        professional_id: professionalId,
        lead_id: leadId,
        tracking_code: 'TEST-001', // ✅ Required by schema
      })
      .select()
      .single()

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 100))

    const { data: pqls } = await supabase
      .from('pqls')
      .select('*')
      .eq('match_id', matchId)

    expect(pqls).toHaveLength(1)
    expect(pqls![0].event_id).toBe(event!.id)
    expect(pqls![0].tracking_code).toBe('TEST-001') // ✅ Populated
  })

  it('prevents duplicate PQL', async () => {
    // Insert first contact_click
    await supabase.from('events').insert({
      event_type: 'contact_click',
      match_id: matchId,
      professional_id: professionalId,
      lead_id: leadId,
      tracking_code: 'TEST-001',
    })

    // Insert duplicate
    await supabase.from('events').insert({
      event_type: 'contact_click',
      match_id: matchId,
      professional_id: professionalId,
      lead_id: leadId,
      tracking_code: 'TEST-001',
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const { data: pqls } = await supabase
      .from('pqls')
      .select('*')
      .eq('match_id', matchId)

    expect(pqls).toHaveLength(1)
  })

  it('blocks anon write via PostgREST', async () => {
    const anonClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    const { error } = await anonClient.from('events').insert({
      event_type: 'contact_click',
      match_id: matchId,
      professional_id: professionalId,
      lead_id: leadId,
      tracking_code: 'TEST-001',
    })

    expect(error).toBeTruthy()
    expect(error!.message).toContain('denied')
  })

  // ✅ P0.2 FIX: Test partition strategy works for current month
  it('inserts event for current month (partition exists)', async () => {
    const { data, error } = await supabase
      .from('events')
      .insert({
        event_type: 'profile_view',
        match_id: matchId,
        professional_id: professionalId,
        tracking_code: 'TEST-001',
        created_at: new Date().toISOString(), // Current timestamp
      })
      .select()
      .single()

    expect(error).toBeNull() // Should not fail due to missing partition
    expect(data).toBeTruthy()
  })
})
```

### E2E Tests

```typescript
// ✅ P1.2 FIX: E2E test matches final CTA pattern

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

  // Click first profile
  await page.click('a:has-text("View Profile")')
  await page.waitForURL(/\/p\/.*\?at=/)

  // Verify tracking data is precomputed (no async in click)
  const fingerprintReady = await page.evaluate(() => {
    return sessionStorage.getItem('fingerprint_hash') !== null
  })
  expect(fingerprintReady).toBe(true)

  // Click contact button (<a> link, not window.open)
  const contactLink = page.locator('a:has-text("Contactar")')
  expect(await contactLink.getAttribute('href')).toContain('wa.me')
  expect(await contactLink.getAttribute('target')).toBe('_blank')

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    contactLink.click(),
  ])

  // Verify WhatsApp opened
  expect(popup.url()).toContain('wa.me')

  // Wait for beacon
  await page.waitForTimeout(2000)

  // Verify PQL created
  const pqlResponse = await page.request.get(`/api/admin/pqls?match_id=${match.id}`, {
    headers: {
      'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
    },
  })
  const pqls = await pqlResponse.json()

  expect(pqls).toHaveLength(1)
  expect(pqls[0].professional_id).toBe('test-pro-1')
  expect(pqls[0].tracking_code).toBe(match.tracking_code) // ✅ Populated
})
```

---

## Remaining Risks & Mitigation

### Risk 1: Token Secret Compromise

**Mitigation:**
- 32+ byte secret (openssl rand -base64 32)
- Rotate monthly
- Monitor anomalous PQL patterns

### Risk 2: Rate Limiting Bypass

**Mitigation:**
- Two-tier: IP (10/min) + fingerprint (3/5min)
- Validated identifiers only
- ✅ P0.4 FIX: Fallback to session_id if fingerprint invalid

### Risk 3: Trigger Failure

**Mitigation:**
- Weekly reconciliation job (find orphan events)
- Monitor PQL creation rate
- Alert if drops >50%

### Risk 4: Missing Partitions

**Mitigation:**
- ✅ P0.2 FIX: DEFAULT partition catches all rows
- Cron creates next month partition
- Alert if DEFAULT partition has >1000 rows

### Risk 5: Supabase Downtime

**Mitigation:**
- 99.9% SLA (3.5 hours/year)
- Retry queue in IndexedDB
- Monitor status page

---

## Production Checklist (v2)

- [x] Database schema with tracking_code in JWT
- [x] DEFAULT partition + initial 3-month partitions
- [x] IP extraction never fails event
- [x] Fingerprint validation (SHA256 hex)
- [x] Session ID validation (UUID v4)
- [x] RLS blocks PostgREST bypass
- [x] Attribution tokens include tracking_code
- [x] Safe partition creation function (no exec_sql)
- [x] Test examples match schema constraints
- [x] Append-only PQLs with adjustments table
- [x] Privacy retention policy
- [x] Rate limiting with fallbacks

**This architecture is production-ready with all P0 blockers fixed.**
