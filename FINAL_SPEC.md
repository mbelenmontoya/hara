# Hará Match — Database & API Specification (Source of Truth)

**Stack:** Next.js 14 + Supabase PostgreSQL + Vercel
**Scope:** Database schema and API contracts. **For product context (what we're building, who it's for, why) see [`PRODUCT.md`](./PRODUCT.md).**
**This document supersedes:** All older `ARCHITECTURE_*.md`, `PRODUCTION_*.md`, `SECURITY_*.md` documents.

> **Note (2026-04):** Schema below reflects the original migration 001. The product has since pivoted from PQL-only billing to a directory + concierge marketplace (Apr 1, 2026), and migrations 004 (ranking foundation), 005 (Destacado tier), and 006 (reviews collection) extend the schema. PQL infrastructure is preserved as an optional layer for the concierge flow. See `migrations/004_*.sql`, `005_*.sql`, `006_*.sql` for current additive changes; the base tables documented here remain accurate.

---

## Database Schema

### Complete Migration (migrations/001_schema.sql)

```sql
-- ==========================================
-- CORE TABLES
-- ==========================================

CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','submitted','approved','active','paused','rejected')),
  rejection_reason TEXT,
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
  bio TEXT,
  short_description TEXT,
  experience_description TEXT,
  instagram TEXT,
  service_type TEXT[] DEFAULT '{}',
  offers_courses_online BOOLEAN DEFAULT false,
  courses_presencial_location TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_professionals_status ON professionals(status);
CREATE INDEX idx_professionals_country ON professionals(country, city);
CREATE INDEX idx_professionals_modality ON professionals USING GIN(modality);
CREATE INDEX idx_professionals_specialties ON professionals USING GIN(specialties);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  whatsapp TEXT,
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
  status TEXT DEFAULT 'new' CHECK (status IN ('new','matched','contacted','converted','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tracking_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_matches_lead_id ON matches(lead_id);
CREATE INDEX idx_matches_tracking_code ON matches(tracking_code);

CREATE TABLE match_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank IN (1,2,3)),
  reasons TEXT[],
  attribution_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, professional_id),
  UNIQUE(match_id, rank)
);

CREATE INDEX idx_match_recommendations_match ON match_recommendations(match_id);
CREATE INDEX idx_match_recommendations_professional ON match_recommendations(professional_id);

-- ==========================================
-- EVENTS (PARTITIONED)
-- ==========================================

CREATE TABLE events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_submitted','match_created','match_sent','profile_view','contact_click','feedback_submitted'
  )),
  match_id UUID,
  professional_id UUID,
  lead_id UUID,
  tracking_code TEXT NOT NULL,
  fingerprint_hash TEXT,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- DEFAULT partition (safety net)
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- Dynamic partition creation for current + next 2 months
DO $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  i INTEGER;
BEGIN
  FOR i IN 0..2 LOOP
    start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL)::DATE;
    end_date := date_trunc('month', CURRENT_DATE + ((i+1) || ' months')::INTERVAL)::DATE;
    partition_name := 'events_' || to_char(start_date, 'YYYY_MM');

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date::TIMESTAMPTZ, end_date::TIMESTAMPTZ
    );

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_type ON %I(event_type)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_match ON %I(match_id)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_pro ON %I(professional_id)', partition_name, partition_name);

    RAISE NOTICE 'Created partition: % (% to %)', partition_name, start_date, end_date;
  END LOOP;
END $$;

-- ==========================================
-- PQLs (APPEND-ONLY BILLING)
-- ==========================================

CREATE TABLE pqls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  event_id UUID NOT NULL,  -- Logical reference (no FK due to partitioning)
  event_created_at TIMESTAMPTZ NOT NULL,  -- For audit integrity verification
  tracking_code TEXT NOT NULL,
  billing_month DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status = 'active'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, professional_id)
);

CREATE INDEX idx_pqls_professional_billing ON pqls(professional_id, billing_month);
CREATE INDEX idx_pqls_event_id ON pqls(event_id);
CREATE INDEX idx_pqls_event_composite ON pqls(event_id, event_created_at);

CREATE TABLE pql_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pql_id UUID NOT NULL REFERENCES pqls(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('waive','dispute','refund','restore')),
  reason TEXT NOT NULL,
  billing_month DATE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pql_adjustments_pql ON pql_adjustments(pql_id);

-- ==========================================
-- RLS POLICIES (STRICT LOCKDOWN)
-- ==========================================

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pqls ENABLE ROW LEVEL SECURITY;
ALTER TABLE pql_adjustments ENABLE ROW LEVEL SECURITY;

-- Public read active profiles only
CREATE POLICY "Public read active" ON professionals FOR SELECT
TO anon, authenticated USING (status = 'active');

-- Deny all writes to billing-critical tables
CREATE POLICY "Deny all" ON events FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON pqls FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON pql_adjustments FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON match_recommendations FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON matches FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);

-- ==========================================
-- TRIGGERS
-- ==========================================

CREATE FUNCTION create_pql_from_contact_click()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.event_type = 'contact_click' THEN
    INSERT INTO pqls (match_id, lead_id, professional_id, event_id, event_created_at, tracking_code, billing_month)
    VALUES (NEW.match_id, NEW.lead_id, NEW.professional_id, NEW.id, NEW.created_at, NEW.tracking_code,
            date_trunc('month', NEW.created_at)::date)
    ON CONFLICT (match_id, professional_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trigger_create_pql
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION create_pql_from_contact_click();

REVOKE EXECUTE ON FUNCTION create_pql_from_contact_click() FROM PUBLIC;

-- ==========================================
-- OPERATIONAL FUNCTIONS
-- ==========================================

-- Partition creation
CREATE FUNCTION create_next_events_partition(target_month DATE)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
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

  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
    v_partition_name, v_start_date, v_end_date);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_type ON %I(event_type)', v_partition_name, v_partition_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_match ON %I(match_id)', v_partition_name, v_partition_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_pro ON %I(professional_id)', v_partition_name, v_partition_name);

  RETURN v_partition_name;
END $$;

REVOKE EXECUTE ON FUNCTION create_next_events_partition FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_next_events_partition TO service_role;

-- Reconciliation: Detect orphan PQLs
CREATE FUNCTION check_pql_event_integrity()
RETURNS TABLE (pql_id UUID, event_id UUID, event_created_at TIMESTAMPTZ, issue TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.event_id, p.event_created_at, 'Orphan PQL: event not found'::TEXT
  FROM pqls p
  WHERE NOT EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = p.event_id AND e.created_at = p.event_created_at
  );
END $$;

REVOKE EXECUTE ON FUNCTION check_pql_event_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_pql_event_integrity() TO service_role;

-- Retention policy
CREATE FUNCTION purge_old_events()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '3 months'
    AND event_type NOT IN ('contact_click','lead_submitted','match_created');
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;

  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '12 months'
    AND event_type = 'contact_click';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;

  RETURN deleted_count;
END $$;

REVOKE EXECUTE ON FUNCTION purge_old_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_old_events() TO service_role;
```

