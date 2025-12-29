# Hará Match - Operational Implementation Plan (v2)

**Purpose:** Measurable milestones with QA gates for production-ready implementation
**Timeline:** 4 weeks (160 hours solo builder)
**Priority:** Billing correctness and security first
**Version:** 2.0 - All QA gates runnable, seed script added

---

## QA Seed Script (Required for Testing)

To make QA gates repeatable, we provide a seed script that creates test data and generates valid attribution tokens.

### Setup: scripts/qa-seed.ts

```typescript
// scripts/qa-seed.ts
// Purpose: Generate test data + valid attribution tokens for QA gates
// Usage: tsx scripts/qa-seed.ts

import { createClient } from '@supabase/supabase-js'
import { createAttributionToken } from '../lib/attribution-tokens'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  console.log('🌱 Seeding QA test data...\n')

  // 1. Create test professional
  const { data: professional, error: profError } = await supabase
    .from('professionals')
    .insert({
      slug: 'qa-test-pro',
      full_name: 'QA Test Professional',
      email: 'qa-test@example.com',
      whatsapp: '+5491112345678',
      country: 'AR',
      city: 'Buenos Aires',
      online_only: false,
      modality: ['therapy', 'coaching'],
      specialties: ['anxiety', 'relationships'],
      style: ['empathetic', 'structured'],
      price_range_min: 300000,
      price_range_max: 600000,
      currency: 'ARS',
      status: 'active',
      accepting_new_clients: true,
      bio: 'Test professional for QA gates',
    })
    .select()
    .single()

  if (profError) throw profError
  console.log(`✅ Professional created: ${professional.id}`)

  // 2. Create test lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      country: 'AR',
      city: 'Buenos Aires',
      online_ok: true,
      modality_preference: ['therapy'],
      budget_min: 200000,
      budget_max: 700000,
      currency: 'ARS',
      intent_tags: ['anxiety', 'relationships'],
      style_preference: ['empathetic'],
      urgency: 'this_week',
      status: 'new',
    })
    .select()
    .single()

  if (leadError) throw leadError
  console.log(`✅ Lead created: ${lead.id}`)

  // 3. Generate tracking code
  const trackingCode = `QA-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  console.log(`✅ Tracking code: ${trackingCode}`)

  // 4. Create test match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      lead_id: lead.id,
      tracking_code: trackingCode,
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_via: 'qa_seed',
    })
    .select()
    .single()

  if (matchError) throw matchError
  console.log(`✅ Match created: ${match.id}`)

  // 5. Generate attribution tokens (3 for same professional, simulating recommendations)
  const token1 = await createAttributionToken({
    match_id: match.id,
    professional_id: professional.id,
    lead_id: lead.id,
    tracking_code: trackingCode,
    rank: 1,
  })

  const token2 = await createAttributionToken({
    match_id: match.id,
    professional_id: professional.id,
    lead_id: lead.id,
    tracking_code: trackingCode,
    rank: 2,
  })

  const token3 = await createAttributionToken({
    match_id: match.id,
    professional_id: professional.id,
    lead_id: lead.id,
    tracking_code: trackingCode,
    rank: 3,
  })

  // 6. Create match_recommendations
  await supabase.from('match_recommendations').insert([
    {
      match_id: match.id,
      professional_id: professional.id,
      rank: 1,
      reasons: ['Strong match for anxiety support', 'Located in Buenos Aires'],
      attribution_token: token1,
    },
  ])

  console.log('\n📋 QA Test Data Summary:')
  console.log('========================')
  console.log(`Professional ID: ${professional.id}`)
  console.log(`Lead ID: ${lead.id}`)
  console.log(`Match ID: ${match.id}`)
  console.log(`Tracking Code: ${trackingCode}`)
  console.log('\n🔑 Attribution Tokens (copy for QA gates):')
  console.log(`TOKEN_1="${token1}"`)
  console.log(`TOKEN_2="${token2}"`)
  console.log(`TOKEN_3="${token3}"`)
  console.log('\n💾 Save these values for QA-2.1, QA-2.2, QA-2.4, QA-2.5, QA-4.4')

  // 7. Test token verification
  const verified = await import('../lib/attribution-tokens').then(m =>
    m.verifyAttributionToken(token1)
  )
  console.log('\n✅ Token verification test:', verified ? 'PASS' : 'FAIL')

  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
```

### Running the Seed Script

```bash
# Install tsx if not already installed
npm install -D tsx

# Run seed script (saves output to .env.qa for easy reference)
tsx scripts/qa-seed.ts | tee .env.qa

# Example output:
# Professional ID: 550e8400-e29b-41d4-a716-446655440000
# Lead ID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
# Match ID: 6ba7b814-9dad-11d1-80b4-00c04fd430c8
# Tracking Code: QA-1735344000-A3K9
# TOKEN_1="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Important:** Run this seed script ONCE before running QA gates. Use the printed IDs and tokens in the gates below.

---

## Milestone 1: Foundation & Security (Days 1-7)

### Goal
Database schema deployed, RLS lockdown complete, attribution tokens working, PostgREST bypass blocked.

### Tasks

1. **Database Setup**
   - Create Supabase project (production + local dev)
   - Run initial migration (schema + RLS + triggers)
   - Verify DEFAULT partition exists: `SELECT * FROM pg_tables WHERE tablename = 'events_default'`
   - Verify monthly partitions exist: `SELECT * FROM pg_tables WHERE tablename LIKE 'events_202%'`

2. **Attribution Token Library**
   - Implement `createAttributionToken()` with tracking_code in claims
   - Implement `verifyAttributionToken()` with jose library
   - Generate ATTRIBUTION_TOKEN_SECRET (32+ bytes): `openssl rand -base64 32`
   - Store in environment variables (Vercel/local .env)

3. **Validation Utilities**
   - Implement `extractClientIP()` (robust, never throws)
   - Implement `validateFingerprint()` (SHA256 hex check)
   - Implement `validateSessionId()` (UUID v4 check)
   - Implement `sha256()` client utility for fingerprint hashing

4. **Admin Authentication**
   - Set up Clerk project
   - Configure admin role claims
   - Implement middleware for `/admin/*` routes
   - Create Supabase service role client wrapper

5. **Rate Limiting**
   - Set up Upstash Redis (free tier)
   - Implement rate limiting utility with fallbacks
   - Test IP-based (10/min) and fingerprint-based (3/5min) limits

### Definition of Done

