# Plan: main

> **Product context:** see [`PRODUCT.md`](../../PRODUCT.md) (canonical answer to "what is this product?"). This file is the operational plan — phases, sessions, work-in-flight. Update PRODUCT.md when the product evolves; update this file when work moves.

## Overview

Hará Match is **the Spanish-speaking wellness trust layer** — a curated marketplace for Spanish-speaking markets (LATAM + Spain), with Argentina as the home/proving ground. It combines two modes:

1. **Browse mode (Directory):** Users browse professionals ranked by reputation (stars, profile completeness). Professionals can pay for visibility (subscription tiers, boosts). This is the primary discovery path.
2. **Concierge mode (Solicitar):** Users describe what they need → admin reviews → sends personalized recommendations via tracking link. This is the high-trust differentiator — "we pick for you."

**What makes Hará different from Google/directories:**
- Professionals are verified — not everyone gets listed
- Reputation comes from real interactions, not anonymous reviews
- The concierge flow ("solicitar") provides personalized, human-curated recommendations
- Focus on trust in a market (wellness/therapy in LATAM) where trust is the #1 barrier

**Revenue model:**
- **Subscription tiers:** Professionals pay monthly for visibility (appear higher, "Destacado" badge, featured placement)
- **Concierge leads (future):** The existing PQL/attribution system can be used to charge for curated leads delivered via `/solicitar` → `/r/[tracking_code]`

The app is built with Next.js 14.2 + TypeScript + Tailwind CSS v4 + Supabase + Upstash Redis.

Deployed at: https://hara-weld.vercel.app

## Success Criteria

- [x] Professional registration collects all profile fields (including short_description, experience_description, instagram, service_type, profile image)
- [x] Admin can review submitted profiles at `/admin/professionals/[id]/review`
- [x] Admin can approve (→ active) or reject (→ rejected + reason) profiles
- [x] Email to admin includes deep link to review page
- [x] Profile score preview based on submission completeness (10 criteria, 100 points)
- [x] DB supports `rejected` status and `rejection_reason`
- [x] Specialty color system — 12 curated colors, custom specialty support, admin mapping
- [x] 3-level testing infrastructure — 26 component tests + E2E + visual regression
- [ ] All pages visually match the design system (liquid-glass, tokens, pill buttons, identical page shells) — first pass done, needs visual testing
- [x] Public directory page (`/profesionales`) with reputation-based ranking — shipped 2026-04-24 (migration 004: ranking columns + trigger; /profesionales server component; home page 3rd CTA)
- [x] Home page redesign with dual CTA (concierge + directory) — "Ver profesionales" CTA added 2026-04-24
- [x] Destacado tier MVP — admin-gated payment recording, expiry-aware ranking, public Destacado chip, daily cron cleanup (shipped 2026-04-27, migration 005)
- [x] Reviews collection system — post-contact email review request (7-day cron), no-login submission at /r/review/[token], reviews card on /p/[slug], admin /admin/reviews moderation, DB trigger updates rating_average + rating_count → ranking_score chain (shipped 2026-04-27, migration 006)
- [x] Admin dashboard improvements — search + status filters on all 3 list pages, debug routes migrated to admin, inline match context on leads
- [x] Registration full-flow E2E test — Playwright test covering 4-step form, image upload, DB verification, cleanup
- [x] Unified legal page at `/terminosyprivacidad` with collapsible terms/privacy content and form links

## Constraints

- Design system is fixed — use it as-is, never modify or extend the visual language. If a context doesn't fit, change the context (e.g., use a different background), not the system.
- All user-facing copy in Spanish (Argentine informal: vos, querés, escribís)
- No broad DB schema changes — targeted additions only
- Rejected profile handling is pinned for a future conversation (keep data? allow resubmit?)

## Roadmap

The product ships in 4 phase gates. Each phase has a clear definition of done. **Don't start phase N+1 until phase N is done.** Items not in a phase are in `Notes → Deferred` — no commitment, revisit only on real-user signal.

### Phase 0 — ACTIVATE *(in progress)*

**PRD:** [`docs/prd/2026-04-27-phase-0-activation.md`](../docs/prd/2026-04-27-phase-0-activation.md)

**Definition of done:** the product works on prod for one real professional + one real user, end-to-end.

0. ~~**Resume the Supabase database.**~~ ✅ Done 2026-05-01.
1. ~~**Apply migrations 004 + 005 + 006 to Supabase.**~~ ✅ Done 2026-05-01 via SQL Editor. All three verified end-to-end (RLS active, RPCs functional, triggers chaining correctly).
2. ~~**Verify Resend domain + swap `FROM_EMAIL`.**~~ ✅ Done 2026-05-01. `haravital.app` verified, `lib/email.ts` updated to `Hará Match <hola@haravital.app>` with `replyTo: centrovitalhara@gmail.com`.
3. **Smoke test 3 flows on prod:** *(pending)*
   - Browse: `/profesionales` → profile → `Contactar por WhatsApp` → review email arrives 7 days later → `/r/review/[token]` submission.
   - Concierge: `/solicitar` → admin matches → `/r/[code]` → contact → review.
   - Onboarding: `/profesionales/registro` (4 steps + image) → admin review → approval → appears in directory.
4. **Visual QA pass.** *(pending)* Open every route on a phone-sized viewport. Catalog any visual breaks. Update Playwright visual baselines only for routes meant to stay locked.
5. **Image upload end-to-end verification.** *(pending)* Form → FormData → Supabase Storage → DB URL → visible on review page and `/p/[slug]`.
6. **Decide rejected profile flow.** *(pending)* Product decision: keep data? Allow resubmit? Notify professional? (See `Open Questions`.) Then implement the decided flow.

### Phase 1 — OPEN FOR BUSINESS *(2–3 weeks)*

**Definition of done:** 10 real professionals onboarded, 5 real concierge requests handled, basic monitoring catches errors before users report them.

1. **Sentry + Vercel Analytics** wired in. `lib/monitoring.ts` already isolates the integration point.
2. **Schedule recurring jobs:** reconciliation (calls `check_pql_event_integrity()`), event purge (calls `purge_old_events()`), Destacado expiry (already wired). Verify all 3 cron entries fire on Vercel.
3. **Onboard first 10 professionals** through real registration. Document friction.
4. **Handle first 5 real `/solicitar` requests.** Document friction.
5. **Fix only the issues that show up from real usage.** Do not pre-build polish.

