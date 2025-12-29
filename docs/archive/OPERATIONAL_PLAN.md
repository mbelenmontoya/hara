# Hará Match - Operational Implementation Plan

**Purpose:** Measurable milestones with QA gates for production-ready implementation
**Timeline:** 4 weeks (160 hours solo builder)
**Priority:** Billing correctness and security first

---

## Milestone 1: Foundation & Security (Days 1-7)

### Goal
Database schema deployed, RLS lockdown complete, attribution tokens working, PostgREST bypass blocked.

### Tasks

1. **Database Setup**
   - Create Supabase project (production + local dev)
   - Run initial migration (schema + RLS + triggers)
   - Create DEFAULT partition + current/next 2 months partitions
   - Verify partitions exist: `SELECT * FROM pg_tables WHERE tablename LIKE 'events_%'`

2. **Attribution Token Library**
   - Implement `createAttributionToken()` with tracking_code in claims
   - Implement `verifyAttributionToken()` with jose library
   - Generate ATTRIBUTION_TOKEN_SECRET (32+ bytes)
   - Store in environment variables (Vercel/local)

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
- ✅ DEFAULT partition + 3 monthly partitions exist
- ✅ Attribution token can be created and verified
- ✅ IP extraction returns null (not error) when missing
- ✅ Fingerprint validation rejects invalid formats
- ✅ Admin can authenticate via Clerk

### QA Gates / Acceptance Criteria

**QA-1.1: PostgREST Bypass Test (CRITICAL)**
```typescript
// Test: Attempt to insert event via anon key
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const { error } = await anonClient.from('events').insert({
  event_type: 'contact_click',
  match_id: 'fake-id',
  professional_id: 'fake-id',
  tracking_code: 'fake',
})

// Expected: error.message contains 'denied' or 'policy'
// If this test passes (no error), FAIL milestone - RLS not configured correctly
```

**QA-1.2: Partition Strategy Test**
```sql
-- Test: Insert event for current month
INSERT INTO events (event_type, tracking_code, created_at)
VALUES ('profile_view', 'TEST', NOW());

-- Expected: Success (no "no partition" error)
-- Verify: Row exists in appropriate partition or DEFAULT
SELECT * FROM events WHERE tracking_code = 'TEST';
```

**QA-1.3: Token Validation Test**
```typescript
// Test: Create token with tracking_code
const token = await createAttributionToken({
  match_id: 'test',
  professional_id: 'test',
  lead_id: 'test',
  tracking_code: 'TEST-001',
  rank: 1,
})

// Verify: Token can be decoded
const decoded = await verifyAttributionToken(token)
assert(decoded.tracking_code === 'TEST-001')

// Test: Expired token rejected
const expiredToken = 'eyJ...' // Manually expired
const result = await verifyAttributionToken(expiredToken)
assert(result === null)
```

**QA-1.4: IP Extraction Resilience Test**
```typescript
// Test: Missing IP headers
const req = new Request('http://localhost')
const ip = extractClientIP(req)
assert(ip === null) // Should NOT throw error

// Test: x-forwarded-for with multiple IPs
const req2 = new Request('http://localhost', {
  headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
})
const ip2 = extractClientIP(req2)
assert(ip2 === '1.2.3.4') // First IP
```

**QA-1.5: Fingerprint Validation Test**
```typescript
// Test: Valid SHA256
const valid = 'a'.repeat(64)
assert(validateFingerprint(valid) === valid)

// Test: Invalid format
assert(validateFingerprint('not-sha256') === null)
assert(validateFingerprint('A'.repeat(64)) === null) // Uppercase
assert(validateFingerprint('a'.repeat(63)) === null) // Too short
```

### Deliverables

- `migrations/001_initial_schema.sql` (schema + RLS + triggers + partitions)
- `lib/attribution-tokens.ts` (create/verify functions)
- `lib/validation.ts` (IP, fingerprint, session ID validation)
- `lib/crypto-utils.ts` (sha256 function)
- `lib/supabase-admin.ts` (service role client)
- `lib/rate-limit.ts` (Upstash Redis wrapper)
- `middleware.ts` (Clerk admin protection)
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
   - Create `/api/events` route
   - Handle text/plain and application/json content types
   - Validate attribution token (call verifyAttributionToken)
   - Extract and validate IP (extractClientIP)
   - Validate fingerprint_hash and session_id
   - Apply rate limiting (IP + fingerprint/session fallback)
   - Insert event via service role client
   - Handle errors gracefully (return 500, log to console)