- ✅ All tables created in Supabase
- ✅ RLS policies deny anon/authenticated writes
- ✅ DEFAULT partition + current/next 2 monthly partitions exist
- ✅ Attribution token can be created and verified
- ✅ IP extraction returns null (not error) when missing
- ✅ Fingerprint validation rejects invalid formats
- ✅ Admin can authenticate via Clerk

### QA Gates / Acceptance Criteria

**QA-1.1: PostgREST Bypass Test (CRITICAL)**

**Commands:**
```typescript
// File: __tests__/integration/rls-bypass.test.ts
import { createClient } from '@supabase/supabase-js'

test('RLS blocks anon write to events table', async () => {
  const anonClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  // ✅ Use gen_random_uuid() for IDs
  const { error } = await anonClient.from('events').insert({
    event_type: 'contact_click',
    match_id: '00000000-0000-0000-0000-000000000001', // Any UUID
    professional_id: '00000000-0000-0000-0000-000000000002',
    lead_id: '00000000-0000-0000-0000-000000000003',
    tracking_code: 'FAKE-001',
  })

  expect(error).toBeTruthy()
  expect(error!.message).toMatch(/denied|policy/i)
})
```

**Expected Output:**
```
✓ RLS blocks anon write to events table (15ms)
```

**DB Verification:**
```sql
-- Should return 0 rows (no events inserted via anon key)
SELECT COUNT(*) FROM events WHERE tracking_code = 'FAKE-001';
-- Expected: 0
```

**If Test Fails:** RLS policies not configured correctly. Check:
```sql
SELECT * FROM pg_policies WHERE tablename = 'events' AND policyname LIKE '%Deny%';
```

---

**QA-1.2: Partition Strategy Test**

**Commands:**
```sql
-- Test 1: Verify DEFAULT partition exists
SELECT tablename FROM pg_tables WHERE tablename = 'events_default';
-- Expected: events_default

-- Test 2: Insert event with NOW() (current month)
INSERT INTO events (id, event_type, tracking_code, created_at)
VALUES (gen_random_uuid(), 'profile_view', 'QA-PARTITION-TEST', NOW())
RETURNING id, created_at;

-- Expected: Success (1 row inserted, no "no partition" error)

-- Test 3: Verify row exists in correct partition
SELECT
  schemaname,
  tablename,
  COUNT(*) as row_count
FROM pg_stat_user_tables
WHERE tablename LIKE 'events_%'
  AND schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Expected: Row in events_YYYY_MM matching current month OR events_default

-- Test 4: Verify row is queryable via parent table
SELECT id, event_type, tracking_code, created_at
FROM events
WHERE tracking_code = 'QA-PARTITION-TEST';

-- Expected: 1 row returned
```

**Expected Output:**
```
 id                                   | created_at
--------------------------------------+---------------------------
 550e8400-e29b-41d4-a716-446655440000 | 2025-01-15 10:30:00+00

(1 row)
```

**If Test Fails:**
- Check if monthly partition for current month exists
- Check if DEFAULT partition exists
- Check partition range definitions

---

**QA-1.3: Token Validation Test**

**Commands:**
```typescript
// File: __tests__/unit/attribution-tokens.test.ts
import { createAttributionToken, verifyAttributionToken } from '@/lib/attribution-tokens'
import { SignJWT } from 'jose'

describe('Attribution Token Validation', () => {
  test('creates and verifies valid token with tracking_code', async () => {
    const token = await createAttributionToken({
      match_id: '550e8400-e29b-41d4-a716-446655440000',
      professional_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      lead_id: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
      tracking_code: 'TEST-001',
      rank: 1,
    })

    const decoded = await verifyAttributionToken(token)

    expect(decoded).toBeTruthy()
    expect(decoded!.tracking_code).toBe('TEST-001')
    expect(decoded!.match_id).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  test('rejects expired token', async () => {
    // ✅ Generate expired token using jose (not manual string)
    const SECRET = new TextEncoder().encode(process.env.ATTRIBUTION_TOKEN_SECRET!)
    const pastTime = Math.floor(Date.now() / 1000) - 86400 // 24 hours ago

    const expiredToken = await new SignJWT({
      match_id: '550e8400-e29b-41d4-a716-446655440000',
      professional_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      lead_id: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
      tracking_code: 'TEST-001',
      rank: 1,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(pastTime) // Expired
      .sign(SECRET)

    const result = await verifyAttributionToken(expiredToken)

    expect(result).toBeNull()
  })

  test('rejects tampered token', async () => {
    const validToken = await createAttributionToken({
      match_id: '550e8400-e29b-41d4-a716-446655440000',
      professional_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      lead_id: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
      tracking_code: 'TEST-001',
      rank: 1,
    })

    // Tamper with last 5 characters
    const tamperedToken = validToken.slice(0, -5) + 'XXXXX'
    const result = await verifyAttributionToken(tamperedToken)

    expect(result).toBeNull()
  })
})
```

**Expected Output:**
```
✓ creates and verifies valid token with tracking_code (8ms)
✓ rejects expired token (5ms)
✓ rejects tampered token (3ms)
```

---

**QA-1.4: IP Extraction Resilience Test**

**Commands:**
```typescript
// File: __tests__/unit/validation.test.ts
import { extractClientIP } from '@/lib/validation'

describe('IP Extraction', () => {
  test('returns null for missing IP headers', () => {
    const req = new Request('http://localhost')
    const ip = extractClientIP(req)

    expect(ip).toBeNull() // Should NOT throw error
  })

  test('extracts first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' },
    })
    const ip = extractClientIP(req)

    expect(ip).toBe('1.2.3.4') // First IP (client)
  })

  test('prefers cf-connecting-ip over x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: {
        'cf-connecting-ip': '203.0.113.1',
        'x-forwarded-for': '198.51.100.2, 192.0.2.1',
      },
    })
    const ip = extractClientIP(req)

    expect(ip).toBe('203.0.113.1') // Cloudflare header
  })

  test('rejects invalid IP format', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': 'not-an-ip' },
    })
    const ip = extractClientIP(req)

    expect(ip).toBeNull()
  })
})
```

**Expected Output:**
```
✓ returns null for missing IP headers (2ms)
✓ extracts first IP from x-forwarded-for (1ms)
✓ prefers cf-connecting-ip over x-forwarded-for (1ms)
✓ rejects invalid IP format (1ms)
```

---

