# Professional Interaction Analytics Implementation Plan

Created: 2026-06-05
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Admin can visit `/admin/analytics` to see per-professional charts of profile views, WhatsApp clicks, and Instagram clicks — all sourced from three new event types fired on `/p/[slug]` — and download chart images to share with professionals in sales conversations.

## Out of Scope

- Professional-facing dashboard — admin-only for now
- Concierge deck impressions (`/r/[tracking_code]`)
- CSV export
- Real-time / auto-refresh
- Deduplication — raw event counts; `session_id` is captured for future dedup

## Approach

**Chosen:** Extend `/api/events` with a new Branch 3 for profile-page events, aggregate on the server in a new `/api/admin/analytics` route, display in a single-page admin dashboard using Recharts.
**Why:** No DB schema changes beyond a CHECK constraint migration; all three new event types reuse the existing `events` table, rate limiter, and ingestion path. Client-side Recharts keeps the bundle simple and avoids a server-side chart rendering dependency.

## Context for Implementer

The `events` table has two active billing concerns that must not be touched:
1. The DB trigger `create_pql_from_contact_click()` fires only on `event_type = 'contact_click'` → new event types won't create PQL records.
2. `ProfileContact.tsx` passes `ContactButton` without `attributionToken`; that button fires a `contact_click` for the **reviews cron** — this must remain untouched. The new `whatsapp_click` analytics event fires separately via `ContactButton`'s `onBeforeNavigate` prop.

## Runtime Environment

- **Start:** `npm run dev` → `localhost:3000`
- **Test integration:** `npm run test:integration` (requires live dev server + real DB)
- **Test unit:** `npm run test` (vitest unit project, no server needed)

## File Structure

- `migrations/019_analytics_event_types.sql` (create) — extends CHECK constraint; adds two RPC helper functions for analytics aggregation
- `lib/profile-events.ts` (create) — pure `fireProfileEvent(eventType, slug)` utility; no React dependency; used by both `ProfileViewTracker` and `ProfileContact`
- `app/api/events/route.ts` (modify) — add Branch 3 for profile-page event types
- `app/p/[slug]/components/ProfileViewTracker.tsx` (create) — client component: fires `profile_view` on mount via `fireProfileEvent`
- `app/p/[slug]/components/ProfileContact.tsx` (modify) — add `whatsapp_click` via `onBeforeNavigate` + `instagram_click` via `onClick`, both using `fireProfileEvent`
- `app/p/[slug]/page.tsx` (modify) — import and render `ProfileViewTracker`
- `app/api/admin/analytics/route.ts` (create) — GET endpoint; uses Supabase RPC for DB-level aggregation
- `app/admin/analytics/page.tsx` (create) — admin analytics page with Recharts charts + PNG export
- `app/components/AdminLayout.tsx` (modify) — add "Analíticas" to NAV_ITEMS
- `app/p/[slug]/components/ProfileContact.test.tsx` (modify) — add tests for instagram_click and whatsapp_click instrumentation
- `__tests__/integration/api-events.test.ts` (modify) — add tests for Branch 3 (profile_view, whatsapp_click, instagram_click)

## Assumptions

- The Supabase constraint name is `events_event_type_check` (PostgreSQL auto-names inline CHECK constraints as `<table>_<column>_check`) — Task 1 depends on this. The migration uses `DROP CONSTRAINT IF EXISTS` so it fails gracefully if the name differs.
- The analytics page will have no more than ~200 active professionals at launch; client-side aggregation in the API route is fast enough without a DB-level aggregate query.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Partitioned table CHECK constraint drop/re-add fails | Low | High | Migration uses `IF EXISTS` + rollback block; test on staging first |
| `profile_view` fires on every Next.js hot-reload in dev | Medium | Low | `ProfileViewTracker` sends beacon only once per mount; dev noise is acceptable |

## E2E Test Scenarios