2. **Event Insertion Logic**
   - Use token claims for match_id, lead_id, professional_id, tracking_code
   - Store ip_address as nullable (null if missing)
   - Store fingerprint_hash only if valid format
   - Log missing/invalid identifiers in event_data JSONB
   - Ensure tracking_code is NOT NULL (from token)

3. **Trigger Verification**
   - Verify trigger `create_pql_from_contact_click` fires on insert
   - Verify PQL row appears in pqls table
   - Verify tracking_code populated in PQL
   - Test idempotency (insert duplicate event, only 1 PQL created)

### Definition of Done

- ✅ `/api/events` endpoint accepts POST with valid token
- ✅ Invalid/expired token returns 403
- ✅ Missing IP does NOT fail request (stores null)
- ✅ Invalid fingerprint does NOT fail request (stores null, uses session_id)
- ✅ Rate limits enforced (429 response)
- ✅ PQL created automatically by trigger
- ✅ Duplicate events do NOT create duplicate PQLs

### QA Gates / Acceptance Criteria

**QA-2.1: Valid Token Creates Event & PQL**
```bash
# Test: Send valid attribution token
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "attribution_token": "<valid_jwt>",
    "fingerprint_hash": "'"$(python3 -c "print('a'*64)")"'",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Expected: {"success": true, "event_id": "..."}
# Verify in DB:
# 1. Event exists in events table with tracking_code populated
# 2. PQL exists in pqls table with same tracking_code
```

**QA-2.2: Invalid Token Rejected**
```bash
# Test: Send forged token
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"attribution_token": "forged.token.here"}'

# Expected: {"error": "Invalid or expired token"}, status 403
```

**QA-2.3: Idempotency Test**
```sql
-- Setup: Create test match/lead/professional
INSERT INTO leads (id, country, intent_tags) VALUES ('lead-1', 'AR', ARRAY['anxiety']);
INSERT INTO professionals (id, slug, full_name, email, whatsapp, country, modality, specialties, status)
VALUES ('pro-1', 'test', 'Test', 'test@test.com', '123', 'AR', ARRAY['therapy'], ARRAY['anxiety'], 'active');
INSERT INTO matches (id, lead_id, tracking_code) VALUES ('match-1', 'lead-1', 'TEST-001');

-- Test: Insert 2 contact_click events with same match_id + professional_id
INSERT INTO events (event_type, match_id, lead_id, professional_id, tracking_code)
VALUES ('contact_click', 'match-1', 'lead-1', 'pro-1', 'TEST-001');

INSERT INTO events (event_type, match_id, lead_id, professional_id, tracking_code)
VALUES ('contact_click', 'match-1', 'lead-1', 'pro-1', 'TEST-001');

-- Verify: Only 1 PQL exists
SELECT COUNT(*) FROM pqls WHERE match_id = 'match-1' AND professional_id = 'pro-1';
-- Expected: 1
```

**QA-2.4: Missing IP Does Not Fail**
```bash
# Test: Send event without IP headers (local request)
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "attribution_token": "<valid_jwt>",
    "fingerprint_hash": "'"$(python3 -c "print('a'*64)")"'",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Expected: {"success": true} (NOT 400 error)
# Verify: Event has ip_address = null in DB
SELECT ip_address, event_data FROM events WHERE id = '<event_id>';
-- Expected: ip_address | event_data
--           null       | {"ip_missing": true}
```

**QA-2.5: Invalid Fingerprint Falls Back to Session**
```bash
# Test: Send invalid fingerprint
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "attribution_token": "<valid_jwt>",
    "fingerprint_hash": "invalid-not-sha256",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Expected: {"success": true}
# Verify: fingerprint_hash = null, session_id populated
# Verify: Rate limit key used session_id (not fingerprint)
```

**QA-2.6: Rate Limiting Works**
```bash
# Test: Send 11 requests in 1 minute from same IP
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/events \
    -H "Content-Type: application/json" \
    -H "x-forwarded-for: 1.2.3.4" \
    -d '{"attribution_token": "<valid_jwt>", ...}'
done

# Expected: First 10 succeed, 11th returns {"error": "Rate limit (IP)"}, status 429
```

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
   - Create `/apply` page with form
   - Fields: name, email, WhatsApp, country, modality, specialties, bio
   - Submit creates professional with status='submitted'
   - Admin approval workflow (manual via Supabase Studio for MVP)