**QA-1.5: Fingerprint Validation Test**

**Commands:**
```typescript
// File: __tests__/unit/validation.test.ts
import { validateFingerprint } from '@/lib/validation'

describe('Fingerprint Validation', () => {
  test('accepts valid SHA256 hex (lowercase)', () => {
    const valid = 'a'.repeat(64)
    expect(validateFingerprint(valid)).toBe(valid)
  })

  test('rejects uppercase SHA256', () => {
    const uppercase = 'A'.repeat(64)
    expect(validateFingerprint(uppercase)).toBeNull()
  })

  test('rejects wrong length', () => {
    expect(validateFingerprint('a'.repeat(63))).toBeNull() // Too short
    expect(validateFingerprint('a'.repeat(65))).toBeNull() // Too long
  })

  test('rejects non-hex characters', () => {
    const invalid = 'z'.repeat(64)
    expect(validateFingerprint(invalid)).toBeNull()
  })

  test('returns null for undefined', () => {
    expect(validateFingerprint(undefined)).toBeNull()
  })
})
```

**Expected Output:**
```
✓ accepts valid SHA256 hex (lowercase) (1ms)
✓ rejects uppercase SHA256 (1ms)
✓ rejects wrong length (1ms)
✓ rejects non-hex characters (1ms)
✓ returns null for undefined (1ms)
```

---

### Deliverables

- `migrations/001_initial_schema.sql` (schema + RLS + triggers + partitions)
- `lib/attribution-tokens.ts` (create/verify functions)
- `lib/validation.ts` (IP, fingerprint, session ID validation)
- `lib/crypto-utils.ts` (sha256 function)
- `lib/supabase-admin.ts` (service role client)
- `lib/rate-limit.ts` (Upstash Redis wrapper)
- `middleware.ts` (Clerk admin protection)
- `scripts/qa-seed.ts` ✅ NEW: QA test data generator
- `__tests__/unit/validation.test.ts` (validation tests)
- `__tests__/unit/attribution-tokens.test.ts` (token tests)
- `__tests__/integration/rls-policies.test.ts` (QA-1.1 test)
- `__tests__/integration/partitioning.test.ts` (QA-1.2 test)

---

## Milestone 2: Event Ingestion & PQL Trigger (Days 8-10)

### Goal
`/api/events` endpoint working, PQL created automatically by trigger, idempotency verified.

### Tasks

1. **API Route Implementation**
   - Create `/app/api/events/route.ts`
   - Handle text/plain and application/json content types
   - Validate attribution token (call verifyAttributionToken)
   - Extract and validate IP (extractClientIP) - store null if missing
   - Validate fingerprint_hash and session_id formats
   - Apply rate limiting (IP + fingerprint/session fallback)
   - Insert event via service role client
   - Return 403 for invalid token, 429 for rate limit, 500 for DB errors

