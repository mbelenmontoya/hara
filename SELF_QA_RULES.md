# Self-QA Rules for Hará Match

**Purpose:** Validate implementation against production requirements
**Run:** After each milestone, before merge to main

---

## Rule 1: PostgREST Bypass MUST Fail (RLS)

**Command (Automated):**
```bash
npm run qa:rls-bypass
```

**PASS Output:**
```
🔒 Testing RLS Bypass Prevention...

✅ PASS: events - blocked by RLS
✅ PASS: pqls - blocked by RLS
✅ PASS: match_recommendations - blocked by RLS
✅ PASS: matches - blocked by RLS
✅ PASS: pql_adjustments - blocked by RLS

==================================================
✅ ALL TESTS PASSED - RLS blocking works correctly
```

**FAIL Output:**
```
❌ FAIL: events - INSERT SUCCEEDED (RLS bypass detected!)
```

**If FAIL:** → **FIX RLS POLICIES IMMEDIATELY** (check migrations/001_schema.sql)

---

## Rule 2: Seed Creates 3 Distinct Professionals

**Command:**
```bash
tsx scripts/qa-seed.ts > qa.env
source qa.env
```

**PASS:**
```sql
-- Check distinct professionals in match_recommendations
psql $DATABASE_URL -c "
  SELECT COUNT(*) as total, COUNT(DISTINCT professional_id) as distinct
  FROM match_recommendations WHERE match_id = '$MATCH_ID';
"
-- Expected: total=3, distinct=3
```

**FAIL:** total=3, distinct=1 → **FIX SEED SCRIPT** (violates UNIQUE constraint)

---

## Rule 3: Valid Token → Exactly 1 Event + Exactly 1 PQL

**Command:**
```bash
source qa.env

# Send contact_click with TOKEN_1
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d "{
    \"attribution_token\": \"$TOKEN_1\",
    \"fingerprint_hash\": \"$(printf 'a%.0s' {1..64})\",
    \"session_id\": \"550e8400-e29b-41d4-a716-446655440000\"
  }"

# Expected: {"success":true,"event_id":"..."}
```

**PASS:**
```sql
psql $DATABASE_URL <<EOF
\set match_id '$MATCH_ID'
\set pro_id '$PRO_1_ID'

-- Exactly 1 event
SELECT COUNT(*) FROM events WHERE match_id = :'match_id' AND professional_id = :'pro_id' AND event_type = 'contact_click';
-- Expected: 1

-- Exactly 1 PQL
SELECT COUNT(*) FROM pqls WHERE match_id = :'match_id' AND professional_id = :'pro_id';
-- Expected: 1

EOF
```

**FAIL:** COUNT ≠ 1 → **FIX /api/events or trigger**

**Idempotency Test:**
```bash
# Send same token again
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d "{\"attribution_token\":\"$TOKEN_1\",\"fingerprint_hash\":\"$(printf 'b%.0s' {1..64})\",\"session_id\":\"550e8400-e29b-41d4-a716-446655440001\"}"

# Still exactly 1 PQL (idempotency)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pqls WHERE match_id='$MATCH_ID' AND professional_id='$PRO_1_ID';"
# Expected: 1 (not 2)
```

---

## Rule 4: Partition Insert Works with NOW()

**Command:**
```sql
psql $DATABASE_URL <<EOF
INSERT INTO events (id, event_type, tracking_code, created_at)
VALUES (gen_random_uuid(), 'profile_view', 'PARTITION-TEST', NOW())
RETURNING id, created_at;

-- Verify row inserted
SELECT COUNT(*) FROM events WHERE tracking_code = 'PARTITION-TEST';
-- Expected: 1

EOF
```

**PASS:** INSERT succeeds, COUNT=1
**FAIL:** ERROR "no partition of relation" → **FIX partition creation** (add DEFAULT or create current month partition)

---

## Rule 5: Invalid tracking_code Rejected