2. **Profile Page**
   - Create `/p/[slug]` dynamic route
   - Fetch professional data (server-side)
   - Extract attribution token from `?at=` query param
   - Display profile: name, bio, modality, specialties, price range, testimonials

3. **Contact CTA Component**
   - Precompute fingerprint hash on mount (useEffect)
   - Precompute session ID on mount (localStorage)
   - Use `<a>` link (not window.open) with WhatsApp URL
   - onClick fires sendBeacon synchronously (no await)
   - Fallback to fetch with keepalive
   - Test on iOS Safari (no popup blocking)

4. **Crypto Utility**
   - Implement client-side SHA256 function
   - Use browser WebCrypto API (crypto.subtle.digest)
   - Store hash in sessionStorage (not raw fingerprint)

### Definition of Done

- ✅ Professional application form submits successfully
- ✅ Profile page renders with all data
- ✅ Contact button works on all browsers (Chrome, Safari, Firefox)
- ✅ No popup blocking on iOS Safari
- ✅ Beacon fires before WhatsApp navigation
- ✅ Events appear in Supabase events table
- ✅ Fingerprint is hashed client-side (SHA256)

### QA Gates / Acceptance Criteria

**QA-3.1: Profile Page Loads**
```bash
# Test: Visit profile page with attribution token
curl http://localhost:3000/p/test-pro?at=<valid_jwt>

# Expected: HTML response with professional name, bio, contact button
# Verify: attribution token stored in component state (not visible to user)
```

**QA-3.2: Contact Button Pattern**
```typescript
// Test: Inspect DOM structure
const contactButton = document.querySelector('a[href*="wa.me"]')

// Verify:
assert(contactButton.tagName === 'A') // Not a button
assert(contactButton.target === '_blank')
assert(contactButton.href.includes('wa.me'))

// Verify: Fingerprint precomputed on mount
assert(sessionStorage.getItem('fingerprint_hash') !== null)
```

**QA-3.3: No Popup Blocking (Manual Test)**
```
1. Open profile page on iOS Safari
2. Click "Contactar por WhatsApp"
3. Verify: WhatsApp opens in new tab (NOT blocked)
4. Verify: No browser popup blocker message
5. Repeat test on Chrome, Firefox
```

**QA-3.4: Beacon Fires (Manual Test)**
```
1. Open profile page with ?at=<token>
2. Open browser DevTools Network tab
3. Click contact button
4. Verify: POST request to /api/events appears
5. Verify: Request uses "text/plain" or "application/json" Content-Type
6. Verify: Response is 200 OK
7. Check Supabase events table: row exists
```

**QA-3.5: Fingerprint Hashed Client-Side**
```typescript
// Test: Check sessionStorage after page load
const hash = sessionStorage.getItem('fingerprint_hash')

// Verify:
assert(hash !== null)
assert(/^[a-f0-9]{64}$/.test(hash)) // SHA256 hex format
assert(hash !== 'raw-fingerprint-value') // NOT raw value
```

### Deliverables

- `app/apply/page.tsx` (application form)
- `app/p/[slug]/page.tsx` (profile page)
- `components/ContactButton.tsx` (CTA component with beacon)
- `lib/crypto-utils.ts` (SHA256 client function)
- `__tests__/e2e/profile-page.spec.ts` (Playwright test)
- Manual test checklist (no popup blocking)

---

## Milestone 4: Lead Intake & Matching (Days 15-18)

### Goal
Admin can create matches with signed attribution tokens, recommendations display correctly.

### Tasks

1. **Lead Intake Form**
   - Create `/recommend` page with multi-step form
   - Collect: country, modality, budget, intent tags, style, urgency
   - Optional: email, WhatsApp for follow-up
   - Submit creates lead with status='new'

2. **Admin Matching Interface**
   - Create `/admin/matches/new` page
   - List unmatched leads
   - For selected lead, show filtered professionals (server-side query)
   - Admin selects 3 professionals
   - Admin writes custom reasons for each
   - Generate tracking_code (e.g., `M-20250101-A3K9`)

3. **Attribution Token Generation**
   - Create match record in matches table
   - Generate 3 attribution tokens (one per professional)
   - Each token includes: match_id, professional_id, lead_id, tracking_code, rank
   - Store in match_recommendations table with attribution_token

4. **Recommendation Page**
   - Create `/r/[tracking_code]` page
   - Fetch match + recommendations (with professional data joined)
   - Display 3 professionals with custom reasons
   - Each profile link includes `?at={attribution_token}`