2. **Event Insertion Logic**
   - Use token claims for match_id, lead_id, professional_id, tracking_code
   - Store ip_address as null if missing (don't fail request)
   - Store fingerprint_hash only if valid format
   - Log missing/invalid identifiers in event_data JSONB
   - Ensure tracking_code is NOT NULL (from validated token)

3. **Trigger Verification**
   - Manually insert contact_click event via service role
   - Verify trigger `create_pql_from_contact_click()` fires
   - Verify PQL row appears in pqls table with tracking_code
   - Test idempotency (insert duplicate event, verify only 1 PQL)

### Definition of Done

- ✅ `/api/events` endpoint accepts POST with valid token
- ✅ Invalid/expired token returns 403
- ✅ Missing IP does NOT fail request (stores null)
- ✅ Invalid fingerprint does NOT fail request (stores null, uses session_id)
- ✅ Rate limits enforced (429 response)
- ✅ PQL created automatically by trigger
- ✅ Duplicate events do NOT create duplicate PQLs

### QA Gates / Acceptance Criteria

**Pre-requisite:** Run `tsx scripts/qa-seed.ts` and save the printed TOKEN_1, Professional ID, Match ID, etc.

**QA-2.1: Valid Token Creates Event & PQL**

**Commands:**
```bash
# Step 1: Run seed script (if not already done)
tsx scripts/qa-seed.ts > qa-output.txt

# Step 2: Extract TOKEN_1 from output
export TOKEN_1=$(grep 'TOKEN_1=' qa-output.txt | cut -d'"' -f2)

# Step 3: Send valid contact_click event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d "{
    \"attribution_token\": \"$TOKEN_1\",
    \"fingerprint_hash\": \"$(python3 -c 'print("a"*64)')\",
    \"session_id\": \"550e8400-e29b-41d4-a716-446655440000\"
  }"

# Expected Response:
# {"success": true, "event_id": "..."}
```

**DB Verification:**
```sql
-- Step 1: Extract match_id from seed output
-- (Replace with actual UUID from qa-seed.ts output)
\set match_id '6ba7b814-9dad-11d1-80b4-00c04fd430c8'

-- Step 2: Verify event exists
SELECT id, event_type, match_id, professional_id, tracking_code, ip_address
FROM events
WHERE match_id = :'match_id'
  AND event_type = 'contact_click';

-- Expected: 1 row with tracking_code populated

-- Step 3: Verify PQL exists
SELECT id, match_id, professional_id, tracking_code, billing_month
FROM pqls
WHERE match_id = :'match_id';

-- Expected: 1 row with same tracking_code as event
```

**Expected Output:**
```
 id                                   | event_type    | tracking_code
--------------------------------------+---------------+--------------
 550e8400-e29b-41d4-a716-446655440001 | contact_click | QA-...-A3K9

 id                                   | tracking_code | billing_month
--------------------------------------+---------------+--------------
 550e8400-e29b-41d4-a716-446655440002 | QA-...-A3K9   | 2025-01-01
```

---

**QA-2.2: Invalid Token Rejected**

**Commands:**
```bash
# Send request with forged/invalid token
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "attribution_token": "forged.token.here",
    "fingerprint_hash": "'"$(python3 -c 'print("a"*64)')"'",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Expected Response (status 403):
# {"error": "Invalid or expired attribution token"}
```

**DB Verification:**
```sql
-- Should return 0 rows (no events created with forged token)
SELECT COUNT(*) FROM events WHERE event_data::text LIKE '%forged%';
-- Expected: 0
```

---

**QA-2.3: Idempotency Test (Duplicate Contact Clicks)**

**Commands:**
```sql
-- Setup: Use IDs from seed script
\set match_id '6ba7b814-9dad-11d1-80b4-00c04fd430c8'
\set lead_id '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
\set pro_id '550e8400-e29b-41d4-a716-446655440000'

-- Insert first contact_click (via service role, simulating /api/events)
INSERT INTO events (id, event_type, match_id, lead_id, professional_id, tracking_code)
VALUES (
  gen_random_uuid(),
  'contact_click',
  :'match_id',
  :'lead_id',
  :'pro_id',
  'IDEMPOTENT-TEST'
);

-- Insert duplicate contact_click (same match + professional)
INSERT INTO events (id, event_type, match_id, lead_id, professional_id, tracking_code)
VALUES (
  gen_random_uuid(),
  'contact_click',
  :'match_id',
  :'lead_id',
  :'pro_id',
  'IDEMPOTENT-TEST'
);

-- Verify: Only 1 PQL exists (idempotency via UNIQUE constraint)
SELECT COUNT(*) as pql_count
FROM pqls
WHERE match_id = :'match_id'
  AND professional_id = :'pro_id';

-- Expected: pql_count = 1
```

**Expected Output:**
```
 pql_count
-----------
         1
```

---

**QA-2.4: Missing IP Does Not Fail Event**

**Commands:**
```bash
# Send event without IP headers (local request, no x-forwarded-for)
# Use TOKEN_1 from seed script
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d "{
    \"attribution_token\": \"$TOKEN_1\",
    \"fingerprint_hash\": \"$(python3 -c 'print("b"*64)')\",
    \"session_id\": \"550e8400-e29b-41d4-a716-446655440001\"
  }"

# Expected Response (status 200):
# {"success": true, "event_id": "..."}
```

**DB Verification:**
```sql
-- Verify event has ip_address = null and ip_missing flag
SELECT id, ip_address, event_data->'ip_missing' as ip_missing
FROM events
WHERE event_data->>'ip_missing' = 'true'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- ip_address | ip_missing
-- null       | true
```

---

**QA-2.5: Invalid Fingerprint Falls Back to Session Rate Limit**

**Commands:**
```bash
# Send event with invalid fingerprint (not SHA256)
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d "{
    \"attribution_token\": \"$TOKEN_1\",
    \"fingerprint_hash\": \"invalid-not-sha256\",
    \"session_id\": \"550e8400-e29b-41d4-a716-446655440002\"
  }"

# Expected Response (status 200):
# {"success": true, "event_id": "..."}
```

**DB Verification:**
```sql
-- Verify event has fingerprint_hash = null
SELECT id, fingerprint_hash, session_id, event_data->'fingerprint_valid' as fp_valid
FROM events
WHERE session_id = '550e8400-e29b-41d4-a716-446655440002';

-- Expected:
-- fingerprint_hash | session_id                           | fp_valid
-- null             | 550e8400-e29b-41d4-a716-446655440002 | false
```

**Rate Limit Verification:**
```bash
# Send 6 requests with same session_id (5/5min limit for session-based)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/events \
    -H "Content-Type: application/json" \
    -d "{
      \"attribution_token\": \"$TOKEN_1\",
      \"fingerprint_hash\": \"invalid\",
      \"session_id\": \"550e8400-e29b-41d4-a716-446655440003\"
    }"
  echo ""
done

# Expected: First 5 succeed, 6th returns:
# {"error": "Rate limit (session)", "status": 429}
```

---

**QA-2.6: Rate Limiting Works (IP-Based)**

**Commands:**
```bash
# Send 11 requests with same IP (10/min limit)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/events \
    -H "Content-Type: application/json" \
    -H "x-forwarded-for: 203.0.113.100" \
    -d "{
      \"attribution_token\": \"$TOKEN_1\",
      \"fingerprint_hash\": \"$(python3 -c 'print("c"*64)')\",
      \"session_id\": \"550e8400-e29b-$(printf '%04d' $i)-a716-446655440000\"
    }"
  echo "Request $i:"
done

# Expected: First 10 succeed, 11th returns:
# {"error": "Rate limit (IP)", "status": 429}
```

---

### Deliverables

- `app/api/events/route.ts` (complete implementation)
- `__tests__/integration/event-ingestion.test.ts` (QA-2.1 through QA-2.6)
- `__tests__/integration/pql-trigger.test.ts` (idempotency test)
- `.env.example` (required environment variables)

---

## Milestone 3: Profile Pages & Contact CTA (Days 11-14)

### Goal
Professional profiles viewable, contact button tracks reliably without popup blocking.

### Tasks

1. **Professional Application Form**
   - Create `/app/apply/page.tsx` with form
   - Fields: name, email, WhatsApp, country, modality, specialties, bio
   - Submit creates professional with status='submitted'
   - Confirmation page with next steps

2. **Profile Page**
   - Create `/app/p/[slug]/page.tsx` dynamic route
   - Fetch professional data server-side (getServerSideProps or RSC)
   - Extract attribution token from `?at=` query param
   - Display profile: name, bio, modality, specialties, price, testimonials
   - If no attribution token, show "organic" view (no tracking)

3. **Contact CTA Component**
   - Create `components/ContactButton.tsx`
   - Precompute fingerprint hash on mount (useEffect)
   - Precompute session ID on mount (localStorage)
   - Use `<a href={whatsappUrl}>` (NOT window.open or button)
   - onClick fires sendBeacon synchronously (no await in click handler)
   - Fallback to fetch with keepalive
   - Show "Loading..." state until tracking ready

4. **Crypto Utility**
   - Implement client-side SHA256 function using WebCrypto API
   - Store hash in sessionStorage (not raw fingerprint)

### Definition of Done

- ✅ Professional application form submits successfully
- ✅ Profile page renders with all data
- ✅ Contact button works on all browsers (Chrome, Safari, Firefox)
- ✅ No popup blocking on iOS Safari
- ✅ Beacon fires before WhatsApp navigation
- ✅ Events appear in Supabase events table with valid tracking_code
- ✅ Fingerprint is hashed client-side (SHA256)

### QA Gates / Acceptance Criteria

**QA-3.1: Profile Page Loads with Attribution**

**Commands:**
```bash
# Use tracking_code from seed script
export TRACKING_CODE=$(grep 'Tracking Code:' qa-output.txt | awk '{print $3}')
export TOKEN_1=$(grep 'TOKEN_1=' qa-output.txt | cut -d'"' -f2)

# Visit profile page
curl http://localhost:3000/p/qa-test-pro?at=$TOKEN_1

# Expected: HTML response containing:
# - "QA Test Professional"
# - "Contactar por WhatsApp"
# - <a href="https://wa.me/+5491112345678"
```

**Browser Test (Manual):**
```
1. Open http://localhost:3000/p/qa-test-pro?at={TOKEN_1}
2. Verify: Professional name, bio, specialties displayed
3. Verify: Contact button is <a> tag (inspect element)
4. Verify: target="_blank" attribute present
5. Verify: Console shows no errors
```

---

**QA-3.2: Contact Button DOM Structure**

**Commands (Browser DevTools):**
```javascript
// Run in browser console after page load
const button = document.querySelector('a[href*="wa.me"]')

console.log('Tag:', button.tagName) // Expected: A
console.log('Target:', button.target) // Expected: _blank
console.log('Href:', button.href) // Expected: https://wa.me/...

// Verify fingerprint precomputed
console.log('Fingerprint ready:', sessionStorage.getItem('fingerprint_hash') !== null)
// Expected: true
```

**Expected Output:**
```
Tag: A
Target: _blank
Href: https://wa.me/+5491112345678?text=...
Fingerprint ready: true
```

---

**QA-3.3: No Popup Blocking (Manual Test)**

**Test Steps:**
```
1. Device: iPhone with iOS Safari
2. Open: http://localhost:3000/p/qa-test-pro?at={TOKEN_1}
3. Wait: 2 seconds for fingerprint to compute
4. Click: "Contactar por WhatsApp" button
5. Verify: WhatsApp opens in new tab (NOT blocked)
6. Verify: No browser popup blocker message

Repeat on:
- Chrome (desktop)
- Firefox (desktop)
- Safari (macOS)
- Chrome (Android)
```

**Pass Criteria:**
- WhatsApp opens on all 5 platforms
- No popup blocker warnings
- Navigation happens immediately (no delay)

---

**QA-3.4: Beacon Fires Reliably**

**Commands (Browser DevTools Network Tab):**
```
1. Open DevTools → Network tab
2. Filter: "events"
3. Visit: http://localhost:3000/p/qa-test-pro?at={TOKEN_1}
4. Wait: 2 seconds for fingerprint
5. Click: Contact button
6. Observe: POST request to /api/events appears

Expected Request:
- URL: http://localhost:3000/api/events
- Method: POST
- Content-Type: text/plain OR application/json
- Status: 200
- Response: {"success": true, "event_id": "..."}
```

**DB Verification:**
```sql
-- Verify contact_click event was created
SELECT id, event_type, match_id, tracking_code, fingerprint_hash, created_at
FROM events
WHERE event_type = 'contact_click'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: 1 row with tracking_code from seed script
```

---

**QA-3.5: Fingerprint Hashed Client-Side**

**Commands (Browser DevTools Console):**
```javascript
// After page load
const hash = sessionStorage.getItem('fingerprint_hash')

console.log('Fingerprint hash:', hash)
console.log('Is SHA256 hex:', /^[a-f0-9]{64}$/.test(hash))
console.log('Length:', hash ? hash.length : 0)

// Expected:
// Fingerprint hash: a1b2c3d4e5f6...
// Is SHA256 hex: true
// Length: 64
```

**Verify NOT raw fingerprint:**
```javascript
// Raw fingerprint would look like: "1234567890abcdef"
// Hashed is: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3..."
```

---

### Deliverables

- `app/apply/page.tsx` (application form)
- `app/p/[slug]/page.tsx` (profile page)
- `components/ContactButton.tsx` (CTA with beacon)
- `lib/crypto-utils.ts` (SHA256 client function)
- `__tests__/e2e/profile-page.spec.ts` (Playwright test)
- Manual test checklist (no popup blocking on 5 platforms)

---

## Milestone 4: Lead Intake & Matching (Days 15-18)

### Goal
Leads can be submitted, admin can create matches with signed attribution tokens, recommendations display correctly.

### Tasks

1. **Lead Intake Form**
   - Create `/app/recommend/page.tsx` with multi-step form
   - Collect: country, modality, budget, intent tags, style, urgency
   - Optional: email, WhatsApp for follow-up
   - Server Action or API route: `app/actions/create-lead.ts` OR `app/api/leads/route.ts`
   - Submit creates lead with status='new'

2. **Admin Matching Interface**
   - Create `/app/admin/matches/new/page.tsx`
   - List unmatched leads (status='new')
   - For selected lead, show filtered professionals (server-side query)
   - Admin selects 3 professionals
   - Admin writes custom reasons for each
   - Generate tracking_code: `M-${YYYYMMDD}-${4-char-random}`

3. **Attribution Token Generation**
   - Create match record in matches table
   - Generate 3 attribution tokens (one per professional)
   - Each token includes: match_id, professional_id, lead_id, tracking_code, rank
   - Store in match_recommendations table with attribution_token

4. **Recommendation Page**
   - Create `/app/r/[tracking_code]/page.tsx`
   - Fetch match + join match_recommendations + join professionals
   - Display 3 professionals with custom reasons
   - Each profile link includes `?at={attribution_token}`

5. **Professional Data Join Query**
   - Use JOIN or separate SELECT with IN clause
   - Return: professional slug, name, bio, specialties, price
   - Example in FINAL_ARCHITECTURE_v2.md section

### Definition of Done

- ✅ Lead submission form works (creates lead in DB)
- ✅ Admin can filter and select professionals
- ✅ Attribution tokens generated with tracking_code
- ✅ Recommendation page shows 3 professionals with reasons
- ✅ Profile links contain valid attribution tokens
- ✅ End-to-end flow: lead → match → recommendation → profile → contact → PQL

### QA Gates / Acceptance Criteria

**QA-4.1: Lead Submission**

**Commands (Option A: Via Server Action):**
```typescript
// If using Server Action in recommend/page.tsx
// Test with curl to form endpoint or Playwright

// Option B: Via API route (if implemented)
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "country": "AR",
    "city": "Buenos Aires",
    "online_ok": true,
    "modality_preference": ["therapy"],
    "budget_min": 200000,
    "budget_max": 700000,
    "currency": "ARS",
    "intent_tags": ["anxiety", "relationships"],
    "style_preference": ["empathetic"],
    "urgency": "this_week"
  }'

# Expected Response:
# {"success": true, "lead_id": "550e8400-..."}
```

**DB Verification:**
```sql
-- Verify lead exists
SELECT id, country, intent_tags, status, created_at
FROM leads
WHERE country = 'AR'
  AND 'anxiety' = ANY(intent_tags)
ORDER BY created_at DESC
LIMIT 1;

-- Expected: 1 row with status='new'
```

---

**QA-4.2: Token Generation (Admin Creates Match)**

**Commands:**
```typescript
// File: scripts/create-test-match.ts
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createAttributionToken } from '@/lib/attribution-tokens'

async function createTestMatch() {
  // Use IDs from seed script
  const leadId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
  const professionalId = '550e8400-e29b-41d4-a716-446655440000'

  const trackingCode = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

  // Create match
  const { data: match } = await supabaseAdmin
    .from('matches')
    .insert({
      lead_id: leadId,
      tracking_code: trackingCode,
      status: 'sent',
    })
    .select()
    .single()

  // Generate 3 tokens (simulating 3 recommendations)
  const tokens = await Promise.all([1, 2, 3].map(rank =>
    createAttributionToken({
      match_id: match.id,
      professional_id: professionalId,
      lead_id: leadId,
      tracking_code: trackingCode,
      rank,
    })
  ))

  // Store recommendations
  await supabaseAdmin.from('match_recommendations').insert(
    tokens.map((token, i) => ({
      match_id: match.id,
      professional_id: professionalId,
      rank: i + 1,
      reasons: [`Test reason ${i + 1}`],
      attribution_token: token,
    }))
  )

  console.log('Match created:', match.id)
  console.log('Tracking code:', trackingCode)
  console.log('Tokens:', tokens)
}

createTestMatch()
```

**Run:**
```bash
tsx scripts/create-test-match.ts
```

**DB Verification:**
```sql
-- Use tracking_code from script output
\set tc 'TEST-...'

-- Verify match + recommendations exist
SELECT
  m.id as match_id,
  m.tracking_code,
  mr.rank,
  mr.reasons,
  LENGTH(mr.attribution_token) as token_length
FROM matches m
JOIN match_recommendations mr ON mr.match_id = m.id
WHERE m.tracking_code = :'tc'
ORDER BY mr.rank;

-- Expected: 3 rows, token_length > 100 (JWT format)
```

---

**QA-4.3: Recommendation Page Query**

**Commands:**
```sql
-- Use tracking_code from QA-4.2
\set tc 'TEST-...'

-- Query that recommendation page uses
SELECT
  m.id AS match_id,
  m.tracking_code,
  mr.rank,
  mr.reasons,
  mr.attribution_token,
  p.id AS professional_id,
  p.slug,
  p.full_name,
  p.bio,
  p.whatsapp,
  p.specialties,
  p.price_range_min,
  p.price_range_max,
  p.currency
FROM matches m
JOIN match_recommendations mr ON mr.match_id = m.id
JOIN professionals p ON p.id = mr.professional_id
WHERE m.tracking_code = :'tc'
ORDER BY mr.rank;

-- Expected: 3 rows with ALL professional fields populated
-- Verify: slug, full_name, bio are NOT NULL
```

**Expected Output:**
```
 match_id | tracking_code | rank | professional_id | slug         | full_name
----------+---------------+------+-----------------+--------------+----------------------
 ...      | TEST-...      | 1    | ...             | qa-test-pro  | QA Test Professional
 ...      | TEST-...      | 2    | ...             | qa-test-pro  | QA Test Professional
 ...      | TEST-...      | 3    | ...             | qa-test-pro  | QA Test Professional
```

---

**QA-4.4: End-to-End Flow**

**Test Steps (Manual with Browser):**
```
1. Submit lead via /recommend form
   → Note lead_id from DB or response

2. Admin creates match via /admin/matches/new
   → Select the lead from step 1
   → Select 3 professionals
   → Write reasons
   → Submit → Note tracking_code

3. Visit /r/{tracking_code}
   → Verify: 3 professionals displayed
   → Verify: Custom reasons shown
   → Verify: Each has "View Profile" link

4. Click first professional link
   → Verify: URL is /p/{slug}?at={long_jwt_token}
   → Verify: Profile page loads

5. Click "Contactar por WhatsApp"
   → Verify: WhatsApp opens
   → Verify: No popup blocker

6. Check Supabase events table:
   SELECT * FROM events WHERE event_type = 'contact_click' ORDER BY created_at DESC LIMIT 1;
   → Verify: Row exists with tracking_code

7. Check Supabase pqls table:
   SELECT * FROM pqls WHERE tracking_code = '{from_step_2}';
   → Verify: 1 PQL row exists
```

**Pass Criteria:**
- All 7 steps complete without errors
- PQL row exists in database
- tracking_code matches throughout flow

---

### Deliverables

- `app/recommend/page.tsx` (lead intake form)
- `app/actions/create-lead.ts` OR `app/api/leads/route.ts` (lead creation endpoint)
- `app/admin/matches/new/page.tsx` (matching interface)
- `app/api/admin/matches/route.ts` (match creation endpoint)
- `app/r/[tracking_code]/page.tsx` (recommendation page)
- `lib/tracking-code.ts` (generateTrackingCode function)
- `scripts/create-test-match.ts` ✅ NEW: Helper for QA-4.2
- `__tests__/e2e/full-flow.spec.ts` (QA-4.4 automated test)

---

## Milestone 5: Billing & Adjustments (Days 19-21)

### Goal
Billing dashboard shows accurate PQL counts, adjustments workflow works, CSV export ready.

### Tasks

1. **Billing Dashboard**
   - Create `/app/admin/billing/page.tsx`
   - Display PQL summary per professional (use pqls_effective view)
   - Filter by billing month (dropdown)
   - Show: total PQLs, adjustments count, billable PQLs
   - Drill-down: click professional → see PQL list with dates, match IDs, event IDs

2. **PQL Adjustment Workflow**
   - Create `/app/api/admin/pqls/[id]/adjust/route.ts`
   - Allow admin to create adjustment: waive, dispute, refund, restore
   - Require reason (text input, min 10 chars)
   - Insert into pql_adjustments table with created_by (Clerk user ID)
   - Verify pqls_effective view updates correctly

3. **CSV Export**
   - Add "Export CSV" button to billing dashboard
   - Client-side CSV generation using papaparse or manual
   - Include columns: professional_name, email, billing_month, total_pqls, adjustments, billable_pqls
   - Filename: `hara_billing_YYYY_MM.csv`

4. **Billing Report SQL Function**
   - Verify `generate_billing_report(p_billing_month DATE)` function exists (from migration)
   - Test function via Supabase SQL editor or psql
   - Returns: professional_id, name, email, total_pqls, adjustments, billable_pqls

### Definition of Done

- ✅ Billing dashboard displays accurate PQL counts (matches generate_billing_report)
- ✅ Admin can waive/dispute PQLs with reason
- ✅ Adjustments appear in pqls_effective view immediately
- ✅ CSV export downloads with correct data
- ✅ pqls table never mutated (append-only verified)

### QA Gates / Acceptance Criteria

**QA-5.1: PQL Counts Accurate**

**Setup:**
```sql
-- Create 3 PQLs for professional from seed script
\set pro_id '550e8400-e29b-41d4-a716-446655440000'

INSERT INTO pqls (id, match_id, lead_id, professional_id, event_id, tracking_code, billing_month)
VALUES
  (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), :'pro_id', gen_random_uuid(), 'BILL-TEST-1', '2025-01-01'),
  (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), :'pro_id', gen_random_uuid(), 'BILL-TEST-2', '2025-01-01'),
  (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), :'pro_id', gen_random_uuid(), 'BILL-TEST-3', '2025-01-01');

-- Waive one PQL
INSERT INTO pql_adjustments (pql_id, adjustment_type, reason, billing_month, created_by)
VALUES (
  (SELECT id FROM pqls WHERE tracking_code = 'BILL-TEST-1'),
  'waive',
  'Test waive for QA',
  '2025-01-01',
  '00000000-0000-0000-0000-000000000001' -- Test admin ID
);
```

**Query billing report:**
```sql
-- Run billing report function
SELECT *
FROM generate_billing_report('2025-01-01'::date)
WHERE professional_id = :'pro_id';

-- Expected output:
-- professional_id | professional_name       | total_pqls | adjustments | billable_pqls
-- {pro_id}        | QA Test Professional    | 3          | 1           | 2
```

**Verify via view:**
```sql
-- Query pqls_effective view
SELECT
  professional_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE billable) as billable,
  COUNT(*) FILTER (WHERE effective_status = 'waived') as waived
FROM pqls_effective
WHERE professional_id = :'pro_id'
  AND billing_month = '2025-01-01'
GROUP BY professional_id;

-- Expected:
-- professional_id | total | billable | waived
-- {pro_id}        | 3     | 2        | 1
```

---

**QA-5.2: Append-Only Audit Trail**

**Commands:**
```sql
-- Get a PQL ID
\set pql_id (SELECT id FROM pqls WHERE tracking_code = 'BILL-TEST-2')

-- Verify pqls status BEFORE adjustment
SELECT id, status FROM pqls WHERE id = :'pql_id';
-- Expected: status = 'active'

-- Create waive adjustment
INSERT INTO pql_adjustments (pql_id, adjustment_type, reason, billing_month, created_by)
VALUES (
  :'pql_id',
  'waive',
  'Professional disputed - user never contacted',
  '2025-01-01',
  '00000000-0000-0000-0000-000000000001'
);

-- Verify pqls status AFTER adjustment (UNCHANGED - append-only)
SELECT id, status FROM pqls WHERE id = :'pql_id';
-- Expected: status = 'active' (SAME as before)

-- Verify adjustment recorded
SELECT adjustment_type, reason, created_at
FROM pql_adjustments
WHERE pql_id = :'pql_id'
ORDER BY created_at;

-- Expected: 1 row with adjustment_type='waive'

-- Restore PQL (reverse waive)
INSERT INTO pql_adjustments (pql_id, adjustment_type, reason, billing_month, created_by)
VALUES (
  :'pql_id',
  'restore',
  'Dispute resolved - user confirmed contact',
  '2025-01-01',
  '00000000-0000-0000-0000-000000000001'
);

-- Verify 2 adjustment rows exist (both preserved)
SELECT COUNT(*) FROM pql_adjustments WHERE pql_id = :'pql_id';
-- Expected: 2

-- Verify pqls table STILL unchanged
SELECT id, status FROM pqls WHERE id = :'pql_id';
-- Expected: status = 'active' (never mutated)
```

---

**QA-5.3: CSV Export**

**Commands (Browser Test):**
```
1. Login as admin
2. Visit /admin/billing?month=2025-01
3. Click "Export CSV" button
4. Verify: File downloads as hara_billing_2025_01.csv
5. Open CSV in Excel/Google Sheets
6. Verify columns:
   - professional_name
   - professional_email
   - billing_month
   - total_pqls
   - adjustments
   - billable_pqls
7. Verify data matches dashboard display
```

**Example CSV content:**
```csv
professional_name,professional_email,billing_month,total_pqls,adjustments,billable_pqls
QA Test Professional,qa-test@example.com,2025-01-01,3,1,2
```

---

### Deliverables

- `app/admin/billing/page.tsx` (billing dashboard)
- `app/api/admin/pqls/[id]/adjust/route.ts` (adjustment endpoint)
- `migrations/002_billing_functions.sql` (generate_billing_report function)
- `components/CSVExport.tsx` (client-side CSV generation)
- `__tests__/integration/billing.test.ts` (QA-5.1, QA-5.2)

---

## Milestone 6: Automation & Monitoring (Days 22-28)

### Goal
Partition creation automated, retention policy active, monitoring alerts configured.

### Tasks

1. **Partition Creation Cron**
   - Create `/app/api/cron/create-partition/route.ts`
   - Verify Vercel cron secret
   - Call `create_next_events_partition()` SQL function via service role
   - Generate partition for next month (first day of next month)
   - Configure vercel.json cron schedule (15th of each month at midnight)

2. **Retention Policy Cron**
   - Create `/app/api/cron/purge-events/route.ts`
   - Call `purge_old_events()` SQL function
   - Delete events older than retention periods (12mo for contact_click, 3mo others)
   - Schedule monthly (1st of each month at 2am)

3. **Monitoring Alerts**
   - Set up Sentry for error tracking (sentry.io)
   - Add custom logging for rate limit exceeded events
   - Add logging for PQL creation failures (trigger errors)
   - Add alert if DEFAULT partition has >1000 rows (missing monthly partition)

4. **Follow-Up Automation (Optional MVP+)**
   - Install Inngest (inngest.com)
   - Create workflow: send follow-up emails +2 days, +7 days after match sent
   - Feedback form with signed feedback token
   - Track feedback_submitted events

### Definition of Done

- ✅ Cron jobs configured in vercel.json
- ✅ Partition creation tested (can run manually)
- ✅ Retention policy tested (deletes old events)
- ✅ Sentry captures errors from /api/events
- ✅ Logs indicate rate limit hits and missing partitions

### QA Gates / Acceptance Criteria

**QA-6.1: Partition Creation Cron**

**Commands:**
```bash
# Manual trigger (simulate cron)
curl -X GET http://localhost:3000/api/cron/create-partition \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Expected Response:
# {"success": true, "partition": "events_2025_02"}
# (Partition name will be next month from current date)
```

**DB Verification:**
```sql
-- Verify partition was created
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'events_202%'
ORDER BY tablename;

-- Expected: Should include partition for next month
-- Example if run in January 2025:
-- events_2025_01
-- events_2025_02 ← Just created
-- events_2025_03
```

**Test with actual date:**
```sql
-- Insert event with future date (next month)
INSERT INTO events (id, event_type, tracking_code, created_at)
VALUES (
  gen_random_uuid(),
  'profile_view',
  'FUTURE-TEST',
  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::timestamptz
);

-- Verify: Success (no "no partition" error)
SELECT tablename
FROM pg_stat_user_tables
WHERE tablename LIKE 'events_202%'
ORDER BY tablename;

-- Partition with future month should have row_count > 0
```

---

**QA-6.2: Retention Policy Cron**

**Setup:**
```sql
-- Insert old events (simulate 4 months ago)
INSERT INTO events (id, event_type, tracking_code, created_at)
VALUES
  (gen_random_uuid(), 'profile_view', 'OLD-1', NOW() - INTERVAL '4 months'),
  (gen_random_uuid(), 'contact_click', 'OLD-2', NOW() - INTERVAL '13 months');

-- Verify inserted
SELECT tracking_code, event_type, created_at
FROM events
WHERE tracking_code LIKE 'OLD-%';

-- Expected: 2 rows
```

**Trigger retention:**
```bash
# Manual trigger
curl -X GET http://localhost:3000/api/cron/purge-events \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Expected Response:
# {"success": true, "deleted": 2}
```

**DB Verification:**
```sql
-- Verify old events deleted
SELECT COUNT(*) FROM events WHERE tracking_code = 'OLD-1';
-- Expected: 0 (profile_view older than 3 months deleted)

SELECT COUNT(*) FROM events WHERE tracking_code = 'OLD-2';
-- Expected: 0 (contact_click older than 12 months deleted)

-- Verify recent events NOT deleted
SELECT COUNT(*) FROM events WHERE created_at > NOW() - INTERVAL '1 month';
-- Expected: > 0 (recent events preserved)
```

---

**QA-6.3: Monitoring Captures Errors**

**Setup Sentry:**
```typescript
// File: lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})

// In app/api/events/route.ts
import * as Sentry from '@sentry/nextjs'

export async function POST(req: Request) {
  try {
    // ... validation logic
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'events', event_type: 'contact_click' },
      extra: { body: await req.json() },
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Trigger error:**
```bash
# Send malformed request
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"malformed": "data"}'

