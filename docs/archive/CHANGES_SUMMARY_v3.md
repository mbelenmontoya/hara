# Changes Summary: v2 → v3 (Production-Ready)

**From:** FINAL_ARCHITECTURE_v2.md + OPERATIONAL_PLAN_v2.md
**To:** FINAL_ARCHITECTURE_v3.md + OPERATIONAL_PLAN_v3.md + CRITICAL_PATCHES_v3.md
**Status:** All P0 blockers resolved, production-ready

---

## Critical Fixes Applied

### Patch A: match_recommendations UNIQUE Constraint (BLOCKER) ✅

**Problem:** v2 seed created 3 tokens for SAME professional → violates `UNIQUE(match_id, professional_id)`

**Fix:**
- scripts/qa-seed.ts now creates **3 DISTINCT professionals**
- Generates 3 tokens (one per professional)
- Inserts 3 match_recommendations with ranks 1-3
- All QA gates updated to reference distinct professionals

**Impact:** Seed script and all tests now runnable without constraint violations.

**Details:** See CRITICAL_PATCHES_v3.md Patch A

---

### Patch B: Date-Agnostic Partition Creation ✅

**Problem:** Hard-coded `events_2025_01` partitions → fails if deployed in 2024/2026 or other months

**Fix:**
- Dynamic partition SQL using `date_trunc('month', CURRENT_DATE + INTERVAL)`
- Creates DEFAULT + current month + next 2 months automatically
- Works regardless of deployment date

**Migration snippet:**
```sql
DO $$
DECLARE partition_name TEXT; start_date DATE; end_date DATE; i INTEGER;
BEGIN
  FOR i IN 0..2 LOOP
    start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL)::DATE;
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'events_' || to_char(start_date, 'YYYY_MM');
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF events ...', partition_name);
    -- Create indexes...
  END LOOP;
END $$;
```

**Impact:** Migration runs successfully on any calendar date.

**Details:** See CRITICAL_PATCHES_v3.md Patch B

---

### Patch C: SECURITY DEFINER Hardening ✅

**Problem:** SECURITY DEFINER functions without explicit search_path → exploitable via search_path hijacking

**Fix:**
```sql
CREATE OR REPLACE FUNCTION create_pql_from_contact_click()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public  -- ✅ Added
LANGUAGE plpgsql
AS $$ ... $$;

REVOKE EXECUTE ON FUNCTION create_pql_from_contact_click() FROM PUBLIC;
```

**Impact:** Functions cannot be hijacked, explicit permissions enforced.

**Details:** See CRITICAL_PATCHES_v3.md Patch C

---

### Patch D: Token Claim Validation ✅

**Problem:** No validation after JWT verification → accepts malformed claims (non-UUID IDs, invalid rank)

**Fix:**
```typescript
export async function verifyAttributionToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET)

  // ✅ Validate UUID format
  if (!UUID_REGEX.test(payload.match_id)) return null
  if (!UUID_REGEX.test(payload.professional_id)) return null
  if (!UUID_REGEX.test(payload.lead_id)) return null

  // ✅ Validate rank range
  if (payload.rank < 1 || payload.rank > 3) return null

  // ✅ Validate tracking_code format
  if (!TRACKING_CODE_REGEX.test(payload.tracking_code)) return null

  return payload
}
```

**Impact:** Trust boundary enforced - malformed claims rejected at validation layer.

**Details:** See CRITICAL_PATCHES_v3.md Patch D

---

### Patch E: Remove Python Dependencies ✅

**Problem:** QA gates used `python3 -c 'print("a"*64)'` → fails if python3 not installed

**Fix:**
```bash
# ✅ Bash-native alternative
FP_HASH=$(printf 'a%.0s' {1..64})

# Or node.js
FP_HASH=$(node -e "console.log('a'.repeat(64))")
```

**Impact:** QA gates work with bash-only tools (portability improved).

**Details:** See CRITICAL_PATCHES_v3.md Patch E

---

## Document Structure Changes