5. **Professional Data Join**
   - Update recommendation query to fetch professional data
   - Use JOIN or separate query with IN clause
   - Return professional slug for link generation

### Definition of Done

- ✅ Lead submission form works
- ✅ Admin can filter and select professionals
- ✅ Attribution tokens generated with tracking_code
- ✅ Recommendation page shows 3 professionals
- ✅ Profile links contain attribution tokens
- ✅ End-to-end flow: lead → match → recommendation → profile → contact → PQL

### QA Gates / Acceptance Criteria

**QA-4.1: Lead Submission**
```bash
# Test: Submit lead
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "country": "AR",
    "intent_tags": ["anxiety", "relationships"],
    "budget_max": 5000,
    "currency": "ARS"
  }'

# Expected: {"success": true, "lead_id": "..."}
# Verify: Lead exists in leads table with status='new'
```

**QA-4.2: Token Generation**
```typescript
// Test: Admin creates match
const match = await supabaseAdmin.from('matches').insert({
  lead_id: 'lead-1',
  tracking_code: 'TEST-001',
}).select().single()

// Generate tokens for 3 professionals
const tokens = await Promise.all([
  createAttributionToken({
    match_id: match.id,
    professional_id: 'pro-1',
    lead_id: 'lead-1',
    tracking_code: 'TEST-001', // ✅ Included
    rank: 1,
  }),
  // ... 2 more
])

// Verify: Tokens are valid JWTs
tokens.forEach(token => {
  const decoded = jwt.decode(token)
  assert(decoded.tracking_code === 'TEST-001')
})
```

**QA-4.3: Recommendation Query**
```sql
-- Test: Fetch recommendation page data
SELECT
  m.id AS match_id,
  m.tracking_code,
  mr.rank,
  mr.reasons,
  mr.attribution_token,
  p.id AS professional_id,
  p.slug,
  p.full_name,
  p.bio
FROM matches m
JOIN match_recommendations mr ON mr.match_id = m.id
JOIN professionals p ON p.id = mr.professional_id
WHERE m.tracking_code = 'TEST-001'
ORDER BY mr.rank;

-- Expected: 3 rows with all professional data
-- Verify: professional_id, slug, full_name are NOT NULL
```

**QA-4.4: End-to-End Flow**
```
1. Submit lead via form → lead_id generated
2. Admin creates match with 3 professionals → tracking_code generated
3. Visit /r/{tracking_code} → 3 professionals displayed
4. Click first profile → URL is /p/{slug}?at={token}
5. Click contact button → Event fires
6. Check pqls table → PQL exists with tracking_code
```

### Deliverables

- `app/recommend/page.tsx` (lead intake form)
- `app/api/leads/route.ts` (lead submission endpoint)
- `app/admin/matches/new/page.tsx` (matching interface)
- `app/api/admin/matches/route.ts` (match creation endpoint)
- `app/r/[tracking_code]/page.tsx` (recommendation page)
- `lib/tracking-code.ts` (generateTrackingCode function)
- `__tests__/e2e/full-flow.spec.ts` (QA-4.4 test)

---

## Milestone 5: Billing & Adjustments (Days 19-21)

### Goal
Billing dashboard shows accurate PQL counts, adjustments workflow works, CSV export ready.

### Tasks

1. **Billing Dashboard**
   - Create `/admin/billing` page
   - Display PQL summary per professional (use pqls_effective view)
   - Filter by billing month
   - Show: total PQLs, adjustments count, billable PQLs
   - Drill-down: click professional → see PQL list with dates, match IDs

2. **PQL Adjustment Workflow**
   - Create `/admin/pqls/[id]/adjust` endpoint
   - Allow admin to create adjustment: waive, dispute, refund, restore
   - Require reason (text input)
   - Insert into pql_adjustments table with created_by (Clerk user ID)
   - Verify pqls_effective view updates correctly

3. **CSV Export**
   - Add "Export CSV" button to billing dashboard
   - Client-side CSV generation (no server endpoint needed)
   - Include columns: professional name, email, billing month, billable PQLs, adjustments
   - Filename: `billing_YYYY_MM.csv`

4. **Billing Report Function**
   - Create SQL function `generate_billing_report(p_billing_month DATE)`
   - Returns: professional_id, name, email, total_pqls, adjustments, billable_pqls
   - Test function via Supabase SQL editor

### Definition of Done

