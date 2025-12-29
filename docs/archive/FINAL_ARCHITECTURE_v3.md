# Hará Match - Final Production Architecture (v3)

**Status:** Production-ready, single source of truth
**Stack:** Next.js 14 + Supabase (PostgreSQL) + Vercel
**Version:** 3.0 - All P0 blockers resolved, production-ready
**Last Updated:** 2025-12-27

---

## Executive Summary

This document defines the ONLY approved implementation path for Hará Match MVP. All previous versions are superseded.

**Core Principle:** Billing-critical events flow through ONE secure path:
```
Profile link (signed token) → /api/events → Service role insert → DB trigger → PQL created
```

**No alternative paths.** PostgREST writes are blocked by RLS.

---

## Database Schema

### Core Tables

```sql
-- professionals: Professional profiles
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'active', 'paused')),

  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  whatsapp TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  online_only BOOLEAN DEFAULT false,

  modality TEXT[] NOT NULL,
  specialties TEXT[] NOT NULL,
  style TEXT[],
  price_range_min INTEGER,
  price_range_max INTEGER,
  currency TEXT DEFAULT 'USD',

  accepting_new_clients BOOLEAN DEFAULT true,
  response_time_expectation TEXT,

  bio TEXT,
  profile_image_url TEXT,
  legacy_testimonials JSONB DEFAULT '[]',

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

  email TEXT,
  whatsapp TEXT,
  user_name TEXT,

  country TEXT NOT NULL,
  city TEXT,
  online_ok BOOLEAN DEFAULT true,
  modality_preference TEXT[],
  budget_min INTEGER,
  budget_max INTEGER,
  currency TEXT DEFAULT 'USD',

  intent_tags TEXT[] NOT NULL,
  style_preference TEXT[],
  urgency TEXT,
  additional_context TEXT,

  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'matched', 'contacted', 'converted', 'closed')),

  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- matches: Match records (3 recommendations per lead)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tracking_code TEXT UNIQUE NOT NULL,

  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'viewed', 'contacted', 'feedback_received')),
  sent_at TIMESTAMPTZ,
  sent_via TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_matches_lead_id ON matches(lead_id);
CREATE INDEX idx_matches_tracking_code ON matches(tracking_code);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

-- match_recommendations: Normalized recommendations (3 DISTINCT professionals per match)
CREATE TABLE match_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,

  rank INTEGER NOT NULL CHECK (rank IN (1, 2, 3)),
  reasons TEXT[] NOT NULL,

  attribution_token TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (match_id, professional_id),  -- Each professional appears once per match
  UNIQUE (match_id, rank)              -- Each rank 1-3 appears once per match
);

CREATE INDEX idx_match_recommendations_match ON match_recommendations(match_id);
CREATE INDEX idx_match_recommendations_professional ON match_recommendations(professional_id);

-- events: All tracking events (partitioned by created_at)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_submitted', 'match_created', 'match_sent',
    'profile_view', 'contact_click', 'feedback_submitted', 'professional_applied'
  )),

  match_id UUID,
  lead_id UUID,
  professional_id UUID,
  tracking_code TEXT NOT NULL,

  event_data JSONB DEFAULT '{}',

  session_id TEXT,
  fingerprint_hash TEXT,
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ✅ Patch B: Dynamic partition creation (current + next 2 months)
-- DEFAULT partition (safety net)
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- Create partitions for current month + next 2 months dynamically
DO $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  i INTEGER;
BEGIN
  FOR i IN 0..2 LOOP
    start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL)::DATE;
    end_date := date_trunc('month', CURRENT_DATE + ((i + 1) || ' months')::INTERVAL)::DATE;
    partition_name := 'events_' || to_char(start_date, 'YYYY_MM');

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      start_date::TIMESTAMPTZ,
      end_date::TIMESTAMPTZ
    );

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_type ON %I(event_type)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_professional ON %I(professional_id)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_match ON %I(match_id)', partition_name, partition_name);

    RAISE NOTICE 'Created partition: % (% to %)', partition_name, start_date, end_date;
  END LOOP;
END $$;

-- ✅ Patch H: event_id referential integrity
-- pqls.event_id is UUID reference (no FK constraint due to partitioning)
-- Audit trail is logical, verified by weekly reconciliation job
-- See "Reconciliation Job" section below

-- pqls: Pay-per-qualified-lead records (APPEND-ONLY)
CREATE TABLE pqls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  match_id UUID NOT NULL REFERENCES matches(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  event_id UUID NOT NULL,  -- Logical reference (no FK due to partitioning)
  tracking_code TEXT NOT NULL,

  billing_month DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status = 'active'),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(match_id, professional_id)
);

CREATE INDEX idx_pqls_professional_billing ON pqls(professional_id, billing_month);
CREATE INDEX idx_pqls_billing_month ON pqls(billing_month);
CREATE INDEX idx_pqls_event_id ON pqls(event_id);

-- pql_adjustments: Dispute/waive/refund records (APPEND-ONLY)
CREATE TABLE pql_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pql_id UUID NOT NULL REFERENCES pqls(id),

  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('waive', 'dispute', 'refund', 'restore')),
  reason TEXT NOT NULL,
  notes TEXT,

  billing_month DATE NOT NULL,
  amount_adjustment INTEGER DEFAULT 0,

  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pql_adjustments_pql ON pql_adjustments(pql_id);
CREATE INDEX idx_pql_adjustments_month ON pql_adjustments(billing_month);

-- feedback: User feedback on recommendations
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  match_id UUID NOT NULL REFERENCES matches(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),

  contacted BOOLEAN,
  session_booked BOOLEAN,
  match_suitability INTEGER CHECK (match_suitability BETWEEN 1 AND 5),
  comments TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_professional_id ON feedback(professional_id);
CREATE INDEX idx_feedback_match_id ON feedback(match_id);
```