### FINAL_ARCHITECTURE_v3.md

**Sections modified:**
1. **Database Schema → Partitioning:**
   - Removed hard-coded `events_2025_01` examples
   - Added dynamic partition creation DO block
   - Example now uses `CURRENT_DATE` + `INTERVAL`

2. **Database Triggers:**
   - Added `SET search_path = public` to all SECURITY DEFINER functions
   - Added `REVOKE/GRANT` statements for explicit permissions

3. **Attribution Flow:**
   - Added token claim validation section
   - UUID regex, rank validation, tracking_code validation
   - Updated `verifyAttributionToken()` implementation

### OPERATIONAL_PLAN_v3.md

**Major changes:**

1. **QA Seed Script (scripts/qa-seed.ts):**
   - Now creates 3 professionals (not 1)
   - Generates 3 distinct tokens
   - Output includes PRO_1_ID, PRO_2_ID, PRO_3_ID
   - Satisfies UNIQUE constraints

2. **QA Gate Updates:**
   - **QA-2.1:** Uses bash printf for fingerprint
   - **QA-4.2:** Creates 3 professionals
   - **QA-4.3:** Query shows 3 distinct pros
   - **QA-4.4:** E2E clicks 3 different profiles

3. **Partition Tests (QA-1.2, QA-6.1):**
   - Use `NOW()` and dynamic dates
   - Verify DEFAULT partition catches rows
   - Test future month insertion

---

## Delta Summary by File

### scripts/qa-seed.ts

**v2:**
```typescript
// ❌ Creates 1 professional, 3 tokens for same pro
const professional = await create...
const tokens = [1,2,3].map(() => createToken({ professional_id: professional.id }))
```

**v3:**
```typescript
// ✅ Creates 3 professionals, 1 token each
const professionals = []
for (const data of [pro1, pro2, pro3]) {
  professionals.push(await create...)
}
const tokens = professionals.map(pro => createToken({ professional_id: pro.id }))
```

### migrations/001_initial_schema.sql

**v2:**
```sql
-- ❌ Hard-coded dates
CREATE TABLE events_2025_01 PARTITION OF events
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

**v3:**
```sql
-- ✅ Dynamic with DO block
DO $$
DECLARE i INTEGER;
BEGIN
  FOR i IN 0..2 LOOP
    start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL)::DATE;
    EXECUTE format('CREATE TABLE IF NOT EXISTS events_%s ...', to_char(start_date, 'YYYY_MM'));
  END LOOP;
END $$;
```

### lib/attribution-tokens.ts

**v2:**
```typescript
// ❌ No claim validation
return {
  match_id: payload.match_id as string,
  // ...
}
```

**v3:**
```typescript
// ✅ Validate claims
if (!UUID_REGEX.test(payload.match_id)) return null
if (payload.rank < 1 || payload.rank > 3) return null
// ...
return payload
```

### QA Gates (all milestones)

**v2:**
```bash
# ❌ Python dependency
curl ... "$(python3 -c 'print("a"*64)')"
```

**v3:**
```bash
# ✅ Bash native
curl ... "$(printf 'a%.0s' {1..64})"
```

---

## Migration Guide: v2 → v3

If you already started with v2, follow these steps:

### Step 1: Update Seed Script

```bash
# Replace scripts/qa-seed.ts with v3 version
# Key changes:
# - Creates 3 professionals (not 1)
# - Maps professionals to tokens 1:1
# - Outputs PRO_1_ID, PRO_2_ID, PRO_3_ID
```

### Step 2: Update Migration

```bash
# Replace hard-coded partition creation with dynamic DO block
# Migration will create:
# - events_default (safety net)
# - events_YYYY_MM (current month)
# - events_YYYY_MM (next month)
# - events_YYYY_MM (month after next)
```

### Step 3: Harden Functions

```sql
-- Add to all SECURITY DEFINER functions:
SET search_path = public