---

## Lead Submission (app/actions/create-lead.ts)

**Note:** leads table has RLS enabled with no public INSERT policy. Lead submission must use service role.

```typescript
'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'

export async function createLead(formData: {
  country: string
  intent_tags: string[]
  budget_max?: number
  email?: string
}) {
  const { data, error } = await supabaseAdmin.from('leads').insert({
    country: formData.country,
    intent_tags: formData.intent_tags,
    budget_max: formData.budget_max,
    email: formData.email,
    status: 'new',
  }).select().single()

  if (error) throw error

  return { lead_id: data.id }
}
```

---

## Attribution Token Library (lib/attribution-tokens.ts)

```typescript
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.ATTRIBUTION_TOKEN_SECRET!)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TRACKING_CODE_REGEX = /^[A-Za-z0-9_-]{1,64}$/

export interface AttributionPayload {
  match_id: string
  professional_id: string
  lead_id: string
  tracking_code: string
  rank: number
}

export async function createAttributionToken(payload: AttributionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function verifyAttributionToken(token: string): Promise<AttributionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)

    // Validate UUIDs
    if (!UUID_REGEX.test(payload.match_id as string)) return null
    if (!UUID_REGEX.test(payload.professional_id as string)) return null
    if (!UUID_REGEX.test(payload.lead_id as string)) return null

    // Validate rank
    if (typeof payload.rank !== 'number' || payload.rank < 1 || payload.rank > 3) return null

    // Validate tracking_code
    if (!TRACKING_CODE_REGEX.test(payload.tracking_code as string)) return null

    return payload as AttributionPayload
  } catch {
    return null
  }
}
```