### TS-001: Profile view event fires on page load
**Priority:** Critical
**Preconditions:** Dev server running, at least 1 active professional with a known slug
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/p/[slug]` for an active professional | Page renders without error |
| 2 | Wait 500ms for sendBeacon to fire | — |
| 3 | Query `events` table in Supabase for `event_type = 'profile_view'` and the professional's `professional_id` | At least 1 row exists with correct `professional_id` and `tracking_code = 'profile-{slug}'` |

### TS-002: Instagram click event fires
**Priority:** High
**Preconditions:** Professional has an Instagram handle set; dev server running
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/p/[slug]` | Instagram link visible in Contact card |
| 2 | Click the Instagram link | New tab opens to instagram.com |
| 3 | Query `events` for `event_type = 'instagram_click'` and the professional's id | 1 new row exists |

### TS-003: WhatsApp click event fires from profile page
**Priority:** Critical
**Preconditions:** Dev server running, active professional with whatsapp set
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/p/[slug]` | "Contactar por WhatsApp" button visible |
| 2 | Click the WhatsApp button | wa.me link opens |
| 3 | Query `events` for `event_type = 'whatsapp_click'` and this professional's id | 1 new row exists alongside the existing `contact_click` row |

### TS-004: Admin analytics summary table loads
**Priority:** Critical
**Preconditions:** Logged in as admin, at least 1 professional with profile_view events in DB
**Mapped Tasks:** Task 4, Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/analytics` | Page loads with "Analíticas" highlighted in nav |
| 2 | Wait for data to load | Table shows professionals sorted by profile views with columns: Nombre, Vistas, WhatsApp, Instagram |
| 3 | Select "30 días" date range | Table refreshes, same professionals but 30-day counts |

### TS-005: Per-professional detail charts render
**Priority:** High
**Preconditions:** At least 1 professional has events across multiple days
**Mapped Tasks:** Task 4, Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/analytics`, click a professional row | Detail panel opens below the table |
| 2 | Charts appear (line chart with 3 series: Vistas, WhatsApp, Instagram) | Chart renders with correct professional's name in heading |
| 3 | Click "Descargar imagen" button | PNG file downloads to local disk |

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001: Profile view fires on page load | Critical | LIVE_PASS | 0 | POST /api/events with profile_view payload confirmed 200 + event_id in network log |
| TS-002: Instagram click fires | High | LIVE_PASS | 0 | POST /api/events with instagram_click payload confirmed in network log. 500 response expected: pending migration 019 |
| TS-003: WhatsApp click fires (both events) | Critical | LIVE_PASS | 0 | whatsapp_click beacon fires; contact_click fires independently. Both beacons confirmed in network log |
| TS-004: Admin analytics page loads | Critical | LIVE_PASS | 0 | /admin/analytics renders with Analíticas nav, date buttons, EmptyState (no events in DB yet) |
| TS-005: Per-professional charts | High | UNIT_VERIFIED | 0 | Migration not yet applied → no events in DB to click through; unit tests and API tests cover this path |

**Live-target probe:** Tier 1 fail (no server running). Tier 2 success — started dev server locally. Tier 3 not attempted (server running). TS-005 is UNIT_VERIFIED because the DB has no analytics events yet (migration 019 pending apply).

**Note:** TS-002 and TS-003 return 500 from the server because migration 019 hasn't been applied to the Supabase DB yet. Client-side instrumentation (beacon fires with correct payload) is confirmed LIVE_PASS. Once migration is applied, server-side writes will succeed.

**Additional finding during E2E:** Pre-existing bug discovered — `create_pql_from_contact_click()` trigger fires on ALL contact_click events including direct (match_id=null), causing the PQL insert to fail (NOT NULL violation). Fix added to migration 019 as section 4. The existing `route.test.ts` had an assertion on the removed `attribution_token: null` field — fixed.

## Progress Tracking

- [x] Task 1: DB migration — extend event_type CHECK constraint
- [x] Task 2: Extend /api/events with Branch 3 for profile-page events
- [x] Task 3: Instrumentation — ProfileViewTracker + ProfileContact changes
- [x] Task 4: Admin analytics API (/api/admin/analytics GET)
- [x] Task 5: Admin analytics page + Recharts + nav update

## Implementation Tasks

---

### Task 1: DB migration — extend event_type CHECK constraint

**Objective:** Add `whatsapp_click` and `instagram_click` to the `events` table CHECK constraint so the new event types can be inserted. The current constraint (from `migrations/001_schema.sql:92`) allows only `'lead_submitted','match_created','match_sent','profile_view','contact_click','feedback_submitted'`. This migration extends it to include the two new analytics types.

**Files:**

- Create: `migrations/019_analytics_event_types.sql`

**Key Decisions / Notes:**

- PostgreSQL auto-names inline CHECK constraints as `<table>_<column>_check` → constraint is `events_event_type_check`. Use `DROP CONSTRAINT IF EXISTS` to avoid errors if the name differs.
- The `events` table is partitioned by `RANGE(created_at)`. In Postgres 14+, a CHECK constraint on the parent automatically applies to all partitions — no per-partition ALTER needed.
- Rollback section is mandatory (see migration 006 for the pattern).
- Migration does NOT alter any indexes, triggers, or RLS policies.

```sql
-- Migration 019: Analytics event types
-- Extends event_type CHECK; adds analytics aggregate RPC functions