# Expected: 400 or 500 error
```

**Verify in Sentry dashboard:**
```
1. Login to sentry.io
2. Go to Issues
3. Verify: Error appears with stack trace
4. Verify: Request context captured (body, headers)
5. Verify: Tagged with "endpoint:events"
```

---

### Deliverables

- `app/api/cron/create-partition/route.ts`
- `app/api/cron/purge-events/route.ts`
- `vercel.json` (cron configuration)
- `lib/sentry.ts` (error tracking setup)
- `migrations/003_retention_policy.sql` (purge_old_events function)
- Sentry project configured (dashboard access)

---

## Final QA Checklist (Pre-Launch)

Run all QA gates from Milestones 1-6 in sequence. All must pass.

### Security ✅

- [ ] QA-1.1: PostgREST bypass blocked
- [ ] QA-1.3: Token validation (create, verify, reject expired/tampered)
- [ ] QA-2.2: Invalid token rejected (403)
- [ ] Admin routes protected by Clerk middleware

### Billing Correctness ✅

- [ ] QA-1.3: tracking_code in token claims
- [ ] QA-2.1: Valid token creates event + PQL
- [ ] QA-2.3: Idempotency (duplicate clicks = 1 PQL)
- [ ] QA-5.1: PQL counts accurate (billing report matches DB)
- [ ] QA-5.2: Append-only audit (pqls never mutated)

### Reliability ✅

- [ ] QA-1.2: Partition strategy (current month inserts work)
- [ ] QA-1.4: IP extraction resilient (returns null, no error)
- [ ] QA-2.4: Missing IP does not fail event
- [ ] QA-2.5: Invalid fingerprint falls back to session_id
- [ ] QA-3.3: No popup blocking on iOS Safari

### Testing ✅

- [ ] All unit tests pass (`npm test`)
- [ ] All integration tests pass
- [ ] E2E test passes (QA-4.4)
- [ ] Test coverage >80% for billing code

### Operational ✅

- [ ] QA-6.1: Partition creation cron works
- [ ] QA-6.2: Retention policy cron works
- [ ] QA-6.3: Sentry captures errors
- [ ] CSV export works (QA-5.3)

---

## Success Metrics (Post-Launch)

**Week 1:**
- 10 real leads submitted
- 10 matches created
- 5 contact_clicks (PQLs)
- 0 PQL creation failures
- 0 RLS bypass attempts

**Week 2:**
- 50 leads, 50 matches, 25 PQLs
- <1% event insertion failures
- Admin generates billing report successfully

**Week 4:**
- 200 leads, 200 matches, 100 PQLs
- Attribution integrity: 100% (all PQLs have valid tracking_code)
- Partition creation runs successfully
- Retention policy runs successfully

---

## Rollback Plan

If critical issues discovered:

1. **PQL integrity issue** → Pause new match creation, audit existing PQLs
2. **Rate limiting failure** → Disable temporarily, deploy fix, re-enable
3. **Partition missing** → DEFAULT partition catches rows, create partition manually
4. **Token validation bypass** → Rotate secret, invalidate old tokens
5. **RLS bypass** → Revoke anon key, regenerate, redeploy

---

**This operational plan provides executable QA gates for production-ready implementation.**