---

## Event Ingestion API (app/api/events/route.ts)

```typescript
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
      return NextResponse.json({ error: 'Invalid Content-Type' }, { status: 415 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate token (includes claim validation)
  const token = await verifyAttributionToken(body.attribution_token)
  if (!token) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
  }

  // Extract identifiers (never fail event)
  const clientIP = extractClientIP(req)
  const fingerprintHash = validateFingerprint(body.fingerprint_hash)
  const sessionId = validateSessionId(body.session_id)

  // Rate limiting (two-tier with fallback)
  if (clientIP) {
    const { success } = await ratelimit.limit(`contact_click:ip:${clientIP}`, { limit: 10, window: '1m' })
    if (!success) return NextResponse.json({ error: 'Rate limit (IP)' }, { status: 429 })
  }

  if (fingerprintHash) {
    const { success } = await ratelimit.limit(`contact_click:fp:${fingerprintHash}`, { limit: 3, window: '5m' })
    if (!success) return NextResponse.json({ error: 'Rate limit (fingerprint)' }, { status: 429 })
  } else if (sessionId) {
    const { success } = await ratelimit.limit(`contact_click:session:${sessionId}`, { limit: 5, window: '5m' })
    if (!success) return NextResponse.json({ error: 'Rate limit (session)' }, { status: 429 })
  }

  // Insert via service role
  const { data, error } = await supabaseAdmin.from('events').insert({
    event_type: 'contact_click',
    match_id: token.match_id,
    professional_id: token.professional_id,
    lead_id: token.lead_id,
    tracking_code: token.tracking_code,
    fingerprint_hash: fingerprintHash,
    session_id: sessionId,
    ip_address: clientIP,
    user_agent: req.headers.get('user-agent'),
    referrer: req.headers.get('referer'),
    event_data: { ip_missing: !clientIP, fingerprint_valid: !!fingerprintHash },
  }).select().single()

  if (error) {
    console.error('Event insert failed:', error)
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, event_id: data.id })
}
```

---

## Validation Utilities (lib/validation.ts)

```typescript
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
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
  return (ipv4.test(ip) || ipv6.test(ip)) ? ip : null
}

export function validateFingerprint(fp: string | undefined): string | null {
  if (!fp) return null
  return /^[a-f0-9]{64}$/.test(fp) ? fp : null
}

export function validateSessionId(sid: string | undefined): string | null {
  if (!sid) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sid) ? sid : null
}
```

---

## Contact Button (components/ContactButton.tsx)