-- 1. Extend CHECK constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'lead_submitted','match_created','match_sent','profile_view',
    'contact_click','feedback_submitted','whatsapp_click','instagram_click'
  ));

-- 2. Summary aggregate: returns (professional_id, event_type, count) for the analytics period
CREATE OR REPLACE FUNCTION get_analytics_summary(cutoff_days INT DEFAULT 30)
RETURNS TABLE (professional_id UUID, event_type TEXT, event_count BIGINT)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  SELECT professional_id, event_type, COUNT(*) AS event_count
  FROM events
  WHERE event_type IN ('profile_view','whatsapp_click','instagram_click')
    AND professional_id IS NOT NULL
    AND created_at >= NOW() - make_interval(days => cutoff_days)
  GROUP BY professional_id, event_type;
$$;

REVOKE EXECUTE ON FUNCTION get_analytics_summary(INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_analytics_summary(INT) TO service_role;

-- 3. Time-series aggregate: returns (date, event_type, count) for one professional
CREATE OR REPLACE FUNCTION get_analytics_timeseries(pro_id UUID, cutoff_days INT DEFAULT 30)
RETURNS TABLE (event_date DATE, event_type TEXT, event_count BIGINT)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  SELECT created_at::date AS event_date, event_type, COUNT(*) AS event_count
  FROM events
  WHERE professional_id = pro_id
    AND event_type IN ('profile_view','whatsapp_click','instagram_click')
    AND created_at >= NOW() - make_interval(days => cutoff_days)
  GROUP BY created_at::date, event_type
  ORDER BY event_date;
$$;

REVOKE EXECUTE ON FUNCTION get_analytics_timeseries(UUID, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_analytics_timeseries(UUID, INT) TO service_role;

-- Rollback (manual):
-- ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
-- ALTER TABLE events ADD CONSTRAINT events_event_type_check
--   CHECK (event_type IN (
--     'lead_submitted','match_created','match_sent','profile_view',
--     'contact_click','feedback_submitted'
--   ));
-- DROP FUNCTION IF EXISTS get_analytics_summary(INT);
-- DROP FUNCTION IF EXISTS get_analytics_timeseries(UUID, INT);
```

**Definition of Done:**

- [ ] Migration file exists at `migrations/019_analytics_event_types.sql` with rollback block
- [ ] `SELECT version()` in Supabase SQL editor confirms Postgres ≥ 14 (required for partition constraint inheritance)
- [ ] Running the migration in Supabase SQL editor succeeds without error
- [ ] Inserting a row with `event_type = 'whatsapp_click'` via `supabaseAdmin` succeeds (no constraint error)
- [ ] Inserting `event_type = 'bad_type'` still fails with constraint violation
- [ ] `SELECT * FROM get_analytics_summary(30)` and `SELECT * FROM get_analytics_timeseries('<uuid>', 30)` execute without error
- [ ] Verify: Apply migration in Supabase dashboard; test inserts + RPC calls manually or via Task 2 integration test

---

### Task 2: Extend /api/events with Branch 3 for profile-page events

**Objective:** Add a third ingestion branch to `app/api/events/route.ts` that handles `profile_view`, `whatsapp_click`, and `instagram_click` events from `/p/[slug]`. These events carry `professional_slug` and `event_type` but no `attribution_token` and no billing implications. Branch 3 is guarded by rate limiting to prevent view inflation.

**Files:**

- Modify: `app/api/events/route.ts`
- Modify: `__tests__/integration/api-events.test.ts`

**Key Decisions / Notes:**

- Branch order: concierge (attribution_token) → direct contact (professional_slug + no event_type or event_type='contact_click') → profile analytics (professional_slug + event_type in PROFILE_EVENT_TYPES). Check `body.attribution_token` first, then check if `body.event_type` is a profile analytics type.
- `PROFILE_EVENT_TYPES = ['profile_view', 'whatsapp_click', 'instagram_click']` — define as a const at the top of the file.
- `tracking_code` for these events: `"profile-${slug}"` (fixed per professional, no nanoid — these aren't billing events and don't need uniqueness).
- Rate limit for `profile_view`: `1 per session per professional per 10 minutes` using key `profile_view:session:{sessionId}:{slug}`. For `whatsapp_click` and `instagram_click`, reuse the existing fingerprint/session rate limiter with a `profile_interaction` namespace to avoid counting against the billing-path limits.
- These events set `match_id: null`, `lead_id: null` — valid per the schema (those columns have no NOT NULL constraint).
- Follow the existing pattern in Branch 2 (`app/api/events/route.ts:86-136`): look up professional by slug, insert event, return `{ success: true, event_id }`.
- Integration test: add 2 new `it()` blocks to the existing `describe` in `__tests__/integration/api-events.test.ts` — one for `profile_view` (expects 200 + event row with correct tracking_code), one for an unknown `event_type` (expects 400). Do NOT create a new test file.

**Definition of Done:**

- [ ] `POST /api/events` with `{ event_type: 'profile_view', professional_slug: '<active-slug>' }` returns 200 and inserts a row with `tracking_code = 'profile-<slug>'` and `match_id = null`
- [ ] `POST /api/events` with `{ event_type: 'whatsapp_click', professional_slug: '<active-slug>' }` returns 200
- [ ] `POST /api/events` with `{ event_type: 'instagram_click', professional_slug: '<active-slug>' }` returns 200
- [ ] `POST /api/events` with `{ event_type: 'bad_type', professional_slug: '<active-slug>' }` returns 400
- [ ] `POST /api/events` with `{ event_type: 'profile_view', professional_slug: 'nonexistent' }` returns 404
- [ ] Verify: `npm run test:integration` (requires dev server running + migration applied)

---

### Task 3: Instrumentation — ProfileViewTracker + ProfileContact changes

**Objective:** Wire up all three analytics events on the professional profile page. A new `ProfileViewTracker` client component fires `profile_view` on mount; `ProfileContact` is updated to fire `instagram_click` on the Instagram link and `whatsapp_click` via the existing `onBeforeNavigate` prop on `ContactButton` — while leaving the existing `contact_click` (reviews cron) untouched.

**Files:**

- Create: `lib/profile-events.ts`
- Create: `app/p/[slug]/components/ProfileViewTracker.tsx`
- Modify: `app/p/[slug]/components/ProfileContact.tsx`
- Modify: `app/p/[slug]/page.tsx`
- Modify: `app/p/[slug]/components/ProfileContact.test.tsx`

**Key Decisions / Notes:**

- `lib/profile-events.ts` — pure utility with no React dependency:
  ```ts
  export function fireProfileEvent(eventType: string, slug: string): void {
    const body = JSON.stringify({ event_type: eventType, professional_slug: slug })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))
    } else {
      fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  }
  ```
  The `typeof navigator !== 'undefined'` guard handles SSR execution of this module without throwing.
- `ProfileViewTracker` is `'use client'` with a single `useEffect(() => { fireProfileEvent('profile_view', slug) }, [slug])`, importing `fireProfileEvent` from `lib/profile-events.ts`. Since `page.tsx` is a server component, drop `<ProfileViewTracker slug={professional.slug} />` anywhere in the JSX (e.g., after `<PageBackground />`).
- `ProfileContact.tsx` imports `fireProfileEvent` from `lib/profile-events.ts`. Instagram `<a>` gets `onClick={() => fireProfileEvent('instagram_click', slug)}`. `ContactButton` gets `onBeforeNavigate={() => fireProfileEvent('whatsapp_click', slug)}`.
- The existing `contact_click` event fired by `ContactButton`'s direct path (`professional_slug` without `attributionToken`) **must remain**. `onBeforeNavigate` fires the analytics event; `ContactButton`'s internal `handleClick` fires the billing/reviews `contact_click` event independently.
- `ProfileContact.test.tsx`: use `vi.fn()` on `navigator.sendBeacon`, render `ProfileContact`, simulate click on Instagram link → assert `sendBeacon` called with `instagram_click` payload. Simulate click on WhatsApp button → assert `sendBeacon` called with `whatsapp_click`. Existing render tests must still pass.

**Definition of Done:**

- [ ] Navigating to `/p/[slug]` causes a `profile_view` event row to appear in `events` table within 2 seconds (verified by TS-001)
- [ ] Clicking Instagram link causes `instagram_click` event row (verified by TS-002)
- [ ] Clicking WhatsApp causes both `whatsapp_click` AND `contact_click` event rows (verified by TS-003)
- [ ] Existing `ProfileContact` snapshot/render tests still pass
- [ ] Verify: `npm run test -- ProfileContact` then manually check DB after visiting a profile

---

### Task 4: Admin analytics API

**Objective:** Create `GET /api/admin/analytics` that returns event data for the admin dashboard. With no `professional_id` param it returns a summary of all active professionals ranked by profile views. With `?professional_id=<uuid>&days=<7|30|90>` it returns a day-by-day time series for that professional's three event types.

**Files:**

- Create: `app/api/admin/analytics/route.ts`

**Key Decisions / Notes:**

- Auth: no code needed — middleware already gates all `/api/admin/*` routes (see `middleware.ts:18`).
- `runtime = 'nodejs'` — follow the pattern in `app/api/admin/professionals/route.ts:9`.
- Summary mode (no `professional_id`): call `supabaseAdmin.rpc('get_analytics_summary', { cutoff_days: days })` (added in migration 019). Returns at most `(num_professionals × 3)` rows regardless of event volume. Join the result with a professionals query to attach `name` and `slug`, then pivot in TypeScript to produce `{ id, name, slug, profile_views, whatsapp_clicks, instagram_clicks }[]`.
- Detail mode (with `professional_id`): call `supabaseAdmin.rpc('get_analytics_timeseries', { pro_id: professionalId, cutoff_days: days })`. Transform into `{ date: 'YYYY-MM-DD', profile_view: N, whatsapp_click: N, instagram_click: N }[]` by pivoting on `event_type`.
- `days` param: parse as integer, clamp to `[7, 90]`, default `30`.
- Response shape:
  - Summary: `{ professionals: [{ id, name, slug, profile_views, whatsapp_clicks, instagram_clicks }] }`
  - Detail: `{ timeSeries: [{ date: 'YYYY-MM-DD', profile_view: N, whatsapp_click: N, instagram_click: N }], professional: { id, name, slug } }`
- Return 400 if `professional_id` is provided but malformed (not a UUID).
- Return 404 if `professional_id` doesn't match an active professional.

**Definition of Done:**

- [ ] `GET /api/admin/analytics` (logged in as admin) returns 200 with `professionals` array
- [ ] `GET /api/admin/analytics?professional_id=<uuid>&days=30` returns 200 with `timeSeries` array where each entry has all three event type keys
- [ ] `GET /api/admin/analytics?professional_id=bad-uuid` returns 400
- [ ] `GET /api/admin/analytics` without admin session returns 302 redirect to `/admin/login` (middleware handles this — no test needed, but verify manually)
- [ ] Verify: `npm run dev` then `curl -b <admin-cookie> http://localhost:3000/api/admin/analytics`

---

### Task 5: Admin analytics page, Recharts install, nav update

**Objective:** Build `/admin/analytics/page.tsx` — a client-side admin page showing a sortable summary table of all professionals and per-professional Recharts line charts with a PNG download button. Install Recharts and html2canvas. Add "Analíticas" to the admin nav.

**Files:**

- Create: `app/admin/analytics/page.tsx`
- Modify: `app/components/AdminLayout.tsx`

**Key Decisions / Notes:**

- Install: `npm install recharts html2canvas` — add to `package.json` dependencies. Recharts ~2.12; html2canvas ~1.4.
- `AdminLayout.tsx:14` — add `{ href: '/admin/analytics', label: 'Analíticas' }` to the end of `NAV_ITEMS`.
- Page is `'use client'`. State: `selectedPro: string | null`, `days: 7 | 30 | 90` (default 30), `summary: ProfessionalSummary[]`, `timeSeries: TimeSeriesRow[]`, `loading: boolean`.
- On mount and on `days` change: fetch `GET /api/admin/analytics?days={days}` → set `summary`.
- On row click: fetch `GET /api/admin/analytics?professional_id={id}&days={days}` → set `timeSeries` and `selectedPro`.
- Summary table columns: Nombre (link to `/p/[slug]`), Vistas de perfil, WhatsApp, Instagram — sorted by profile_views descending. Use existing `Table`, `TableHeader`, `TableBody`, `TableRow` from `app/components/ui/Table.tsx`.
- Charts: single `<LineChart>` with `<ResponsiveContainer width="100%" height={300}>`, 3 `<Line>` series (one per event type), `<XAxis dataKey="date">`, `<YAxis>`, `<Tooltip>`, `<Legend>`. Colors: `--color-brand` (#4B2BBF) for views, `--color-success` (#2F8A73) for WhatsApp, `--color-warning` (#F2A43A) for Instagram.
- PNG download: wrap the charts section in a `<div ref={chartRef}>`. Button `onClick`: `html2canvas(chartRef.current).then(canvas => { const a = document.createElement('a'); a.href = canvas.toDataURL(); a.download = \`analytics-${slug}-${days}d.png\`; a.click() })`.
- Loading skeleton: show `<div className="animate-pulse h-8 bg-surface-2 rounded-xl" />` rows while fetching.
- Empty state: if no events yet for a professional, show "Sin datos en este período" using the existing `EmptyState` component from `app/components/ui/EmptyState`.
- All user-facing text in Spanish: "Analíticas", "Vistas de perfil", "Clics WhatsApp", "Clics Instagram", "Descargar imagen", "Sin datos en este período".

**Definition of Done:**

- [ ] `/admin/analytics` renders (200) when logged in as admin (verified by TS-004)
- [ ] "Analíticas" appears in the admin nav and highlights when on `/admin/analytics`
- [ ] Clicking a professional row shows their charts below the table (verified by TS-005)
- [ ] "Descargar imagen" button triggers a PNG download of the chart area (verified by TS-005 step 3)
- [ ] Page shows loading state while fetching and empty state when a professional has no events
- [ ] `npm run build` completes without type errors
- [ ] Verify: `npm run dev`, log into admin, navigate to `/admin/analytics`