### Phase 2 — UNBLOCK SCALE *(1–2 months)*

**Definition of done:** admin is no longer in the critical path for payments or directory navigation.

1. **Self-serve Destacado checkout** — MercadoPago integration, `/profesionales/[slug]/upgrade`, webhook → `upgrade_destacado_tier()`. (PRD: `docs/prd/` — to be written, builds on the 2026-04-27 admin-gated MVP.)
2. **Directory filters + search** — specialty / location / modality filters, name search, pagination. (PRD: `docs/prd/` — to be written.)
3. **Destacado renewal reminders** — email N days before `tier_expires_at`, daily admin digest. (PRD: `docs/prd/` — to be written.)
4. **AFIP invoicing automation** — Tusfacturas or Contabilium integration. (PRD: `docs/prd/` — to be written.)

### Phase 3 — TWO-SIDED MARKETPLACE *(2–3 months)*

**Definition of done:** professionals can self-manage without admin involvement.

1. **`/pro/*` portal** — auth-bind `professionals.user_id` to Supabase Auth, build `/pro` home, `/pro/leads`, `/pro/profile` edit, tier visibility. (PRD: `docs/prd/` — to be written.)
2. **Admin detail pages** that depend on the portal: `/admin/professionals/[id]` (reviews, rating, tier history), `/admin/analytics` (funnel + MRR + active Destacado).

## Session Log

### Session — 2026-05-01 → 2026-05-03 (Phase 0 push: domain, homepage, cleanup)

**Completed:**
- Fixed prod 500 — Vercel was missing `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Code now reads the new Supabase publishable-key naming (`f654181`).
- Resend domain verified (`haravital.app`) and `lib/email.ts` updated: `FROM_EMAIL = 'Hará Match <hola@haravital.app>'`, `ADMIN_EMAIL = 'centrovitalhara@gmail.com'`, `replyTo` header on every send (`226774f`).
- Pre-launch homepage shipped (`6c548ef`): `/` → "Próximamente" with email capture; existing directory home moved to `/preview`. Migration 007 created `waitlist` table with RLS deny-all + idempotent insert.
- Test data cleanup: deleted 23 orphan test professionals + 59 pqls via service role. 45 real submitted professionals remain.
- Admin delete-professional flow (`2ec2e5f`): `DELETE /api/admin/professionals/[id]` handles cascade ordering (pqls → professional with FK cascade). Trash icon + confirmation modal added to `/admin/professionals` rows. Replaces manual SQL flow.
- Rate limiter changed to fail-open in production (`987b40e`). Removed legacy fail-closed branch from `lib/rate-limit.ts`. Means Upstash flakes log loudly but don't break public endpoints. Documented in Notes → Infrastructure decisions.
- Upstash free-tier DB was deleted by inactivity, restore stuck "pending" 2+ days. Decided to defer — fail-open keeps the site working. Documented as deferred with reactivation note.
- Documented infrastructure decisions in Notes (rate limiter rationale, Upstash deletion incident, Resend sender + replyTo pattern) and added "n8n heartbeat workflow" + "reactivate Upstash before launch" to Misc deferred items (`5e1ea13`).

**Deviations:**
- Misread user intent twice early in this stretch: assumed Vercel had `_PUBLISHABLE_KEY` (didn't — it had no `NEXT_PUBLIC_*` Supabase vars at all), and proposed renaming `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL` in `supabase-admin.ts` (would break the intentional server-only/client-safe split). Both flagged by user, both fixed.
- Codex review surfaced 4 bugs in migrations 005/006 before they were applied: missing RLS on 3 tables (subscription_payments, reviews, review_requests), off-by-one in `upgrade_destacado_tier()` extension branch, OLD/NEW professional_id stale-aggregate bug in reviews trigger. All fixed in-place (`448ab3c`) before applying.

**Blockers / open follow-ups:**
- Upstash reactivation before public launch (deferred; tracked in Misc).
- Infrastructure heartbeat workflow in n8n (deferred; tracked in Misc).
- Phase 0 Tasks 3 + 4 + 5 + 6 still pending (smoke tests, visual QA, image upload e2e, rejected profile flow).

**Tests:** 147/147 unit pass · pre-push hook ran on every push · prod verified live (haravital.app/, /preview, /api/waitlist all return success).

**Resume here:** Phase 0 Tasks 0/1/2 complete. Remaining: smoke test the 3 flows, visual QA pass, image upload e2e, decide rejected profile flow. Each is independent.

### Session — 2026-05-01 (Doc alignment + Cron PRD + Migrations 004/005 applied)

**Completed:**
- Created `PRODUCT.md` at repo root (`a670736`) — canonical product context, vision = "Spanish-speaking wellness trust layer" (Argentina home, expand pan-Spanish). CLAUDE.md "What Is This" rewritten + pointer to PRODUCT.md.
- Aligned all top-level docs (`eb16d0f`) with post-pivot product: README.md (Browse + Concierge data flows, Supabase Auth instead of Clerk, push-to-main workflow), FINAL_SPEC.md (scoped to DB+API spec), DEVELOPMENT_HISTORY.md + PRODUCTION_READINESS.md (marked as pre-pivot historical snapshots), main.md (PRODUCT.md pointer + Spanish-speaking framing).
- Wrote `docs/prd/2026-05-01-cron-infrastructure-n8n.md` (`9caae6d`) — six-task PRD routing scheduled jobs through user's self-hosted n8n at `https://n8n.greenbit.info` (Hetzner + Coolify) instead of Vercel crons. Decision matrix vs Pro Vercel/Pro Supabase/DB migration. Existing `expire-destacado` cron's `UPDATE professionals` query doubles as keep-alive heartbeat.
- **Discovered** the existing crons in `vercel.json` (`expire-destacado`, `send-review-requests`, both committed 2026-04-27) **never fired in prod**. Three failures stacked: Vercel Hobby doesn't fire `vercel.json` crons (route comments warn this), Supabase free-tier paused, migrations 005/006 not applied so the RPCs the crons call don't exist.
- Migration 004 applied via Supabase SQL Editor (you), verified via apply script (`✓ Migration already applied`) and live REST query: ranking_score values match `0.7 * profile_completeness_score` for all 5 rows.
- Codex review of migrations 005/006 surfaced 4 issues I missed/flagged. Fixed in-place (`448ab3c`) since migrations not yet deployed:
  - 005: RLS + `Deny all` on `subscription_payments` (was missing — anon could read/write payment records)
  - 005: off-by-one in `upgrade_destacado_tier()` extension branch (extension lost 1 day vs cold renewal because it computed `period_end - period_start` exclusive while cold renewal treats `period_end` as inclusive end-of-day). Fix: `+ 1` for inclusive math, with matching update to DestacadoPaymentModal preset arithmetic and parity test fixture 11.
  - 006: RLS + `Deny all` on `reviews` and `review_requests` (review_requests holds plaintext one-time tokens + reviewer emails — without RLS anon could scrape and consume).
  - 006: `trigger_recompute_review_aggregates()` now recomputes both OLD and NEW `professional_id` on UPDATE (previously only NEW — admin reassignment would leave old professional with stale aggregates).