```typescript
'use client'
import { useEffect, useState } from 'react'
import { sha256 } from '@/lib/crypto-utils'

export function ContactButton({ whatsappUrl, attributionToken }) {
  const [tracking, setTracking] = useState({ fp: '', sid: '', ready: false })

  useEffect(() => {
    const init = async () => {
      let sid = localStorage.getItem('session_id')
      if (!sid) {
        sid = crypto.randomUUID()
        localStorage.setItem('session_id', sid)
      }

      let fp = sessionStorage.getItem('fingerprint_hash')
      if (!fp) {
        const fpjs = await import('@fingerprintjs/fingerprintjs').then(m => m.default.load())
        const result = await fpjs.get()
        fp = await sha256(result.visitorId)
        sessionStorage.setItem('fingerprint_hash', fp)
      }

      setTracking({ fp, sid, ready: true })
    }
    init()
  }, [])

  const handleClick = () => {
    // Never block navigation - send tracking if ready, or token-only if not
    const payload = JSON.stringify({
      attribution_token: attributionToken,
      fingerprint_hash: tracking.ready ? tracking.fp : undefined,
      session_id: tracking.ready ? tracking.sid : undefined,
    })

    const blob = new Blob([payload], { type: 'text/plain' })
    if (navigator.sendBeacon('/api/events', blob)) return

    fetch('/api/events', {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {})
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="btn-primary"
    >
      Contactar por WhatsApp
    </a>
  )
}
```

---

## QA Seed Script (scripts/qa-seed.ts)

```typescript
import { createClient } from '@supabase/supabase-js'
import { createAttributionToken } from '../lib/attribution-tokens'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function seed() {
  // Create 3 DISTINCT professionals
  const pros = []
  for (let i = 1; i <= 3; i++) {
    const { data } = await supabase.from('professionals').insert({
      slug: `qa-pro-${i}`,
      full_name: `Test Pro ${i}`,
      email: `test${i}@qa.com`,
      whatsapp: `+549111234567${i}`,
      country: 'AR',
      modality: ['therapy'],
      specialties: ['anxiety'],
      status: 'active',
    }).select().single()
    pros.push(data)
  }

  const { data: lead } = await supabase.from('leads').insert({
    country: 'AR',
    intent_tags: ['anxiety'],
  }).select().single()

  const trackingCode = `QA-${Date.now()}`
  const { data: match } = await supabase.from('matches').insert({
    lead_id: lead.id,
    tracking_code: trackingCode,
  }).select().single()

  const tokens = await Promise.all(
    pros.map((p, i) => createAttributionToken({
      match_id: match.id,
      professional_id: p.id,
      lead_id: lead.id,
      tracking_code: trackingCode,
      rank: i + 1,
    }))
  )

  await supabase.from('match_recommendations').insert(
    pros.map((p, i) => ({
      match_id: match.id,
      professional_id: p.id,
      rank: i + 1,
      reasons: ['Test'],
      attribution_token: tokens[i],
    }))
  )

  console.log(`MATCH_ID="${match.id}"`)
  console.log(`LEAD_ID="${lead.id}"`)
  console.log(`TRACKING_CODE="${trackingCode}"`)
  console.log(`PRO_1_ID="${pros[0].id}"`)
  console.log(`PRO_2_ID="${pros[1].id}"`)
  console.log(`PRO_3_ID="${pros[2].id}"`)
  console.log(`TOKEN_1="${tokens[0]}"`)
  console.log(`TOKEN_2="${tokens[1]}"`)
  console.log(`TOKEN_3="${tokens[2]}"`)
}

seed()
```

**Run:** `tsx scripts/qa-seed.ts > qa.env && source qa.env`

---

## Production Checklist

- [x] Single write-path: /api/events only
- [x] RLS blocks PostgREST writes
- [x] Token validation: signature + expiration + claim format
- [x] Partitions: DEFAULT + dynamic current/next 2 months
- [x] PQL trigger: automatic, idempotent (UNIQUE constraint)
- [x] Append-only: pqls never mutated
- [x] Rate limiting: IP + fingerprint with fallbacks
- [x] Reconciliation: weekly job detects orphan PQLs
- [x] Privacy: fingerprints hashed client-side
- [x] Audit trail: pql_adjustments for waive/dispute/refund

**Production-ready. Implement IMPLEMENTATION_PLAN.md.**