**Command:**
```typescript
// __tests__/unit/attribution-tokens.test.ts
import { SignJWT } from 'jose'
import { verifyAttributionToken } from '@/lib/attribution-tokens'

test('rejects token with invalid tracking_code', async () => {
  const SECRET = new TextEncoder().encode(process.env.ATTRIBUTION_TOKEN_SECRET!)

  // Create token with invalid tracking_code (special chars, too long)
  const badToken = await new SignJWT({
    match_id: '550e8400-e29b-41d4-a716-446655440000',
    professional_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    lead_id: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
    tracking_code: 'BAD$CODE!@#' + 'X'.repeat(100), // Invalid chars + too long
    rank: 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)

  const result = await verifyAttributionToken(badToken)
  expect(result).toBeNull()
})
```

**PASS:** Test passes (result is null)
**FAIL:** Test fails (result is not null) → **FIX verifyAttributionToken** (add tracking_code regex validation)

---

## Rule 6: Rate Limiting Works

**Command:**
```bash
source qa.env

# Send 11 requests from same IP (limit: 10/min)
for i in {1..11}; do
  RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/events \
    -H "Content-Type: application/json" \
    -H "x-forwarded-for: 203.0.113.100" \
    -d "{
      \"attribution_token\": \"$TOKEN_2\",
      \"fingerprint_hash\": \"$(printf 'c%.0s' {1..64})\",
      \"session_id\": \"550e8400-e29b-$(printf '%04d' $i)-a716-446655440000\"
    }")
  echo "Request $i: HTTP $RESP"
done

# Expected output:
# Request 1: HTTP 200
# ...
# Request 10: HTTP 200
# Request 11: HTTP 429
```

**PASS:** 11th request returns 429
**FAIL:** All requests return 200 → **FIX rate limiting** (check Upstash Redis config)

---

## Rule 7: Reconciliation Returns 0 Orphan PQLs

**Command:**
```bash
# Run reconciliation via service role (function requires service_role grant)
psql $DATABASE_URL <<EOF
-- Run as service role or via Supabase SQL editor
SELECT * FROM check_pql_event_integrity();

-- Expected: 0 rows (no orphan PQLs)
-- If rows returned, PQLs reference events that don't exist or have mismatched timestamps

EOF
```

**Alternative (via API endpoint):**
```bash
# If you create /api/admin/reconciliation endpoint
curl -X GET http://localhost:3000/api/admin/reconciliation \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: {"orphans": 0}
```

**PASS:** 0 rows returned
**FAIL:** >0 rows → **FIX** (investigate why PQLs exist without matching events, check trigger inserts event_created_at correctly)

---

## Pre-Merge Checklist

Before merging to main:

- [ ] All 7 rules pass
- [ ] Unit tests pass: `npm test`
- [ ] Integration tests pass
- [ ] E2E test passes (Playwright)
- [ ] FINAL_SPEC.md matches actual code
- [ ] No deprecated documents referenced in code comments

---

## Drift Prevention

**If you change architecture:**

1. Update FINAL_SPEC.md FIRST
2. Update IMPLEMENTATION_PLAN.md
3. Re-run all 7 rules
4. Update tests

**Never** commit code changes without updating FINAL_SPEC.md.

---

## Quick Validation (5 minutes)

```bash
# 1. Run seed
tsx scripts/qa-seed.ts > qa.env && source qa.env

# 2. Verify 3 professionals
psql $DATABASE_URL -c "SELECT COUNT(DISTINCT professional_id) FROM match_recommendations WHERE match_id='$MATCH_ID';"
# Expected: 3

# 3. Send valid token
curl -X POST localhost:3000/api/events -d "{\"attribution_token\":\"$TOKEN_1\",\"fingerprint_hash\":\"$(printf 'a%.0s' {1..64})\",\"session_id\":\"550e8400-e29b-41d4-a716-446655440000\"}"

# 4. Verify PQL created
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pqls WHERE match_id='$MATCH_ID' AND professional_id='$PRO_1_ID';"
# Expected: 1

# 5. Check reconciliation
psql $DATABASE_URL -c "SELECT COUNT(*) FROM check_pql_event_integrity();"
# Expected: 0
```

**All 5 checks pass = production-ready.**