- Migration 005 applied (you), verified end-to-end: `subscription_payments` table empty, `tier_expires_at` column populated NULL across all 5 rows, anon SELECT returns `[]` (RLS active), `upgrade_destacado_tier()` RPC raises P0001 on invalid period as designed.
- Migration 006 applied (you), verified end-to-end: `reviews` + `review_requests` tables empty, anon SELECT returns `[]` on both (RLS active — no token leak surface), `submit_review()` RPC raises P0001 `invalid_token` on bogus token, `select_pending_review_events()` returns `[]` (no events from 7 days ago — correct).
- **All three migrations now applied and verified.**

**Deviations:**
- Sandbox network changed since prior sessions — `*.supabase.co` resolves and is reachable now. The apply scripts can verify migrations via column-existence checks but still cannot push DDL (Supabase doesn't enable the `exec_sql` RPC by default). SQL Editor remains the right tool for applying migrations.
- Misread one of the user's messages early in the session — assumed Vercel env had `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` based on what they pasted, when they were actually showing me what Supabase calls the var in their dashboard. User flagged the assumption + scope creep in my proposed code rename (was about to rename `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL` in `lib/supabase-admin.ts` — that's an intentional server-only/client-safe split, not a bug).

**Blockers / open follow-ups:**
- **Prod still 500ing** with `MIDDLEWARE_INVOCATION_FAILED` on every route. Suspected root cause (unverified — needs user to check Vercel dashboard): code reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`; if Vercel env has `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new Supabase naming) instead, middleware crashes. Fix path TBD pending verification of actual Vercel env var names. Migrations now applied so the only remaining cause for prod 500 is auth/env wiring.
- Cron PRD remaining tasks: Task 3 set `CRON_SECRET` in Vercel, Task 4 build 2 n8n workflows at `https://n8n.greenbit.info`, Task 5 remove dead `crons` block from `vercel.json`, Task 6 update plan + Phase 0 PRD pointer.
- Resend domain verification still pending (Phase 0 Task 2 in the activation PRD).
- Smoke tests, visual QA, image upload e2e, rejected profile flow decision (Phase 0 Tasks 3-6) still pending.

**Tests:** 135/135 unit pass · pre-push hook ran on every push.

**Resume here:** all three migrations applied + verified. Next priorities (your call): (a) fix prod 500 by verifying/updating env var names, (b) continue cron PRD Task 3 (CRON_SECRET in Vercel + n8n workflows), or (c) Resend domain verification. Each is independent.

### Session — 2026-04-27 (Plan Restructure + Phase 0 PRD)

**Completed:**
- Committed and pushed Reviews Collection System (`cf2fc6d`) — 23 staged files (migration 006, 7 API routes, 4 UI components, 9 test files, PRD/plan/manual-testing docs). Pre-push hook ran 135 unit tests green.
- Rewrote `.claude/plans/main.md` Roadmap (`48715d2`): replaced flat ~100-item `Pending Tasks (Backlog)` with 4 phase gates (Phase 0–3), each with explicit definition of done. Moved polish/animation/perf-target/WCAG AAA/infra hardening items to a single `Deferred (no commitment)` section with rationale. Net: −173/+91 lines.
- Wrote `docs/prd/2026-04-27-phase-0-activation.md` (`61b5798`) — full PRD for Phase 0 covering 7 tasks (Task 0 prod fix + Tasks 1–6 from the plan). Each task has What/Why/How/Verification + slated manual-testing doc under `docs/manual-testing/`.
- Discovered prod was 500ing on every route while writing the PRD (`MIDDLEWARE_INVOCATION_FAILED`). Initial diagnosis: Vercel env vars missing. User correction: Supabase free-tier auto-pause. Corrected PRD + plan in `2631b8f` — Task 0 reduced from a multi-step Vercel audit to "click Resume in Supabase dashboard."
- Saved feedback memory `feedback_simplest_explanation_first.md` to anchor future debugging on simplest causes first and avoid escalating routine ops issues to "critical."

**Deviations:**
- Originally invoked as `/end-session` to close cleanly, then expanded into a multi-turn plan restructure when the user asked whether the plan reflected real shipping work. Three commits + one PRD followed.
- Migration apply scripts blocked by sandbox network (DNS `NXDOMAIN` for `*.supabase.co`, confirmed via direct probe). Same pattern flagged in 04-22 / 04-24 sessions; documented in PRD Task 1 as "use Supabase SQL Editor."
- Initial Task 0 framing for prod-down was overly dramatic (🔴 critical-incident PRD task about Vercel env vars). Corrected to the boring real cause (paused DB, one-click fix). Lesson saved as memory.