### Database Triggers

```sql
-- ✅ Patch C: SECURITY DEFINER with safe search_path
CREATE OR REPLACE FUNCTION create_pql_from_contact_click()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.event_type = 'contact_click' THEN
    INSERT INTO pqls (
      match_id, lead_id, professional_id, event_id, tracking_code, billing_month
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
$$;

CREATE TRIGGER trigger_create_pql_from_contact_click
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION create_pql_from_contact_click();

-- ✅ Patch C: No GRANT needed (triggers execute automatically)
```

### Reconciliation Job (Patch H)

```sql
-- Weekly job to verify PQL → event linkage
-- Detects orphan PQLs (event_id references non-existent event)
CREATE OR REPLACE FUNCTION check_pql_event_integrity()
RETURNS TABLE (
  pql_id UUID,
  event_id UUID,
  issue TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS pql_id,
    p.event_id,
    'Orphan PQL: event not found'::TEXT AS issue
  FROM pqls p
  WHERE NOT EXISTS (
    SELECT 1 FROM events e WHERE e.id = p.event_id
  );
END;
$$ LANGUAGE plpgsql;

-- Run weekly, alert if any rows returned
```

---

## RLS Policies (Strict Lockdown)

```sql
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

-- leads: Authenticated read own
CREATE POLICY "Users read own leads"
ON leads FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email'));

-- matches, match_recommendations, events, pqls, pql_adjustments, feedback:
-- DENY ALL public access (service role only)
CREATE POLICY "Deny all" ON matches FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON match_recommendations FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON events FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON pqls FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON pql_adjustments FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON feedback FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
```

---

## Attribution Token Library

```typescript
// lib/attribution-tokens.ts
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.ATTRIBUTION_TOKEN_SECRET!)
const VALIDITY_DAYS = 30

// ✅ Patch D: Validation regexes
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TRACKING_CODE_REGEX = /^[A-Za-z0-9_-]{1,64}$/

interface AttributionPayload {
  match_id: string
  professional_id: string
  lead_id: string
  tracking_code: string
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

    // ✅ Patch D: Validate claims after JWT verification
    if (typeof payload.match_id !== 'string' || !UUID_REGEX.test(payload.match_id)) {
      console.warn('Invalid match_id in token')
      return null
    }

    if (typeof payload.professional_id !== 'string' || !UUID_REGEX.test(payload.professional_id)) {
      console.warn('Invalid professional_id in token')
      return null
    }

    if (typeof payload.lead_id !== 'string' || !UUID_REGEX.test(payload.lead_id)) {
      console.warn('Invalid lead_id in token')
      return null
    }

    if (typeof payload.tracking_code !== 'string' || !TRACKING_CODE_REGEX.test(payload.tracking_code)) {
      console.warn('Invalid tracking_code in token')
      return null
    }

    if (typeof payload.rank !== 'number' || !Number.isInteger(payload.rank) || payload.rank < 1 || payload.rank > 3) {
      console.warn('Invalid rank in token')
      return null
    }

    return {
      match_id: payload.match_id,
      professional_id: payload.professional_id,
      lead_id: payload.lead_id,
      tracking_code: payload.tracking_code,
      rank: payload.rank,
    }
  } catch (err) {
    return null
  }
}
```

---

## Contact Click Ingestion (THE ONLY PATH)

### Server-Side: API Route