- ✅ Billing dashboard displays accurate PQL counts
- ✅ Admin can waive/dispute PQLs
- ✅ Adjustments appear in pqls_effective view
- ✅ CSV export downloads successfully
- ✅ Audit trail preserved (pqls never mutated)

### QA Gates / Acceptance Criteria

**QA-5.1: PQL Counts Accurate**
```sql
-- Setup: Create 3 PQLs for professional
INSERT INTO pqls (match_id, lead_id, professional_id, event_id, tracking_code, billing_month)
VALUES
  ('m1', 'l1', 'pro-1', 'e1', 'T1', '2025-01-01'),
  ('m2', 'l1', 'pro-1', 'e2', 'T2', '2025-01-01'),
  ('m3', 'l1', 'pro-1', 'e3', 'T3', '2025-01-01');

-- Waive one PQL
INSERT INTO pql_adjustments (pql_id, adjustment_type, reason, billing_month, created_by)
VALUES ((SELECT id FROM pqls WHERE tracking_code = 'T1'), 'waive', 'Test', '2025-01-01', 'admin-1');

-- Query billing report
SELECT * FROM generate_billing_report('2025-01-01'::date) WHERE professional_id = 'pro-1';

-- Expected:
-- professional_id | professional_name | total_pqls | adjustments | billable_pqls
-- pro-1           | Test Pro          | 3          | 1           | 2
```

**QA-5.2: Append-Only Audit Trail**
```sql
-- Test: Waive PQL
INSERT INTO pql_adjustments (pql_id, adjustment_type, reason, billing_month, created_by)
VALUES ('pql-1', 'waive', 'User never contacted', '2025-01-01', 'admin-1');

-- Verify: pqls table NOT mutated
SELECT status FROM pqls WHERE id = 'pql-1';
-- Expected: 'active' (unchanged)

-- Verify: Adjustment recorded
SELECT * FROM pql_adjustments WHERE pql_id = 'pql-1';
-- Expected: 1 row with adjustment_type='waive'

-- Restore PQL
INSERT INTO pql_adjustments (pql_id, adjustment_type, reason, billing_month, created_by)
VALUES ('pql-1', 'restore', 'Dispute resolved', '2025-01-01', 'admin-1');

-- Verify: 2 adjustment rows exist (both preserved)
SELECT COUNT(*) FROM pql_adjustments WHERE pql_id = 'pql-1';
-- Expected: 2
```

**QA-5.3: CSV Export**
```bash
# Test: Download CSV
curl http://localhost:3000/admin/billing/export?month=2025-01-01 \
  -H "Authorization: Bearer <admin_token>"

# Expected: CSV file with headers:
# professional_name,professional_email,billing_month,total_pqls,adjustments,billable_pqls
# Test Pro,test@example.com,2025-01-01,3,1,2
```

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
   - Create `/api/cron/create-partition` endpoint
   - Verify Vercel cron secret
   - Call `create_next_events_partition()` SQL function
   - Generate partition for next month
   - Configure vercel.json cron schedule (15th of each month)

2. **Retention Policy Cron**
   - Create `/api/cron/purge-events` endpoint
   - Call `purge_old_events()` SQL function
   - Delete events older than retention periods
   - Schedule monthly (1st of each month)

3. **Monitoring Alerts**
   - Set up Sentry for error tracking
   - Add rate limit exceeded logs
   - Add PQL creation failure logs
   - Add missing partition warnings (if DEFAULT has >1000 rows)

4. **Follow-Up Automation (Optional MVP+)**
   - Inngest workflow: send follow-up emails +2 days, +7 days
   - Feedback form with signed token
   - Track feedback_submitted events

### Definition of Done

- ✅ Cron jobs configured in vercel.json
- ✅ Partition creation tested (can run manually)
- ✅ Retention policy tested (deletes old events)
- ✅ Sentry captures errors
- ✅ Logs indicate rate limit hits

### QA Gates / Acceptance Criteria

**QA-6.1: Partition Creation**
```bash
# Test: Manually trigger partition creation
curl -X GET http://localhost:3000/api/cron/create-partition \
  -H "Authorization: Bearer <CRON_SECRET>"

# Expected: {"success": true, "partition": "events_2025_04"}
# Verify: Partition exists
SELECT tablename FROM pg_tables WHERE tablename = 'events_2025_04';
-- Expected: events_2025_04
```