**Blockers:**
- Supabase database needs to be resumed before any Phase 0 work proceeds.
- Migrations 004 / 005 / 006 still need to be applied via Supabase SQL Editor (sandbox can't reach Supabase from here — DNS NXDOMAIN).

**Tests:** 135/135 unit pass · TypeScript clean · Build clean · Pre-push hook ran on every push.

### Session — 2026-04-27 (Reviews Collection System)

**Completed:**
- Reviews Collection System (`/spec` — plan: `docs/plans/2026-04-27-reviews-collection-system.md`, PRD: `docs/prd/2026-04-27-reviews-collection-system.md`)
  - `migrations/006_reviews_collection.sql` — `reviews` + `review_requests` tables, `recompute_review_aggregates()` function, `submit_review()` atomic RPC (FOR UPDATE + friendly error mapping), `select_pending_review_events()` cron helper, trigger using `CASE TG_OP` (not COALESCE — avoids PL/pgSQL eager-eval on DELETE)
  - `app/api/events/route.ts` extended — direct-contact branch accepts `professional_slug` (no token), generates `tracking_code = 'direct-{slug}-{nanoid(10)}'`. Returns 400 when both token + slug missing (was 403). Existing concierge path unchanged.
  - `app/components/ContactButton.tsx` fixed — removes `if (attributionToken)` gate; direct contacts now fire `contact_click` events including `reviewer_email` from localStorage. `app/components/ReviewerEmailCapture.tsx` — optional inline email capture on `/p/[slug]` for direct flows.
  - `app/api/contact-email/route.ts` — validates email + writes to recent contact_click event_data (handles post-click email capture).
  - `app/api/cron/send-review-requests/route.ts` — daily 07:00 UTC cron, Bearer CRON_SECRET auth + misconfig guard, calls `select_pending_review_events()` RPC, generates 32-byte tokens, inserts `review_requests` rows, sends Resend email. Email failure = no DB row (cron retries).
  - `lib/email.ts` — added `notifyReviewRequest({ to, professionalName, link })` template.
  - `vercel.json` — added second cron entry `0 7 * * *` for review requests.
  - `app/api/reviews/submit/route.ts` — POST with token validation, calls `submit_review` RPC, maps P0001 errors to friendly Spanish messages. Rate limit 5/hr per IP.
  - `app/r/review/[token]/page.tsx` + `ReviewSubmitForm.tsx` — public no-login submission page with 3 states (valid/consumed/expired). Star picker, optional text + name, thank-you confirmation.
  - `app/p/[slug]/page.tsx` — added `rating_average`, `rating_count`, `id` to interface + select; `getRecentReviews()` helper; Reviews card (hidden when count=0, `data-testid="reviews-card"`).
  - `app/api/admin/reviews/route.ts` + `[id]/route.ts` — GET list with professional name joined; PATCH toggle `is_hidden` (trigger fires → aggregates recompute → ranking updates).
  - `app/admin/reviews/page.tsx` — admin moderation list with search + visibility filter + toggle button.
  - `__tests__/integration/reviews-flow.test.ts` — RPC round-trip: submit → token consumed → aggregates updated → ranking updated. Skips when migration 006 not applied.
  - `__tests__/e2e/reviews.spec.ts` — TS-001 (form + thank-you + consumed), TS-004 cron auth. Cron 401 tests green; DB-dependent skip cleanly.
  - 134/134 unit tests pass · TypeScript clean · Build clean · Cron 401 path E2E verified

**Deviations:**
- Migration 006 written but NOT applied to Supabase in this session (same network constraint as 004/005). Apply before reviews go live: `node scripts/apply-reviews-migration.mjs`.
- TS-003 (admin hide → aggregate recompute) and TS-001 (token submission) require migration 006 + Supabase reachable — skip cleanly.

**Blockers:**
- Apply migration 006 to Supabase. Also apply 004 + 005 if not already done.
- Resend verified domain required before review emails reach real users (`FROM_EMAIL` in `lib/email.ts` is `onboarding@resend.dev`).

### Session — 2026-04-27

**Completed:**
- Destacado Tier — Admin-Gated MVP (`/spec` — plan: `docs/plans/2026-04-24-destacado-tier-mvp.md`, PRD: `docs/prd/2026-04-24-destacado-tier-mvp.md`)
  - `migrations/005_destacado_tier_mvp.sql` — `tier_expires_at` column on professionals + `subscription_payments` table + partial index + updated `recompute_ranking()` trigger (expiry-aware via `IS NULL OR > NOW()` branch — backward compat for legacy destacado rows) + atomic `upgrade_destacado_tier()` RPC with `SELECT ... FOR UPDATE` row lock (race safety) + commented rollback block
  - `scripts/apply-destacado-migration.mjs` — helper to apply migration 005 (mirrors apply-ranking-migration.mjs pattern)
  - `lib/ranking.ts` extended — optional `tierExpiresAt` in `RankingInput`, expiry-aware `computeTierContribution`, new `isEffectivelyDestacado(tier, expiresAt)` helper. `lib/ranking.test.ts` +11 unit tests (29 total).
  - `__tests__/integration/ranking-parity.test.ts` extended — 3 new fixtures (future expiry → 80.00, past expiry → 70.00, retroactive RPC arithmetic). Existing fixture 5 still passes via backward-compat branch.
  - `app/api/admin/subscriptions/route.ts` — `POST` (atomic via `upgrade_destacado_tier` RPC) + `GET ?professional_id=<uuid>` (history). 15 unit tests for validation paths.
  - `app/api/admin/professionals/route.ts` — extended select to include `subscription_tier` + `tier_expires_at`.
  - `app/admin/professionals/page.tsx` — added inline status chip per row ("Destacado hasta DD MMM YYYY" / "Básico"), "Destacar / Extender" button, expand chevron with lazy-loaded payment history.
  - `app/admin/professionals/components/DestacadoPaymentModal.tsx` — payment recording modal with form validation, period presets (30/90/180/365/custom), info banner when extending active subscription. 7 unit tests covering validation, payload shape, info banner, Cancelar/onSuccess flow.
  - `app/profesionales/page.tsx` + `app/p/[slug]/page.tsx` — added Destacado chip with `data-testid="destacado-chip"` gated by `isEffectivelyDestacado()`.
  - `app/api/cron/expire-destacado/route.ts` + `vercel.json` — daily 06:00 UTC cron with Bearer CRON_SECRET auth. 6 unit tests.
  - `app/components/ui/Alert.tsx` — added `role="alert"` (ARIA only; visual unchanged) so the modal's error path is reachable via `getByRole('alert')`.
  - `__tests__/e2e/destacado.spec.ts` — Playwright E2E for TS-001..005. Cron 401/auth tests verified green; DB-dependent tests skip cleanly until migration 005 applied.

**Deviations:**
- Migration 005 written but **not applied to Supabase** in this session (sandbox can't reach the cloud DB — same pattern as Apr 24). Apply manually before integration/E2E go fully green: `node scripts/apply-destacado-migration.mjs` or paste `migrations/005_destacado_tier_mvp.sql` in Supabase SQL Editor.
- TS-001 / TS-005 admin-flow Playwright scenarios are documented as covered by the unit + integration test stack (DestacadoPaymentModal.test.tsx + parity fixture 11 + route.test.ts) rather than a full admin Playwright project — admin storageState setup is left for a future infra PRD.

**Blockers:**
- Apply migration 005 to Supabase to unblock the parity test extensions and E2E DB-dependent tests.

**Tests:** 92/92 unit pass · TypeScript clean · Build clean · Cron 401 path E2E verified.

**RankingInput caller audit** (Task 2 DoD step):
- `__tests__/integration/ranking-parity.test.ts` — fixtures 1-8 intentionally omit `tierExpiresAt` to exercise the backward-compat (null) branch; explicit comment in `parityTest()`. Fixtures 9-11 pass `row.tier_expires_at` from DB.
- `lib/ranking.test.ts` — 11 new test cases pass `tierExpiresAt` explicitly (future, past, null, ISO string).
- No production callers of `RankingInput` outside the helper itself — UI code uses `isEffectivelyDestacado()` directly.

### Archived Sessions
- **2026-04-24**: Directory + Ranking Foundation (`/spec`, plan `docs/plans/2026-04-24-directory-ranking-foundation.md`, PRD `docs/prd/2026-04-24-directory-ranking-foundation.md`) — `migrations/004_ranking_foundation.sql` (5 ranking columns + `recompute_ranking()` trigger NULL-safe + directory index + backfill), `lib/ranking.ts` + 18 unit tests, `__tests__/integration/ranking-parity.test.ts` (8-fixture DB-backed parity), `app/profesionales/page.tsx` server-rendered directory sorted by `ranking_score DESC`, "Ver profesionales" CTA on home, Playwright directory.spec + visual baseline. Sandbox unreachable to Supabase → migration applied later via SQL Editor. Closed the April pivot implementation gap.
- **2026-04-22**: Admin lead detail page (`.omx/plans/prd-admin-lead-detail.md`) — `/admin/leads/[id]` admin-only route + single-lead API at `/api/admin/leads/[id]`, reused status/urgency/match semantics, leads list links into detail while preserving "Crear match" path, unit coverage for the new page. Replaced DB-backed integration test with page-level unit test due to sandbox/Supabase isolation.
- **2026-04-20**: Legal/trust page (`docs/plans/2026-04-20-legal-pages.md`) — unified `/terminosyprivacidad` with two glass cards (Términos + Privacidad), collapsible subsections, anchor links; `/terminos` + `/privacidad` kept as redirects; registration + intake form footers updated. First pass overdesigned (split routes), reworked to single page after review.
- **2026-04-08**: Admin dashboard improvements (`/spec`, VERIFIED) — shared `AdminFilterBar` (search + status dropdown), 3 new admin API routes (`/api/admin/leads` with match-context joins, `/api/admin/professionals`, `/api/admin/pqls`), debug routes deleted, match creation page fixed for `specialties[]` field-type drift; registration full-flow E2E (`__tests__/e2e/registration-full-flow.spec.ts`) with Google Maps mock + image upload + DB cleanup.
- **2026-04-07**: Design system sweep — two passes (`/spec`). Pass 1 (tokens): extracted MODALITY_MAP / STYLE_MAP / STATUS_CONFIG / SERVICE_TYPE_MAP to `lib/design-constants.ts`, ScoreRing + ScoreBreakdown extracted, all `#FBF7F2` → `PageBackground`, `border-white/30` → `border-outline/30`. Pass 2 (real patterns): all Buttons → `rounded-full` pills, home page rework (PageBackground + glass card + privacy footer), Admin leads `Card` → `GlassCard`, identical DOM shells across public pages. First pass criticized as token-only; second pass audited finished pages and built design pattern catalog.
- **2026-04-06**: Test suite hardening (`/spec`, VERIFIED, commit `d6e1c6f`) — behavior-based component tests (Badge / Alert / GlassCard), Clerk removed from admin-auth-gating E2E, content-agnostic ui-smoke, condition-based polling (`expect.poll`) replacing `waitForTimeout`, dialog listener race fixed in admin-match-flow E2E, pre-push hook running unit tests, `test:preflight` script.
- **2026-04-03**: WhatsApp flag dropdown (40-country auto-detect from Google Places, E.164 formatting) + Instagram username validation (auto-strips URLs/@ prefixes); Specialty color system (`/spec`, VERIFIED, 5 commits) — 24 color tokens in `@theme` (12 hues × strong/weak), `SPECIALTY_MAP` 5 → 12 entries, `SpecialtySelector` + `SpecialtyMapper` extracted, all 5 display surfaces updated; Testing infrastructure (`/spec`, VERIFIED) — Vitest workspace (unit + integration projects), 26 component tests across 8 files, Playwright multi-project (public / admin / visual), 4 visual regression baselines.
- **2026-04-02**: Professional approval flow (score model, approve/reject API+UI), registration form expanded (short_description, experience_description, instagram, service_type), profile image upload (Storage helper, FormData, circular preview), phone auto-formatting, live validation, GlassCard/PageBackground/SectionHeader components extracted, admin professionals list rebuilt
- **2026-03-12**: Intake form (`/solicitar`), confirmation page (`/gracias`), email notifications (Resend — `notifyNewLead` + `notifyNewProfessional`), Supabase Auth for admin (replaced Clerk), Google Places Autocomplete, phone validation
- **2026-03-11/12**: Documentation cleanup (16→8 MD files), Claude Code tooling (8 milestones: CLAUDE.md, rules, skills, commands, agents, hooks), design system extraction (Phases 1-2: constants + Chip), professional profile `/p/[slug]` full rebuild (5 glass cards, 6 new DB columns), recommendations page fixes, production deployment fixes (liquid-glass, Upstash Redis), full page/workflow map (27 routes)

## Open Questions

- [ ] What happens when a profile is rejected? Keep data? Allow resubmission? Notify the professional?
- [x] What data should each card in the admin professionals list show? → Name, up to 3 specialty chips (colored), location, status badge (implemented in specialty color system)
- [ ] Should existing 45 professionals get placeholder images, or leave as initial-letter avatars until they re-register?

## Notes

### Business Model Decision Log

#### Apr 1, 2026 — Pivot from PQL-only to Directory + Concierge

**Previous model:** Link-based attribution (PQL). User gets a link → sees 3 recommendations → contacts via WhatsApp → professional gets charged per qualified lead.

**Why we changed:**
- Dispute risk too high: "I didn't get that lead" / "they never contacted me" — more time mediating than earning
- Attribution is fragile: WhatsApp opens in new tab, user might save number and call later, tracking breaks
- Expiring links feel pushy to users and add operational complexity

**New model:** Two-sided marketplace with directory + concierge.
- **Directory** (primary): Professionals ranked by reputation, pay for visibility via subscription tiers
- **Concierge** (differentiator): `/solicitar` flow where admin hand-picks recommendations — keeps the existing matching/tracking infrastructure as an optional premium feature

**What we keep from the old model:**
- Tracking codes, attribution tokens, match creation — all preserved as infrastructure for the concierge flow
- PQL ledger — can be repurposed for concierge lead billing
- Event tracking — useful for analytics and review collection

**What changes:**
- Primary user flow is now Browse → Profile → Contact (not Link → Recommendations → Contact)
- New `/profesionales` directory page ranked by reputation score
- Subscription/tier system for professional visibility
- Review collection system (post-contact, no login required)

#### Ranking System Design

**Ranking score = weighted combination of:**
- Profile completeness (immediate, no user interaction needed)
- Star ratings from verified interactions (post-contact review links)
- Subscription tier (paid boost)

**Reviews without login:**
- After a user contacts a professional (tracked via contact events), send a unique review link via email/WhatsApp
- Review is tied to a real interaction — prevents spam
- No login required, but one review per interaction

**Subscription tiers (start simple):**
- **Básico (free):** Listed in directory, default ranking
- **Destacado (paid):** Higher ranking, visual badge, featured placement on home page
- More tiers/features can be added later

### Pages & Workflows (Full App Map)

#### Público (Lead)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/` | **Done** | Home page — glass card, pill CTAs, PageBackground, dual CTA |
| 2 | `/r/[tracking_code]` | Exists | Concierge recommendations (kept for concierge flow) |
| 3 | `/solicitar` | **Done** | Concierge intake form |
| 4 | `/gracias` | **Done** | Confirmation post-solicitud |
| 5 | `/profesionales` | **Done** | Public directory ranked by ranking_score DESC — shipped 2026-04-24 |
| 6 | `/ayuda` | **New — Phase 3** | Soporte / recuperación de link / errores comunes |

#### Público (Profesional)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/p/[slug]` | **Done** | Perfil público — 5 glass cards, design system |
| 2 | `/profesionales/registro` | **Done** | Registration form (now collects all fields + image) |
| 3 | `/profesionales/registro/confirmacion` | **Done** | Registration confirmation |

#### Admin / Ops

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/admin/leads` | **Done** | Bandeja de solicitudes — GlassCard, Spanish copy |
| 2 | `/admin/leads/[id]` | **Done** | Detalle de solicitud con contacto, contexto, needs y match actual |
| 3 | `/admin/leads/[id]/match` | **Done** | Crear match — GlassCard, Spanish copy, AdminLayout |
| 4 | `/admin/professionals` | **Done** | Listado profesionales grouped by status + inline Destacado tier management (modal, status chip, payment history expand) — added 2026-04-27 |
| 5 | `/admin/professionals/[id]/review` | **Done** | Admin review page with score + approve/reject |
| 6 | `/admin/professionals/[id]` | **New — Phase 3** | Professional detail (reviews, rating, tier) |
| 7 | `/admin/analytics` | **New — Phase 3** | Dashboard: funnel + directory metrics |
| 8 | `/admin/settings` | **New — Phase 3** | Configuración operativa |
| 9 | `/admin/pqls` | **Done** | Ledger PQL — GlassCard, Modal, Spanish copy, AdminLayout |
| 10 | `/admin/matches` | Deprioritized (pivot) | Listado de matches / tokens — may revisit for concierge |
| 11 | `/admin/matches/[id]` | Deprioritized (pivot) | Detalle de match: link, estado, vencimiento, timeline |
| 12 | `/admin/events` | Deprioritized (pivot) | Eventos crudos / auditoría (contact_click, etc.) |

#### Legales / Confianza

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/terminosyprivacidad` | **Done** | Página legal unificada con secciones de términos y privacidad |
| 2 | `/privacidad` | Redirect | Redirige al ancla de privacidad en `/terminosyprivacidad` |
| 3 | `/terminos` | Redirect | Redirige al ancla de términos en `/terminosyprivacidad` |

#### Futuro (Phase 4)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/pro` | **New** | Home profesional autenticado |
| 2 | `/pro/leads` | **New** | Visibilidad de leads para el profesional |
| 3 | `/pro/analytics` | **New** | Performance por profesional |

### Real Backlog (folded into Roadmap phases)

Items below are tracked in the Roadmap above. Listed here only for cross-reference and to record what's intentionally *not* committed.

**Phase 0 (this week):** apply migrations 004/005/006 · verify Resend domain · visual QA · image upload e2e · decide rejected profile flow · smoke test all 3 flows

**Phase 1 (2–3 weeks):** Sentry + Vercel Analytics · cron jobs (reconciliation + event purge + destacado expiry) · onboard first 10 professionals · handle first 5 concierge requests

**Phase 2 (1–2 months):** Self-serve Destacado checkout (MercadoPago) · directory filters + search · renewal reminders · AFIP invoicing automation

**Phase 3 (2–3 months):** /pro/* portal · admin detail pages

### Deferred (no commitment — revisit only on real-user signal)

The product is not yet live. The items below are speculative polish, pre-mature optimization, or low-impact bugs. They stay deferred until a real user reports specific friction or a phase-gate definition of done requires them.

**Known low-impact bugs** *(deferred)*
- BottomSheet has no backdrop animation (no dimming overlay behind sheet)
- Backdrop-filter blur delay on card swipe (Chrome bug — `KNOWN_ISSUES.md`)
- PQL adjustment modal sends `{ amount, reason }` but API expects `{ adjustment_type, reason, billing_month }` (pre-existing — admin can adjust via DB if needed)
- Google Places autocomplete arrow-key feel

**Animation / micro-interactions** *(deferred)* — confetti on contact, success animation after WhatsApp opens, spring physics on swipe, drag resistance curves, momentum/bounce, staggered chip entrances, progress dot animations, shimmer on loading, text reveal animations, card deck depth shadows, micro-haptics, more delightful entrance on reveal screen, better card typography hierarchy, WhatsApp button pulse animation.

**Visual / theming** *(deferred)* — dark mode, hover states for desktop, Moonly-style card redesign exploration, background SVG adjustment, admin dashboard design polish, AnimatedIcon component.

**Design system extraction (remaining)** *(do as needed, not as a sweep)* — AvatarPlaceholder, PrivacyNotice, FormField. Extract only when the next page that needs one shows up.

**Performance targets as a checklist** *(replaced by Phase 1 Lighthouse CI)* — Lighthouse > 90, LCP < 2.5s, FID < 100ms, CLS < 0.1, TTFB < 800ms, API < 500ms, page load < 3s on 3G, TTI < 5s, first-load JS < 100KB. **Action:** establish Lighthouse CI in Phase 1; address regressions when they appear, not as a checklist of targets up front.

**Accessibility above WCAG AA** *(deferred)* — high contrast mode, full WCAG AAA. **Target stays AA.** Focus traps for modals + skip nav + screen reader announcements should land case-by-case during regular component work, not as a sweep.

**Infra hardening** *(deferred unless concrete signal)* — Cloudflare proxy/WAF, advanced DDoS rules, log aggregation, uptime monitoring beyond Vercel built-in, contract tests for validation rules, CI/CD workflow (GitHub Actions), `npm ci` lockfile verification in CI. Vercel + Sentry + the existing pre-push hook covers the realistic threat model for a pre-launch product.

**SEO / content polish** *(deferred until post-launch)* — meta tag audit in prod, Open Graph images, custom 404 page, full Spanish copy audit. Defer until there's traffic worth optimizing for.

**Misc deferred items**
- **Infrastructure heartbeats (n8n)** — daily workflow that pings `/api/cron/heartbeat` (TODO: build) which touches Supabase + Upstash. Prevents free-tier auto-pause/auto-delete on both. Folds in beside the existing Destacado + review-request workflows. *(Build alongside cron PRD Task 4; without this, both DBs will degrade again.)*
- **Reactivate Upstash before public launch** — currently in stuck "pending restore" state, not blocking thanks to fail-open. Either wait it out, create a fresh free-tier DB, or upgrade to paid. *(Decide before public launch when rate-limit protection becomes meaningful.)*
- Email: send copy to person who submitted *(unblocked now that Resend domain is verified — implement when needed)*
- Reconciliation API endpoint (`/api/admin/reconciliation`) — for concierge flow
- Custom-hook unit tests (`useRecommendations`, `useSwipeGesture`, etc.)
- E2E for admin review flow *(needs admin storageState — defer until admin auth stable)*
- Pre-merge checklist for the 7 QA rules
- `FINAL_SPEC.md` drift prevention discipline
- Lazy-load BottomSheet if it grows past 200 lines
- README reference cleanup (deleted `CODE_QUALITY_AUDIT_2026-01-06.md`, week-summary path)

### Working rules (from CLAUDE.md)
1. Never delete information without preserving it first
2. Do not assume — verify
3. Discuss before executing
4. Do not take shortcuts
5. One thing at a time, test after every change
6. Check the dev server before sending URLs
7. Read before writing
8. Track everything in this plan file

### Bugs fixed in previous sessions
- `/p/[slug]` specialty vs specialties column name — fixed
- `/p/[slug]` using Tailwind grays — fixed (now uses design system)
- E2E seed invalid tracking code — fixed
- Duplicate SPECIALTY_MAP and isValidReason — fixed (moved to lib/design-constants.ts)
- liquid-glass backdrop-filter dropped in production — fixed (using @apply)
- Upstash Redis 503 on Vercel — fixed (Marketplace integration)

### Auth decisions
- Clerk removed — was never configured, no reason to keep a third service
- Supabase Auth chosen because we already use Supabase and professionals will need accounts later for `/pro/*` portal
- Middleware changed from fail-closed-503 to redirect-to-login pattern
- Admin user created manually in Supabase Auth dashboard for now

### Infrastructure decisions

**Rate limiting (Upstash Redis) — fail open by design.** The original `lib/rate-limit.ts` was fail-closed in production for PQL billing fraud concerns. Post-pivot PQL is optional infrastructure, so the calculus flipped: a Redis hiccup taking down every public POST endpoint is far worse than a brief unprotected window. As of `987b40e` (2026-05-01) the limiter logs and returns `{success: true}` on any Redis error — endpoint behavior is unchanged when Redis is healthy, and a noisy log when it's not. The 4 callsites (`/api/waitlist`, `/api/events`, `/api/reviews/submit`, `/api/public/recommendations`) need no per-route try/catch.

**Upstash free-tier auto-deletion (2026-05-01 incident).** Free-tier Redis DBs are deleted after extended inactivity, and a "Restore" can sit pending indefinitely. We hit this; rather than wait, the plan is: stay on free tier through pre-launch (zero traffic = no rate-limit value lost), then either (a) add a daily heartbeat workflow in n8n that does `INCR` on a sentinel key to keep the DB warm, or (b) move to Upstash paid (~$0.20/100k req). Same pattern applies to the Supabase free-tier auto-pause we already documented — both should share a single "infrastructure heartbeats" workflow in n8n alongside the Destacado-expiry + review-request crons.

**The fail-open behavior also means we can defer reconnecting Upstash entirely.** The site works in both states; only rate-limit protection is gone when Redis is down. Fix for real before we have traffic worth protecting from.

### Email decisions
- Resend chosen for simplicity (one API call, good Next.js integration, free tier 3,000/month)
- Production sender = `Hará Match <hola@haravital.app>` with `replyTo: centrovitalhara@gmail.com` (verified 2026-05-01). No mailbox needed at haravital.app — replies route via gmail. Cloudflare email forwarding considered and skipped (rare for users to compose fresh emails to a domain address; reply path covers ~all cases).
- Admin notifications (`notifyNewLead`, `notifyNewProfessional`) go to `centrovitalhara@gmail.com` (was `mariabmontoya@gmail.com` while domain was unverified).
- `lib/email.ts` has both `notifyNewLead()` and `notifyNewProfessional()` ready
- `create-lead.ts` server action has `additional_context` field but it doesn't exist in DB schema — skipped for now
- Email now includes deep link to admin review page (added 2026-04-02)

### Google Places in intake form
- PlacesAutocomplete component already existed, reused it
- Returns city, country, countryCode from selected place — replaces manual country dropdown
- Arrow key selection in Places dropdown may have minor issues (noted by user, not investigated yet)

### Key files reference
- `docs/DONE.md` — All completed work
- `CLAUDE.md` — Project guide and working rules
- `FINAL_SPEC.md` — Database schema (source of truth)
- `.claude/README.md` — Tooling reference
- `lib/profile-score.ts` — Profile scoring helper (10 criteria, 100 points)
- `lib/storage.ts` — Supabase Storage helper for profile images
- `lib/design-constants.ts` — SPECIALTY_MAP (12), SPECIALTY_COLORS (12), CURATED_SPECIALTY_KEYS, animation constants, MODALITY_MAP, STYLE_MAP, STATUS_CONFIG, SERVICE_TYPE_MAP
- `app/admin/professionals/[id]/review/components/ScoreDisplay.tsx` — ScoreRing + ScoreBreakdown (extracted from review page)
- `app/components/ui/Chip.tsx` — Chip with `specialty` prop (discriminated union) + 5 semantic variants
- `app/components/ui/GlassCard.tsx` — Reusable glass card component
- `app/components/ui/PageBackground.tsx` — Reusable page background component
- `app/components/ui/SectionHeader.tsx` — Reusable section header label
- `app/profesionales/registro/components/SpecialtySelector.tsx` — Specialty toggles + custom fields
- `app/admin/professionals/[id]/review/components/SpecialtyMapper.tsx` — Admin specialty mapping dropdown
- `vitest.workspace.ts` — Vitest workspace (unit + integration projects)
- `playwright.config.ts` — Playwright multi-project (public, admin, visual)
- `app/admin/components/AdminFilterBar.tsx` — Shared search + status filter component for admin list pages
- `app/api/admin/leads/route.ts` — Leads list API with match context joins
- `app/api/admin/professionals/route.ts` — Professionals list API (replaced debug route)
- `app/api/admin/pqls/route.ts` — PQLs list API (replaced debug route)
- `__tests__/e2e/registration-full-flow.spec.ts` — Full 4-step registration E2E with Google Maps mock + image upload + DB cleanup
- `docs/plans/` — Spec-driven plans (specialty-color-system, testing-infrastructure, design-system-sweep, test-suite-hardening, registration-full-flow-e2e, admin-dashboard-improvements, directory-ranking-foundation, destacado-tier-mvp)
- `lib/ranking.ts` — TS ranking formula helper (`computeRankingScore`, `isEffectivelyDestacado`) — must stay in sync with `migrations/004_ranking_foundation.sql` AND `migrations/005_destacado_tier_mvp.sql`
- `migrations/004_ranking_foundation.sql` — Ranking columns + `recompute_ranking()` trigger — **apply to Supabase before running integration tests**
- `migrations/005_destacado_tier_mvp.sql` — `tier_expires_at` column + `subscription_payments` table + expiry-aware trigger + `upgrade_destacado_tier()` RPC — **apply after 004**
- `app/profesionales/page.tsx` — Public directory page (server component, sorted by `ranking_score DESC`, Destacado chip)
- `app/p/[slug]/page.tsx` — Public profile page (Destacado chip near name)
- `app/admin/professionals/page.tsx` + `components/DestacadoPaymentModal.tsx` — Admin tier management UI (modal, row chip, expand history)
- `app/api/admin/subscriptions/route.ts` — POST upgrade + GET history (admin only via middleware)
- `app/api/cron/expire-destacado/route.ts` + `vercel.json` — Daily cron for tier cleanup (Bearer CRON_SECRET auth)
- `__tests__/integration/ranking-parity.test.ts` — DB-backed parity test (TS ↔ SQL formula + RPC arithmetic)
- `scripts/apply-ranking-migration.mjs` — Apply migration 004 to Supabase
- `scripts/apply-destacado-migration.mjs` — Apply migration 005 to Supabase
- `docs/prd/` — Product Requirements Documents (directory-ranking-foundation, destacado-tier-mvp, reviews-collection-system, + future PRDs)
- `migrations/006_reviews_collection.sql` — reviews + review_requests + submit_review() RPC + aggregate trigger — **apply after 004 + 005**
- `scripts/apply-reviews-migration.mjs` — apply migration 006 to Supabase
- `app/components/ContactButton.tsx` — fixed: now fires events for direct contacts (was skipping)
- `app/components/ReviewerEmailCapture.tsx` — optional email capture on /p/[slug]
- `app/api/cron/send-review-requests/route.ts` — daily review request email cron (07:00 UTC)
- `app/api/reviews/submit/route.ts` — token-gated review submission
- `app/r/review/[token]/page.tsx` — public review form (no login required)
- `app/admin/reviews/page.tsx` + `/api/admin/reviews/` — admin moderation with is_hidden toggle

### Seed data
- Run `npm run qa:seed-e2e` to seed 4 professionals + 1 lead + 1 match with 3 recommendations
- `scripts/migrate-review-flow.mjs` — sets all professionals to `submitted` for testing
- Current tracking code changes on each seed run (uses `generateTrackingCode()`)
- Check `.e2e-test-data.json` for the latest tracking code after seeding

### Deployment
- Auto-deploys on push to main via Vercel
- Upstash Redis connected via Vercel Marketplace integration
- All env vars set in Vercel
- Live at https://hara-weld.vercel.app
- **New env vars needed in Vercel for latest deploy:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`

### Packages
- `@supabase/ssr` — Supabase server-side auth for Next.js
- `resend` — transactional email API
- `libphonenumber-js` — phone number validation and formatting by country
- `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event` — component testing
- `jsdom` — browser environment for Vitest unit tests
- `@vitejs/plugin-react` — JSX transform for Vitest jsdom environment

### Supabase Storage
- Bucket: `profile-images` (public access, created 2026-04-02)
- Images stored as `{professionalId}.{ext}` — one per professional, upsert on re-upload
- Max 5 MB, JPG/PNG/WebP only
- Upload happens after DB insert (needs the ID for the file path)