```typescript
// app/api/events/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAttributionToken } from '@/lib/attribution-tokens'
import { ratelimit } from '@/lib/rate-limit'
import { extractClientIP, validateFingerprint, validateSessionId } from '@/lib/validation'

export async function POST(req: Request) {
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

  // ✅ Patch D: Validate attribution token (includes claim validation)
  const token = await verifyAttributionToken(body.attribution_token)
  if (!token) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
  }

  // ✅ Patch C: Extract IP (never fails)
  const clientIP = extractClientIP(req)
  const ipMissing = !clientIP

  // ✅ Patch D: Validate fingerprint format
  const fingerprintHash = validateFingerprint(body.fingerprint_hash)
  const fingerprintValid = !!fingerprintHash

  const sessionId = validateSessionId(body.session_id)

  // Rate limiting with fallback
  if (clientIP) {
    const { success } = await ratelimit.limit(`contact_click:ip:${clientIP}`)
    if (!success) {
      return NextResponse.json({ error: 'Rate limit (IP)' }, { status: 429 })
    }
  }

  if (fingerprintValid) {
    const { success } = await ratelimit.limit(`contact_click:fp:${fingerprintHash}`, { limit: 3, window: '5m' })
    if (!success) {
      return NextResponse.json({ error: 'Rate limit (fingerprint)' }, { status: 429 })
    }
  } else if (sessionId) {
    const { success } = await ratelimit.limit(`contact_click:session:${sessionId}`, { limit: 5, window: '5m' })
    if (!success) {
      return NextResponse.json({ error: 'Rate limit (session)' }, { status: 429 })
    }
  }

  // Insert event using SERVICE ROLE (only valid path)
  const { data: event, error } = await supabaseAdmin
    .from('events')
    .insert({
      event_type: 'contact_click',
      match_id: token.match_id,
      lead_id: token.lead_id,
      professional_id: token.professional_id,
      tracking_code: token.tracking_code,
      event_data: { ip_missing: ipMissing, fingerprint_valid: fingerprintValid },
      session_id: sessionId,
      fingerprint_hash: fingerprintValid ? fingerprintHash : null,
      user_agent: req.headers.get('user-agent'),
      ip_address: clientIP,
      referrer: req.headers.get('referer'),
    })
    .select()
    .single()

  if (error) {
    console.error('Event insertion failed:', error)
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }

  return NextResponse.json({ success: true, event_id: event.id })
}
```

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
      let sessionId = localStorage.getItem('session_id')
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem('session_id', sessionId)
      }

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
    }).catch(() => console.warn('Failed to track'))
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

---

## Partition Management

### Safe Partition Creation Function

```sql
-- ✅ Patch C: SECURITY DEFINER with safe search_path
CREATE OR REPLACE FUNCTION create_next_events_partition(target_month DATE)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_partition_name TEXT;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  IF target_month <= date_trunc('month', CURRENT_DATE) THEN
    RAISE EXCEPTION 'Target month must be in the future';
  END IF;

  v_partition_name := 'events_' || to_char(target_month, 'YYYY_MM');
  v_start_date := target_month::timestamptz;
  v_end_date := (target_month + INTERVAL '1 month')::timestamptz;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
    v_partition_name, v_start_date, v_end_date
  );

  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_type ON %I(event_type)', v_partition_name, v_partition_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_professional ON %I(professional_id)', v_partition_name, v_partition_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_match ON %I(match_id)', v_partition_name, v_partition_name);

  RETURN v_partition_name;
END;
$$;

-- ✅ Patch C: Explicit permissions
REVOKE EXECUTE ON FUNCTION create_next_events_partition FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_next_events_partition TO service_role;
```

---

## Validation Utilities

```typescript
// lib/validation.ts

// ✅ Patch C: Robust IP extraction (never throws)
export function extractClientIP(req: Request): string | null {
  const cfIP = req.headers.get('cf-connecting-ip')
  const realIP = req.headers.get('x-real-ip')
  const forwarded = req.headers.get('x-forwarded-for')

  if (cfIP) return validateIPFormat(cfIP)
  if (realIP) return validateIPFormat(realIP)

  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim())
    return validateIPFormat(ips[0])
  }

  return null
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

// ✅ Patch D: Validate fingerprint is SHA256 hex
export function validateFingerprint(fingerprint: string | undefined): string | null {
  if (!fingerprint) return null

  const sha256Regex = /^[a-f0-9]{64}$/
  if (sha256Regex.test(fingerprint)) {
    return fingerprint
  }

  console.warn('Invalid fingerprint_hash format:', fingerprint)
  return null
}

// ✅ Patch D: Validate session_id is UUID v4
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

## Privacy & Retention

### Retention Policy

```sql
CREATE OR REPLACE FUNCTION purge_old_events()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '3 months'
    AND event_type NOT IN ('contact_click', 'lead_submitted', 'match_created');

  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '12 months'
    AND event_type = 'contact_click';
END;
$$;

REVOKE EXECUTE ON FUNCTION purge_old_events FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_old_events TO service_role;
```

---

## Production Checklist

- [x] Schema has tracking_code NOT NULL in events and pqls
- [x] Dynamic partition creation (current + next 2 months)
- [x] DEFAULT partition exists (safety net)
- [x] SECURITY DEFINER functions have SET search_path = public
- [x] Token claim validation (UUID, rank, tracking_code format)
- [x] IP extraction never fails event (stores null)
- [x] Fingerprint validation with fallback to session_id
- [x] RLS denies all public writes (service role only)
- [x] Append-only PQLs with adjustments table
- [x] Event-PQL linkage reconciliation job

**This architecture is production-ready.**