-- Add explicit permissions:
REVOKE EXECUTE ON FUNCTION create_next_events_partition FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_next_events_partition TO service_role;
```

### Step 4: Update Token Validation

```typescript
// Add to lib/attribution-tokens.ts:
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TRACKING_CODE_REGEX = /^[A-Za-z0-9_-]{1,64}$/

// In verifyAttributionToken(), add validation after jwtVerify:
if (!UUID_REGEX.test(payload.match_id)) return null
// ... validate all claims
```

### Step 5: Update QA Commands

```bash
# Replace python3 with bash printf:
# Before: $(python3 -c 'print("a"*64)')
# After:  $(printf 'a%.0s' {1..64})
```

---

## Verification Checklist

Run these checks to verify v3 is correctly applied:

### Schema Checks

```sql
-- 1. Verify 3 professionals exist from seed
SELECT COUNT(*) FROM professionals WHERE slug LIKE 'qa-test-pro-%';
-- Expected: 3

-- 2. Verify match_recommendations has 3 distinct professionals
SELECT match_id, COUNT(DISTINCT professional_id) as distinct_pros
FROM match_recommendations
GROUP BY match_id;
-- Expected: distinct_pros = 3

-- 3. Verify partitions exist (any date)
SELECT tablename FROM pg_tables WHERE tablename LIKE 'events_%' ORDER BY tablename;
-- Expected: events_default, events_YYYY_MM (current + next 2 months)
```

### Function Checks

```sql
-- 4. Verify SECURITY DEFINER has search_path
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as is_security_definer,
  p.proconfig as config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE '%pql%' OR p.proname LIKE '%partition%';

-- Expected: config contains 'search_path=public'
```

### Token Validation Checks

```typescript
// 5. Test token with invalid UUID
const invalidToken = await createAttributionToken({
  match_id: 'not-a-uuid',  // Invalid
  // ...
})
const result = await verifyAttributionToken(invalidToken)
// Expected: result === null

// 6. Test token with invalid rank
const invalidRank = await createAttributionToken({
  rank: 999,  // Invalid
  // ...
})
const result2 = await verifyAttributionToken(invalidRank)
// Expected: result2 === null
```

---

## Production Readiness Matrix

| Category | v2 Status | v3 Status | Blocker Resolved |
|----------|-----------|-----------|------------------|
| **Seed Script** | ❌ Constraint violation | ✅ 3 distinct pros | ✅ |
| **Migration** | ❌ Hard-coded dates | ✅ Dynamic partitions | ✅ |
| **Functions** | ⚠️ Exploitable search_path | ✅ Hardened | ✅ |
| **Token Validation** | ⚠️ No claim validation | ✅ Full validation | ✅ |
| **QA Dependencies** | ⚠️ Requires python3 | ✅ Bash-only | ✅ |

**Overall:** v2 had 3 P0 blockers + 2 P1 issues. v3 resolves all 5.

---

## Next Steps

1. **Review:** Read CRITICAL_PATCHES_v3.md for detailed explanations
2. **Apply:** Use v3 documents as single source of truth
3. **Verify:** Run sanity checklist (see CRITICAL_PATCHES_v3.md)
4. **Implement:** Follow OPERATIONAL_PLAN_v3.md milestones
5. **Test:** Execute QA gates after each milestone

---

## Document Status (Final)

| Document | Status | Purpose |
|----------|--------|---------|
| **FINAL_ARCHITECTURE_v3.md** | ✅ Current | Single source of truth (schema, security, validation) |
| **OPERATIONAL_PLAN_v3.md** | ✅ Current | Runnable milestones + QA gates |
| **CRITICAL_PATCHES_v3.md** | ✅ Current | Detailed explanations of all v3 fixes |
| **CHANGES_SUMMARY_v3.md** | ✅ Current | Migration guide v2→v3 |
| FINAL_ARCHITECTURE_v2.md | ❌ Superseded | Had UNIQUE constraint issue |
| OPERATIONAL_PLAN_v2.md | ❌ Superseded | Had python3 dependencies |

---

**All P0 blockers resolved. Ready for production implementation.**
