# Hará Match - Implementation Plan

**Timeline:** 4 weeks
**Source:** FINAL_SPEC.md (single source of truth)

---

## Week 1: Database + Tokens + Validation

### Build
- migrations/001_schema.sql (run migration)
- lib/attribution-tokens.ts (create/verify with claim validation)
- lib/validation.ts (IP, fingerprint, session_id validation)
- lib/supabase-admin.ts (service role client)
- lib/rate-limit.ts (Upstash Redis wrapper)
- scripts/qa-seed.ts (creates 3 professionals, 1 match, 3 tokens)

### Test (SELF_QA_RULES.md)
- Rule 1: PostgREST bypass blocked
- Rule 2: Seed creates 3 distinct professionals
- Rule 4: Partition insert works with NOW()
- Rule 7: Reconciliation returns 0 orphans

### Deliverables
✅ Database deployed with RLS
✅ Attribution tokens working
✅ QA seed runnable

---

## Week 2: Event Ingestion + Profiles

### Build
- app/api/events/route.ts (validate token + rate limit + service role insert)
- app/p/[slug]/page.tsx (profile page server component)
- components/ContactButton.tsx (<a> link + sendBeacon)
- lib/crypto-utils.ts (SHA256 client-side)

### Test
- Rule 3: Valid token → exactly 1 PQL
- Rule 5: Invalid tracking_code rejected
- Rule 6: Rate limiting works (429 at threshold)
- Manual: No popup blocking on iOS Safari

### Deliverables
✅ /api/events endpoint working
✅ Profile pages viewable
✅ Contact tracking reliable

---

## Week 3: Matching + Billing

### Build
- app/recommend/page.tsx (lead intake form)
- app/actions/create-lead.ts (server action using service role - RLS-safe)
- app/admin/matches/new/page.tsx (admin matching interface)
- app/api/admin/matches/route.ts (create match + tokens)
- app/r/[tracking_code]/page.tsx (recommendation page with 3 pros)
- app/admin/billing/page.tsx (PQL dashboard + CSV export)
- app/api/admin/pqls/[id]/adjust/route.ts (waive/dispute/refund)

**Note:** Lead submission uses supabaseAdmin (service role) because leads RLS denies public INSERT

### Test
- End-to-end: lead → match → recommendation → profile → contact → PQL
- Billing report accurate (3 PQLs per match, adjustments work)
- CSV export downloads

### Deliverables
✅ Admin can create matches
✅ Recommendations display 3 professionals
✅ Billing dashboard operational

---

## Week 4: Automation + Launch

### Build
- app/api/cron/create-partition/route.ts
- app/api/cron/purge-events/route.ts
- app/api/cron/reconciliation/route.ts (check_pql_event_integrity)
- vercel.json (cron schedules)
- Sentry error tracking

### Test
- Partition creation cron works
- Retention policy purges old events
- Reconciliation job runs weekly

### Deliverables
✅ Production deployed
✅ Monitoring active
✅ First 10 real PQLs verified

---

## 4-Week Success Criteria

✅ All 7 SELF_QA rules pass
✅ 10+ real leads processed
✅ 10+ real PQLs created
✅ Billing export ready
✅ Attribution integrity 100%