**QA-6.2: Retention Policy**
```sql
-- Setup: Insert old event
INSERT INTO events (event_type, tracking_code, created_at)
VALUES ('profile_view', 'OLD', NOW() - INTERVAL '4 months');

-- Trigger retention
SELECT purge_old_events();

-- Verify: Old event deleted
SELECT COUNT(*) FROM events WHERE tracking_code = 'OLD';
-- Expected: 0
```

**QA-6.3: Monitoring Captures Errors**
```typescript
// Test: Trigger error in /api/events
// (send request with missing required field)

// Check Sentry dashboard:
// - Error appears in Issues
// - Stack trace includes /api/events/route.ts
// - Request context captured (headers, body)
```

### Deliverables

- `app/api/cron/create-partition/route.ts`
- `app/api/cron/purge-events/route.ts`
- `vercel.json` (cron configuration)
- `lib/sentry.ts` (error tracking setup)
- `migrations/003_retention_policy.sql` (purge_old_events function)
- Monitoring dashboard (Sentry project)

---

## Final QA Checklist (Pre-Launch)

### Security

- [ ] PostgREST bypass blocked (QA-1.1 passes)
- [ ] Attribution tokens use HS256 (not HS512 or RS256)
- [ ] ATTRIBUTION_TOKEN_SECRET is 32+ bytes
- [ ] Service role key NEVER exposed to client
- [ ] Admin routes protected by Clerk middleware
- [ ] Rate limiting enforced (IP + fingerprint)
- [ ] RLS policies deny anon/authenticated writes

### Billing Correctness

- [ ] tracking_code populated in events and pqls (QA-2.1)
- [ ] PQL trigger creates exactly one PQL per (match, professional) (QA-2.3)
- [ ] Duplicate contact_clicks do NOT create duplicate PQLs
- [ ] Adjustments are append-only (pqls never mutated) (QA-5.2)
- [ ] Billing report shows accurate counts (QA-5.1)
- [ ] CSV export includes all PQL details

### Reliability

- [ ] Missing IP does not fail event (QA-2.4)
- [ ] Invalid fingerprint falls back to session_id (QA-2.5)
- [ ] DEFAULT partition catches events if monthly partition missing
- [ ] Current month partition exists (QA-1.2)
- [ ] No popup blocking on iOS Safari (QA-3.3)
- [ ] Beacon fires reliably (QA-3.4)

### Testing

- [ ] All unit tests pass (attribution tokens, validation)
- [ ] All integration tests pass (RLS, PQL trigger, idempotency)
- [ ] E2E test passes (full flow from lead to PQL)
- [ ] CI pipeline runs all tests automatically
- [ ] Test coverage >80% for billing code

### Privacy & Compliance

- [ ] Fingerprints hashed client-side (SHA256) (QA-3.5)
- [ ] Raw fingerprints never sent to server
- [ ] IP addresses stored for billing audit only
- [ ] Retention policy active (purges old events)
- [ ] Privacy policy defines data handling

### Operational

- [ ] Partition creation cron scheduled (QA-6.1)
- [ ] Retention policy cron scheduled (QA-6.2)
- [ ] Sentry error tracking configured (QA-6.3)
- [ ] Admin can access billing dashboard
- [ ] CSV export downloads successfully (QA-5.3)

---

## Success Metrics (Post-Launch)

**Week 1:**
- 10 real leads submitted
- 10 matches created
- 5 contact_clicks (PQLs)
- 0 PQL creation failures
- 0 RLS bypass attempts logged

**Week 2:**
- 50 leads submitted
- 50 matches created
- 25 contact_clicks (PQLs)
- <1% event insertion failures
- Admin can generate billing report

**Week 4:**
- 200 leads submitted
- 200 matches created
- 100 contact_clicks (PQLs)
- Attribution integrity: 100% (all PQLs have valid tracking_code)
- Partition creation runs successfully
- Retention policy runs successfully

---

## Rollback Plan

If critical issues discovered in production:

1. **PQL integrity issue** → Pause new match creation, audit existing PQLs
2. **Rate limiting failure** → Temporarily disable rate limits, deploy fix, re-enable
3. **Partition missing** → DEFAULT partition catches rows, create partition manually
4. **Token validation bypass** → Rotate secret, invalidate all old tokens, regenerate
5. **RLS bypass discovered** → Emergency: revoke anon key, regenerate, redeploy

**Incident Response:**
- All P0 issues require fix within 24 hours
- All P1 issues require fix within 1 week
- Weekly reconciliation job detects orphan events (contact_clicks without PQLs)

---

**This operational plan provides measurable QA gates for production-ready implementation.**
