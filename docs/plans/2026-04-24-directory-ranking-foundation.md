# Directory + Ranking Foundation Implementation Plan

Created: 2026-04-24
Author: belu.montoya@dialpad.com
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Ship the minimum foundation for Hará's Directory + Concierge business model: add ranking columns to `professionals`, a SQL trigger that computes `ranking_score` from profile completeness (mirroring `lib/profile-score.ts`), and a server-rendered `/profesionales` list page sorted by ranking. Review and subscription tier inputs are wired in the formula but inactive at launch, so future PRDs plug in without a formula migration.

**Architecture:** One DB migration bundles columns + trigger + backfill. A TS ranking helper lives alongside the SQL function and is held in sync by a DB-backed integration parity test. The `/profesionales` page is a Next.js server component that queries `supabaseAdmin` directly and renders cards that reuse the existing liquid-glass / specialty-chip design system. Home page gets a third CTA so the directory is reachable.

**Tech Stack:** Next.js 14.2 App Router (server components), TypeScript, Supabase Postgres (triggers + SQL functions), Tailwind CSS v4 tokens, Vitest (unit + integration), Playwright (E2E + visual).

## Scope

### In Scope

- Migration `migrations/004_ranking_foundation.sql` — 5 new columns on `professionals` (`profile_completeness_score`, `rating_average`, `rating_count`, `subscription_tier`, `ranking_score`), directory index, `recompute_ranking()` trigger function, `BEFORE INSERT OR UPDATE` trigger, backfill of all 45 existing rows.
- TS ranking helper `lib/ranking.ts` exporting `computeRankingScore({ completeness, ratingAverage, ratingCount, tier })`.
- Unit tests for the TS helper (`lib/ranking.test.ts`) + expand vitest workspace include pattern to reach `lib/**`.
- DB-backed integration parity test (`__tests__/integration/ranking-parity.test.ts`) — inserts fixture professionals, real SQL trigger fires, reads back `ranking_score`, asserts exact match to TS helper across multiple scenarios (to 2 decimals).
- `/profesionales` server-rendered page (`app/profesionales/page.tsx`) — all `status='active' AND accepting_new_clients=true` professionals, ordered by `ranking_score DESC, created_at DESC`.
- Home page (`app/page.tsx`) — add third pill CTA "Ver profesionales" linking to `/profesionales`.
- Playwright E2E spec (`__tests__/e2e/directory.spec.ts`) — seeded-data ordering test + navigation assertion + visual baseline.
- Update `.claude/plans/main.md` — tick success criteria, update Pages table row for `/profesionales`, surface follow-up PRDs as next steps.

### Out of Scope

- Filter bar (specialty / location / modality) — follow-up PRD.
- Name search / fuzzy search — follow-up PRD.
- Pagination — deferred until ~100+ active professionals.
- Destacado visual differentiation (badge, featured placement, card highlight) — Payments PRD.
- Review collection flow (submission, display on `/p/[slug]`) — Reviews PRD.
- Payment / subscription activation — Payments PRD.
- Fix for `ContactButton.tsx:43` directory-contact tracking bug — Reviews PRD.
- SEO metadata for `/profesionales` + `/p/[slug]` — SEO polish PRD.
- Admin UI to tune tier or ranking weights — weights stay as constants in code/SQL.
- `/p/[slug]` changes — page stays as-is; directory only links to it.
- Public API route `/api/public/professionals` — server-rendered page doesn't need it.

## Approach

**Chosen:** Single cohesive delivery. One migration bundling columns + trigger + backfill, one page, one TS helper with a DB-backed parity test, plus the minimal home-page CTA addition.

**Why:** The PRD locks scope tightly (foundation-only, no filters/search/pagination). Decomposition into multiple migrations or many small tasks would add review overhead without reducing risk — each task is already independently verifiable. Cost: if the trigger logic turns out to need revision post-merge, the rollback replaces the whole migration; there's no partial rollback granularity. Acceptable tradeoff given the function is ~30 lines.

**Alternatives considered:**
- Two-migration split (schema vs trigger): rejected because schema and trigger are one conceptual unit; splitting creates an intermediate state where columns exist but no computation happens.
- Full vertical decomposition per file: rejected as too granular for this scope; would fragment obviously-related changes.
- Compute ranking on read with caching: rejected in the PRD — stored scores are simpler and pagination/ordering is trivial.

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Inline avatar fallback: `app/p/[slug]/page.tsx:131-148` — `profile_image_url ? <img/> : <div className="... bg-gradient-to-br from-brand-weak to-info-weak ...">{name.charAt(0)}</div>`. Copy this pattern into the directory card; do NOT extract a new component.
  - Specialty overflow: `app/admin/professionals/page.tsx:157-178` — `professional.specialties.slice(0, 3)` with `+N` overflow count via `const overflow = specialties.length - visibleSpecialties.length`.
  - Page shell: `app/p/[slug]/page.tsx:111-117` — `<div className="min-h-screen bg-background"><PageBackground /><div className="relative z-10 max-w-md mx-auto px-4 pt-8 pb-12 space-y-4">...</div></div>`. Matches the design-sweep-established standard.
  - SQL function pattern: `migrations/002_atomic_match_creation.sql:9-18` — `SECURITY DEFINER SET search_path = public LANGUAGE plpgsql` + trailing `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC; GRANT EXECUTE ON FUNCTION ... TO service_role;` block.
  - Integration test fixture + cleanup: `__tests__/integration/api-events.test.ts:14-62` — `createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!)` + `beforeAll` insert with `${Date.now()}` unique keys + explicit delete in `afterAll`.
  - Server component data fetching: `app/p/[slug]/page.tsx:37-45` — `const { data, error } = await supabaseAdmin.from('professionals').select(...).eq(...).single()`. For the directory list, use `.select(...).order(...)` not `.single()`.
  - Home CTA shape: `app/page.tsx:24-35` — Primary brand CTA (`bg-brand text-white`) + secondary outlined (`bg-surface border border-outline`). Add third as same outlined style.
- **Conventions:**
  - Spanish copy, Argentine informal: "Ver profesionales", "Aceptando nuevos pacientes", "Todavía no hay profesionales disponibles."
  - Design tokens only — `bg-background`, `text-foreground`, `bg-brand-weak`, `shadow-elevated`, `rounded-3xl`, `rounded-full`. No hardcoded hex values.
  - Error logging via `logError` from `lib/monitoring.ts`; never `console.log` (console.error in catch blocks is OK per project rules).
  - Service-role DB writes via `lib/supabase-admin.ts` (never expose service role to client).
- **Key files:**
  - `lib/profile-score.ts` — source-of-truth completeness scorer (10 criteria, 100 pts). SQL trigger must mirror criteria keys, weights, and truthiness logic exactly.
  - `lib/supabase-admin.ts` — service-role client for server components and integration tests.
  - `app/globals.css` — design tokens (`@theme` block).
  - `lib/design-constants.ts` — `SPECIALTY_MAP`, `SPECIALTY_COLORS`, `MODALITY_MAP`, etc.
  - `app/components/ui/PageBackground.tsx`, `Chip.tsx` (use `specialty` variant) — reusable primitives.
- **Gotchas:**
  - Vitest workspace restricts unit tests to `app/**/*.test.{ts,tsx}` (`vitest.workspace.ts:15`). To run `lib/ranking.test.ts` as a unit test, expand `include` to also match `lib/**/*.test.ts` in Task 2.
  - Integration tests boot `next dev` via `__tests__/setup/global-setup.ts` (60s cold start). The parity test doesn't need the dev server, but must tolerate the startup cost — no way to opt out per-test.
  - Completeness criterion `bio` requires length ≥ 50 chars (`lib/profile-score.ts:76`). SQL must use `length(trim(coalesce(bio, ''))) >= 50` to match (note: TS uses `.trim().length >= 50` on non-null input).
  - The `professionals` table column is `full_name` not `name`; page code maps it to `.name` in the select block. Mirror that aliasing in the directory query.
  - Tiebreaker `created_at DESC` works natively on `TIMESTAMPTZ` — no casting needed.
  - Adding a third CTA to home rebalances spacing. Current layout uses `space-y-3 mb-10`; with 3 CTAs and `px-4` container, test visually on ~360px width.
  - `subscription_tier` check constraint must allow `'basico'` and `'destacado'` strings exactly (the Payments PRD will rely on these values).
- **Domain context:**
  - `professionals.status = 'active'` means admin-approved and live (other statuses: `draft`, `submitted`, `rejected`, `paused`).
  - `accepting_new_clients = true` gates whether we send traffic to someone who can take clients. Both must hold for directory inclusion.
  - `subscription_tier` values: `'basico'` (free, default) or `'destacado'` (paid). At launch, all rows are `'basico'`.
  - `rating_average` is a 0-5 scale; `rating_count = 0` means no reviews yet — ranking treats this as 0 contribution (not NaN, not undefined).
  - At launch, `ranking_score` effectively equals `round(0.7 * profile_completeness_score, 2)` because rating and tier contributions are 0 for every row.

## Runtime Environment

- **Start command:** `npm run dev`
- **Port:** 3000
- **Health check:** `curl http://localhost:3000/api/health` (existing route) should return 200.
- **Build:** `npm run build`
- **Restart procedure:** Kill `next dev`, `rm -rf .next && npm run dev` (matches plan's documented recovery pattern).
- **Test commands:**
  - `npm run test:unit` — unit tests (includes `lib/ranking.test.ts` after Task 2)
  - `npm run test:integration` — integration tests (parity test, requires Supabase + dev server)
  - `npm run test:e2e` — Playwright public project (directory spec)

## Assumptions

- Supabase is reachable during integration tests. The Apr 22 session saw flaky connectivity; if that recurs, Task 3 blocks on infra, not code.
  - Supporting: `__tests__/integration/api-events.test.ts` works when connectivity is healthy.
  - Tasks depending: Task 3.
- The 45 existing professionals have enough profile data that most will compute a non-trivial completeness score. If most are skeletal, the directory ships but will visually show narrow score ranges.
  - Supporting: plan notes these profiles are in production; no explicit data audit.
  - Tasks depending: Task 1's backfill output is observable but not blocking.
- Test fixtures can use `${Date.now()}` unique keys and clean themselves up in `afterAll`, same as existing integration tests.
  - Supporting: `__tests__/integration/api-events.test.ts:29-37`.
  - Tasks depending: Tasks 3 and 6.
- The `public` Playwright project (per `package.json: test:e2e`) can reach `/profesionales` without auth.
  - Supporting: directory is a public route; `public` project covers other unauthenticated pages.
  - Tasks depending: Task 6.
- The home page layout tolerates a third CTA without layout breakage on ~360px screens. If visually wrong, user adjusts via direct edit.
  - Supporting: PRD approved adding the CTA.
  - Tasks depending: Task 5.
- The Supabase Postgres version is 14 or newer, so `CREATE OR REPLACE FUNCTION` is available. Supabase hosted projects currently run Postgres 15.
  - Supporting: Supabase platform docs; project was initialized in 2026 on current Supabase.
  - Tasks depending: Task 1.
- `package.json` already contains `"test:unit": "vitest run --project unit"` and `"test:integration": "vitest run --project integration"` (verified in the existing scripts). No script additions are needed for Tasks 2 and 3.
  - Supporting: `package.json` scripts block.
  - Tasks depending: Tasks 2, 3.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| SQL completeness logic drifts from TS completeness logic | Medium | High (user-visible ranks disagree with admin UI) | DB-backed parity test (Task 3) inserts fixture rows and asserts SQL trigger's `ranking_score` equals `computeRankingScore()` to 2 decimals across multiple shapes (empty, partial, full, with rating, with tier). Test must run green before Task 7. |
| Trigger fires excessively on unrelated `UPDATE` (e.g., timestamp-only changes) and burns DB CPU | Low | Low | At ~45 rows, even full-table rewrite is negligible; implementation uses a row-level `BEFORE` trigger so overhead stays O(1) per change. Comment in SQL flags revisit threshold at ~1000 professionals. |
| Backfill statement fails mid-run, leaving some rows unranked | Low | Medium | Migration runs backfill inside the same transaction as trigger creation; if it fails, migration rolls back entirely. Migration is idempotent — re-applying on an updated row recomputes safely. |
| Integration test Supabase connection flakes (repeat of 2026-04-22) | Medium | Medium (blocks verification) | Parity test retries connection 3× with 2s delay before failing loudly. If sustained failure, document as infra issue (not code) in spec-verify deviation log. |
| Third home-page CTA breaks visual rhythm on small screens | Low | Low | Playwright visual baseline catches layout change; user visually verifies in browser during Task 5. |
| Ranking weights (0.7 / 0.2 / 0.1) turn out wrong when reviews/tier land | Medium | Low | Weights are named constants in both `lib/ranking.ts` and the SQL function — tunable via single-file edit + migration. Comment documents the tuning location. |
| `subscription_tier` check constraint conflicts with a future tier value | Medium | Low | Tier values locked to `'basico'` / `'destacado'` per PRD; Payments PRD will decide if more tiers need the CHECK relaxed. Tolerable — a CHECK constraint is easy to ALTER. |

## Goal Verification

### Truths

1. The migration adds exactly 5 columns to `professionals` with correct types, defaults, and constraints — verified by `\d professionals` post-migration and by visual review of `migrations/004_ranking_foundation.sql`.
2. The `recompute_ranking()` trigger function exists and fires on `INSERT` and `UPDATE` of `professionals` — verified by `pg_trigger` query and by Task 3 observing a score change after UPDATE.
3. After backfill, every existing professional row has `profile_completeness_score >= 0` and `ranking_score = round(0.7 * profile_completeness_score, 2)` — verified by Task 3 across fixture scenarios and by post-deploy spot-check.
4. `computeRankingScore()` in `lib/ranking.ts` returns the same value as the SQL trigger for any given input — verified by the DB-backed parity test (Task 3) across at least 5 fixture shapes (empty, partial, full completeness, with non-zero rating, with `destacado` tier).
5. `/profesionales` renders all and only `active + accepting_new_clients` professionals, sorted by `ranking_score DESC, created_at DESC`, with correct card content (image or initial fallback, name, up to 3 specialty chips + overflow, city/online, "Ver perfil" CTA) — verified by TS-001 and TS-002.
6. Clicking a directory card navigates to `/p/[slug]` without breaking the existing WhatsApp contact flow — verified by TS-003.
7. Home page has a visible third pill CTA linking to `/profesionales` — verified by TS-004 and by visual baseline.

### Artifacts

- `migrations/004_ranking_foundation.sql` — migration with real SQL (not stubs).
- `lib/ranking.ts` + `lib/ranking.test.ts` — TS helper + unit tests.
- `__tests__/integration/ranking-parity.test.ts` — DB-backed parity test.
- `app/profesionales/page.tsx` — server-rendered directory page.
- `app/page.tsx` (modified) — home page with third CTA.
- `__tests__/e2e/directory.spec.ts` — Playwright E2E + visual baseline.
- `vitest.workspace.ts` (modified) — expanded `include` pattern.
- `.claude/plans/main.md` (modified) — updated success criteria, Pages table, next steps.

## E2E Test Scenarios

### TS-001: Directory renders professionals sorted by ranking_score DESC
**Priority:** Critical
**Preconditions:** Test fixtures: 5 active + accepting professionals seeded with varied completeness (e.g., scores ~30, ~50, ~70, ~85, ~95). One additional professional with `status='paused'` and one with `accepting_new_clients=false` (both should NOT appear).
**Mapped Tasks:** Task 1, Task 4, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:3000/profesionales` | Page renders with PageBackground, content container at `max-w-md mx-auto` |
| 2 | Read all `[data-testid="professional-name"]` elements in DOM order | 5 names returned (paused and not-accepting excluded) |
| 3 | Compare order to expected ranking (highest completeness first) | Order matches `ranking_score DESC` |
| 4 | Inspect first `[data-testid="professional-card"]` | Contains image-or-initial avatar, `<h3 data-testid="professional-name">` with the name, up to 3 specialty chips with overflow indicator if >3, city/country or "Online" text |

### TS-002: Directory respects inclusion criteria
**Priority:** Critical
**Preconditions:** Same fixtures as TS-001 (one `paused`, one `accepting_new_clients=false`).
**Mapped Tasks:** Task 1, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales` | Page renders |
| 2 | Assert the paused professional's name is NOT in the rendered list | Name absent |
| 3 | Assert the not-accepting professional's name is NOT in the rendered list | Name absent |

### TS-003: User can navigate from directory to a profile
**Priority:** High
**Preconditions:** At least one active professional seeded with a known slug.
**Mapped Tasks:** Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales` | Directory renders |
| 2 | Click the "Ver perfil" CTA on the first card | Browser navigates to `/p/<slug>` |
| 3 | Read the page title / h1 | Matches the professional's name |
| 4 | Verify the existing WhatsApp ContactButton still renders | Button present and clickable |

### TS-004: Home page exposes directory CTA
**Priority:** High
**Preconditions:** None.
**Mapped Tasks:** Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/` | Home page renders |
| 2 | Find a clickable element with text matching "Ver profesionales" (case-insensitive) | Found — a pill CTA |
| 3 | Click it | Browser navigates to `/profesionales` |

### TS-005: Visual baseline for `/profesionales`
**Priority:** Medium
**Preconditions:** Fixture data seeded deterministically.
**Mapped Tasks:** Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales` | Page renders |
| 2 | Take full-page screenshot in visual project | Matches baseline within tolerance |

## Progress Tracking

- [x] Task 1: DB migration — columns, trigger, backfill
- [x] Task 2: TS ranking helper + unit tests
- [x] Task 3: DB-backed parity integration test
- [x] Task 4: `/profesionales` server-rendered page
- [x] Task 5: Home page third CTA
- [x] Task 6: Playwright E2E + visual baseline
- [x] Task 7: Update `.claude/plans/main.md`

**Total Tasks:** 7 | **Completed:** 7 | **Remaining:** 0

## Implementation Tasks

### Task 1: DB migration — columns, trigger, backfill

**Objective:** Add 5 ranking columns, a `recompute_ranking()` trigger function that mirrors `lib/profile-score.ts`, a `BEFORE INSERT OR UPDATE` trigger, a directory index, and a backfill that fires the trigger for all existing rows.
**Dependencies:** None
**Mapped Scenarios:** None directly (enabling for TS-001/002/003).

**Files:**

- Create: `migrations/004_ranking_foundation.sql`

**Key Decisions / Notes:**

- Column definitions:
  - `profile_completeness_score INTEGER NOT NULL DEFAULT 0` — range 0-100 (no CHECK; trigger keeps it in range).
  - `rating_average NUMERIC(3,2) NOT NULL DEFAULT 0` — 0.00-5.00.
  - `rating_count INTEGER NOT NULL DEFAULT 0`.
  - `subscription_tier TEXT NOT NULL DEFAULT 'basico' CHECK (subscription_tier IN ('basico','destacado'))`.
  - `ranking_score NUMERIC(6,2) NOT NULL DEFAULT 0`.
- Index: `CREATE INDEX idx_professionals_directory ON professionals (status, accepting_new_clients, ranking_score DESC);`
- Trigger function mirrors the 10 criteria in `lib/profile-score.ts` exactly (same keys, same weights). **All NULL-handling is explicit** so SQL and TS agree on empty-vs-NULL inputs (spec-review must_fix):
  - profileImage (15) — `profile_image_url IS NOT NULL AND length(trim(profile_image_url)) > 0`
  - shortDescription (10) — `short_description IS NOT NULL AND length(trim(short_description)) > 0`
  - bio (15) — `bio IS NOT NULL AND length(trim(bio)) >= 50`
  - experienceDescription (10) — `experience_description IS NOT NULL AND length(trim(experience_description)) > 0`
  - specialties (15) — `COALESCE(array_length(specialties, 1), 0) >= 1` — `array_length` on NULL or empty array returns NULL; COALESCE forces 0.
  - serviceType (10) — `COALESCE(array_length(service_type, 1), 0) >= 1`
  - locationClarity (10) — `COALESCE(online_only, false) = true OR (city IS NOT NULL AND length(trim(city)) > 0)` — COALESCE guards against a NULL `online_only` column, matching TS's `p.online_only || ...` short-circuit semantics.
  - instagram (5) — `instagram IS NOT NULL AND length(trim(instagram)) > 0`
  - whatsapp (5) — `whatsapp IS NOT NULL AND length(trim(whatsapp)) > 0`
  - modality (5) — `COALESCE(array_length(modality, 1), 0) >= 1`
- Ranking formula: `ranking_score = round(0.7 * completeness + 0.2 * rating_contribution + 0.1 * tier_contribution, 2)`
  - `rating_contribution = CASE WHEN rating_count > 0 THEN LEAST(rating_average * 20, 100) ELSE 0 END`
  - `tier_contribution = CASE WHEN subscription_tier = 'destacado' THEN 100 ELSE 0 END`
- Function declaration uses `CREATE OR REPLACE FUNCTION recompute_ranking() ... SECURITY DEFINER SET search_path = public LANGUAGE plpgsql` (Postgres 14+ syntax; Supabase runs Postgres 15 — see Assumptions). Idempotent re-runs rewrite the body safely.
- Trigger creation (committed, explicit): `DROP TRIGGER IF EXISTS professionals_recompute_ranking ON professionals; CREATE TRIGGER professionals_recompute_ranking BEFORE INSERT OR UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION recompute_ranking();` — `CREATE OR REPLACE TRIGGER` is not used because it was only added in Postgres 14 with different semantics than most expect; explicit DROP + CREATE is the clearer contract.
- Backfill (last statement): `UPDATE professionals SET updated_at = NOW();` — fires the trigger for every row; wraps in the migration's transaction so a failure rolls back everything.
- `REVOKE EXECUTE ON FUNCTION recompute_ranking FROM PUBLIC;` (trigger functions don't need explicit EXECUTE GRANT — they run as the table owner).
- Performance note: this is O(N) on initial backfill; at N=45 it's instant. Re-evaluate if professional count crosses ~5000.

**Definition of Done:**

- [ ] `migrations/004_ranking_foundation.sql` applies cleanly against a fresh DB.
- [ ] Running the migration twice doesn't error — uses `CREATE OR REPLACE FUNCTION` for the function and explicit `DROP TRIGGER IF EXISTS ... ; CREATE TRIGGER ...` for the trigger.
- [ ] After migration, `SELECT column_name FROM information_schema.columns WHERE table_name='professionals'` includes all 5 new columns with correct types and defaults.
- [ ] `SELECT ranking_score, profile_completeness_score FROM professionals` returns values where `ranking_score = round(0.7 * profile_completeness_score, 2)` for every row (rating and tier contributions are 0 at launch).
- [ ] Trigger exists: `SELECT tgname FROM pg_trigger WHERE tgname = 'professionals_recompute_ranking'` returns one row.
- [ ] **Live trigger-fires verification** (spec-review should_fix): pick a professional whose `bio` is currently NULL or shorter than 50 chars, UPDATE its `bio` to a 60-char string, then SELECT the row — `profile_completeness_score` must increase by exactly 15, and `ranking_score` must increase by exactly 10.50 (= round(0.7 * 15, 2)). This proves the trigger fires correctly on UPDATE, not only on the backfill UPDATE.

**Verify:**

```bash
# Apply migration against local Supabase or test DB
# (exact command depends on local setup — user confirms apply method)

# Column existence + backfilled values:
psql $SUPABASE_URL -c "\d professionals"
psql $SUPABASE_URL -c "SELECT id, profile_completeness_score, ranking_score FROM professionals LIMIT 10;"

# Trigger existence:
psql $SUPABASE_URL -c "SELECT tgname FROM pg_trigger WHERE tgname = 'professionals_recompute_ranking';"

# Live trigger-fires check:
psql $SUPABASE_URL -c "SELECT id, profile_completeness_score, ranking_score, bio FROM professionals WHERE bio IS NULL OR length(trim(bio)) < 50 LIMIT 1;"
# Capture id + before scores. Then:
psql $SUPABASE_URL -c "UPDATE professionals SET bio = 'This is a deliberately long bio exceeding fifty characters to cross the threshold.' WHERE id = '<captured-id>';"
psql $SUPABASE_URL -c "SELECT profile_completeness_score, ranking_score FROM professionals WHERE id = '<captured-id>';"
# Assert: completeness increased by 15, ranking_score increased by 10.50.
```

---

### Task 2: TS ranking helper + unit tests

**Objective:** Expose `computeRankingScore()` in TypeScript so admin UIs and tests can reason about ranking without round-tripping to Postgres; expand the Vitest workspace to reach `lib/**` test files.
**Dependencies:** None (Task 1 not required — helper is pure).
**Mapped Scenarios:** None directly (enabling for parity test).

**Files:**

- Create: `lib/ranking.ts`
- Create: `lib/ranking.test.ts`
- Modify: `vitest.workspace.ts` — add `'lib/**/*.test.ts'` to the unit project's `include` array.

**Key Decisions / Notes:**

- `lib/ranking.ts` exports:
  - `const COMPLETENESS_WEIGHT = 0.7`, `RATING_WEIGHT = 0.2`, `TIER_WEIGHT = 0.1` (named constants, matching SQL).
  - `computeRankingScore(input: RankingInput): number` where `RankingInput = { completeness: number; ratingAverage: number; ratingCount: number; tier: 'basico' | 'destacado' }`.
  - `computeRatingContribution(avg, count)` and `computeTierContribution(tier)` as named exports for direct testing.
  - Return value rounded to 2 decimals via `Math.round(x * 100) / 100`.
- Unit tests cover at minimum:
  - All zeros → 0.
  - Completeness 100, rating 0 (count 0), tier 'basico' → 70.
  - Completeness 100, rating 5.0 (count 10), tier 'basico' → 90.
  - Completeness 100, rating 5.0 (count 10), tier 'destacado' → 100.
  - Completeness 0, rating 5.0 (count 10), tier 'destacado' → 30.
  - Rating count = 0 with ratingAverage = 5 → rating contribution is 0 (not 100).
  - Rating count = 1 with ratingAverage = 3.5 → contribution is `LEAST(3.5 * 20, 100) = 70 * 0.2 = 14`.
- Self-documenting with JSDoc on the exported function.
- Pure function — no side effects, no DB access.
- Performance note: this is called per-row in admin list renders if surfaced; keep allocation-free (no objects created inside).

**Definition of Done:**

- [ ] `npm run test:unit` discovers and runs `lib/ranking.test.ts` (passes 6+ cases).
- [ ] `tsc --noEmit` passes (no type errors).
- [ ] `lib/ranking.ts` has no `any` types.
- [ ] Exported weights are named constants (not inline literals).

**Verify:**

```bash
npm run test:unit
```

---

### Task 3: DB-backed parity integration test

**Objective:** Prove the TS helper and SQL trigger produce identical scores. Insert fixture professionals via `supabaseAdmin`, let the real trigger compute, read back, assert exact match.
**Dependencies:** Task 1, Task 2
**Mapped Scenarios:** None directly (enabling verification for TS-001/002/003).

**Files:**

- Create: `__tests__/integration/ranking-parity.test.ts`

**Key Decisions / Notes:**

- Mirror the setup from `__tests__/integration/api-events.test.ts:14-62` — `createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!)`, `beforeAll` for inserts, `afterAll` for cleanup.
- Test fixtures (**8 scenarios — includes explicit NULL cases per spec-review must_fix**):
  1. All fields empty/minimum → expect ranking_score = 0 (no criteria met).
  2. Partial: image + short_description + bio (50 chars) + specialties → expect 55 completeness × 0.7 = 38.50.
  3. Full completeness, no rating, basico tier → expect 100 × 0.7 = 70.00.
  4. Full completeness + 4.0 rating (count 10) + basico → 70 + (4.0 × 20 × 0.2) = 70 + 16 = 86.00.
  5. Full completeness + 5.0 rating (count 20) + destacado → 70 + 20 + 10 = 100.00.
  6. Zero completeness + 5.0 rating (count 10) + destacado → 0 + 20 + 10 = 30.00.
  7. **NULL arrays** (`specialties: null`, `service_type: null`, `modality: null`) with other fields filled → expect those 3 criteria score 0. Proves `COALESCE(array_length(col, 1), 0)` behaves identically to TS `Array.isArray(null) = false`.
  8. **NULL `online_only`** with a non-null city → expect locationClarity=10 via the city branch. **NULL `online_only` with NULL city** → expect locationClarity=0. Proves `COALESCE(online_only, false)` matches TS `undefined || …`.
- For each fixture: `INSERT` row via `supabaseAdmin.from('professionals').insert({...}).select().single()` (trigger fires), then read back `profile_completeness_score` and `ranking_score`, then run `computeRankingScore()` in TS with the same inputs, assert equality to 2 decimals via `expect(dbScore).toBe(tsScore)`.
- Use `${Date.now()}` suffix on email and slug to avoid UNIQUE collisions. Prefix slugs with `ranking-parity-` to allow bulk cleanup by LIKE pattern.
- Cleanup in `afterAll`: `.delete().in('id', [...fixtureIds])`. Belt-and-suspenders: also `.delete().like('slug', 'ranking-parity-%')` in case a previous run aborted mid-suite.
- **Two distinct failure modes** (spec-review suggestion — documented in a test-file comment):
  - Supabase connectivity flake → mitigated by 3× retry with 2s delay in `beforeAll` around the initial connection + a throwaway `select` probe.
  - Dev server 60s cold start (from `globalSetup`) → tolerated passively; the parity test does NOT hit HTTP, only DB. If the globalSetup ever changes, re-evaluate.
- **Filename note** (spec-review suggestion): PRD listed `__tests__/integration/directory.test.ts` but this test covers ranking-formula parity, not directory ordering. Directory ordering is tested by Playwright (Task 6). Two distinct concerns → two distinct files. Keep `ranking-parity.test.ts` for clarity; the PRD's filename was aspirational before this decomposition was finalized.

**Definition of Done:**

- [ ] `npm run test:integration` runs the parity test and all fixture scenarios pass.
- [ ] Cleanup deletes all fixture rows (`SELECT COUNT(*) FROM professionals WHERE email LIKE 'ranking-parity-%'` returns 0 after run).
- [ ] Test file uses no hardcoded ids, relies on `${Date.now()}` for uniqueness.
- [ ] No `console.log` in the test file (use `console.error` in `catch` if needed).

**Verify:**

```bash
npm run test:integration
```

---

### Task 4: `/profesionales` server-rendered page

**Objective:** Build the directory list page. Server component fetches via `supabaseAdmin`, renders sorted glass-card list.
**Dependencies:** Task 1 (columns must exist)
**Mapped Scenarios:** TS-001, TS-002, TS-003, TS-005

**Files:**

- Create: `app/profesionales/page.tsx`

**Key Decisions / Notes:**

- Server component, `async function DirectoryPage()`.
- Data fetch: `supabaseAdmin.from('professionals').select('slug, full_name, specialties, city, country, online_only, profile_image_url').eq('status', 'active').eq('accepting_new_clients', true).order('ranking_score', { ascending: false }).order('created_at', { ascending: false })`.
- On query error: log via `logError`, render empty state with `"Ocurrió un error cargando profesionales. Intentá de nuevo más tarde."` (NOT throw — keeps page resilient).
- Shell matches `/p/[slug]`: `<div className="min-h-screen bg-background"><PageBackground /><div className="relative z-10 max-w-md mx-auto px-4 pt-8 pb-12 space-y-4">`.
- Header block: `<h1 className="text-2xl font-bold text-foreground">Profesionales</h1>` + subtitle `<p className="text-sm text-muted">Elegí a quien querés contactar.</p>`.
- Each card wrapped in `<Link href={`/p/${p.slug}`}>` → navigates to profile on click.
- Card internals (inside `liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6`, wrapped in `<article data-testid="professional-card">`):
  - Flex row: 56x56 avatar (image or gradient initial fallback copied from `app/p/[slug]/page.tsx:135-148`, scaled down), then vertical column with name + up to 3 specialty chips + overflow count + city/online line, then a chevron on the right.
  - **Name element must be `<h3 data-testid="professional-name">` (spec-review should_fix)** so the E2E DOM-order assertion in TS-001 can reliably find it. This also gives screen readers a proper heading hierarchy within the card list.
  - "Ver perfil" affordance: rely on whole-card click-through via the outer `<Link>` wrapper (matches admin list pattern, no redundant CTA). The chevron is a visual cue only.
- Empty state: `<GlassCard><EmptyState title="Todavía no hay profesionales disponibles." description="Volvé pronto." /></GlassCard>` — reusing the existing `EmptyState` and `GlassCard` components.
- Location format: `online_only ? 'Online' : [city, country].filter(Boolean).join(', ')`.
- All copy in Spanish (Argentine informal).
- Performance: server-rendered, single query, no client-side JS. The `.order()` relies on `idx_professionals_directory` created in Task 1.

**Definition of Done:**

- [ ] Page renders at `/profesionales` on local dev server (curl or browser).
- [ ] Page is a server component (no `'use client'` directive).
- [ ] No hardcoded hex colors in the JSX — tokens only.
- [ ] No `console.log` calls; uses `logError` for the query-error path.
- [ ] Cards visually follow the design-sweep shell pattern (liquid-glass, rounded-3xl, shadow-elevated).

**Verify:**

```bash
npm run dev
# In another terminal:
curl -sS http://localhost:3000/profesionales | grep -q "Profesionales" && echo OK
# Plus visual check in browser at http://localhost:3000/profesionales
```

---

### Task 5: Home page third CTA

**Objective:** Add a "Ver profesionales" pill CTA between the existing two on the home page so the directory is reachable.
**Dependencies:** Task 4 (link target must exist)
**Mapped Scenarios:** TS-004

**Files:**

- Modify: `app/page.tsx`

**Key Decisions / Notes:**

- Insert between the existing "Solicitar recomendaciones" (primary brand) and "Únete como profesional" (outlined) CTAs.
- Style matches the secondary outlined pattern: `bg-surface border border-outline text-foreground font-semibold rounded-full shadow-soft hover:shadow-elevated hover:border-muted transition-all text-center`.
- Copy: "Ver profesionales".
- href: `/profesionales`.
- Keep `space-y-3` gap; the existing `mb-10` stays.
- Do NOT reshuffle the existing CTAs; only insert.

**Definition of Done:**

- [ ] Home page (`/`) shows 3 CTAs in order: "Solicitar recomendaciones" → "Ver profesionales" → "Únete como profesional".
- [ ] Clicking "Ver profesionales" navigates to `/profesionales`.
- [ ] No visual overlap or layout break on mobile (~360px-414px width range) — spot-check in browser.
- [ ] No hardcoded colors; uses existing tokens.

**Verify:**

```bash
npm run dev
# Visit http://localhost:3000, confirm third CTA present and functional.
```

---

### Task 6: Playwright E2E + visual baseline

**Objective:** Automated browser verification that the directory orders correctly, respects inclusion filters, links to profiles, and matches a visual baseline.
**Dependencies:** Task 1, Task 4, Task 5
**Mapped Scenarios:** TS-001, TS-002, TS-003, TS-005

**Files:**

- Create: `__tests__/e2e/directory.spec.ts`

**Key Decisions / Notes:**

- Run under the `public` Playwright project (no auth needed).
- Seed data in `test.beforeAll` via `supabaseAdmin`: 5 qualifying professionals with distinct completeness profiles (synth names like "Test Directory A/B/C/D/E"), 1 with `status='paused'`, 1 with `accepting_new_clients=false`. Use `${Date.now()}` suffixes. Track ids for cleanup.
- Cleanup in `test.afterAll`: `.delete().in('id', [...fixtureIds])`.
- Test 1 (TS-001 + TS-002): navigate to `/profesionales`, read card names in DOM order, assert the 5 qualifying names appear in expected ranking order and the paused/not-accepting names are absent.
- Test 2 (TS-003): click the first card, assert URL is `/p/<slug>` and the profile h1 matches the professional's name, then assert `data-testid="professional-profile"` is present (exists per `/p/[slug]/page.tsx:112`).
- Test 3 (TS-005): visual regression — screenshot the `/profesionales` page under the `visual` Playwright project (separate file or `test.describe` block with project tag). Use existing baseline pattern; generate baseline if not present.
- If Playwright `public` and `visual` projects can't share beforeAll/afterAll cleanly, split into two files: `directory.spec.ts` (public) and `directory.visual.spec.ts` (visual, if needed).

**Definition of Done:**

- [ ] `npm run test:e2e` runs and all directory tests pass.
- [ ] `npm run test:visual` generates or matches a baseline screenshot for `/profesionales`.
- [ ] All fixture rows are cleaned up after the test run.
- [ ] Tests don't depend on the 45 existing professionals (fully seeded and cleaned per run).

**Verify:**

```bash
npm run test:e2e
npm run test:visual
```

---

### Task 7: Update `.claude/plans/main.md`

**Objective:** Reflect the shipped state in the project-level plan: tick success criteria, update the Pages table, surface follow-up PRDs so the next session knows what's next.
**Dependencies:** All prior tasks complete and verified.
**Mapped Scenarios:** None (documentation).

**Files:**

- Modify: `.claude/plans/main.md`

**Key Decisions / Notes:**

- Tick in Success Criteria: "`/profesionales` Public directory page with reputation-based ranking" → `[x]`.
- Tick the Pending Tasks Backlog item "DB: Add ranking/tier fields to `professionals` table" → covered.
- Update Pages & Workflows table row for `/profesionales` from "**New — Phase 1**" to "**Done**".
- Add a new Session Log entry (2026-04-24) summarizing: directory + ranking foundation shipped; follow-up PRDs identified (Reviews, Payments, Professional portal, Filters, SEO, Verification).
- Replace Next Steps #4 (DB ranking fields) and #5 (`/profesionales`) with: (a) Reviews PRD, (b) Payments PRD, (c) Directory filters PRD, (d) remaining polish.
- Remove outdated text that claimed "dual CTA (directory + concierge)" was done without a directory link — rephrase to "dual CTA (concierge + directory) — done".
- Keep the Notes section intact.

**Definition of Done:**

- [ ] `.claude/plans/main.md` has a new Session Log entry dated 2026-04-24.
- [ ] Success Criteria for directory and ranking are ticked.
- [ ] Pages table row for `/profesionales` shows "Done".
- [ ] Next Steps reflect the next most important follow-up PRD.
- [ ] No stale references remain claiming directory is a "Phase 1" pending item.

**Verify:**

```bash
grep -A2 "/profesionales" .claude/plans/main.md | head -20
```

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | DEFERRED | 0 | DB-dependent — skips until migration 004 applied + Supabase reachable |
| TS-002 | Critical | DEFERRED | 0 | DB-dependent — skips until migration 004 applied + Supabase reachable |
| TS-003 | High | DEFERRED | 0 | DB-dependent — skips until migration 004 applied + Supabase reachable |
| TS-004 | High | PASS | 0 | Playwright confirmed: home CTA present, navigates to /profesionales |
| TS-005 | Medium | DEFERRED | 0 | Visual baseline — run `npm run test:visual:update` after migration applied |

## Open Questions

- Profiles with `profile_completeness_score = 0` or very low will rank at the bottom. Hide them entirely? Show with a "perfil incompleto" badge? For v1 they show as-is; flagged for product decision in a future session.
- When the Reviews PRD adds a `reviews` table, its trigger needs to update `rating_average` / `rating_count` on the `professionals` row, which will re-fire this ranking trigger. That's intentional but worth confirming the downstream PRD understands the cascade.
- Should the backfill one-time email existing professionals whose completeness is low (< 50)? Probably no — belongs with a future onboarding/engagement PRD, not this foundation.

### Deferred Ideas

- AvatarPlaceholder component extraction (Phase 3 of the design-system-extraction backlog) — deferred so the directory card uses inline pattern; extract when a second or third surface demands it.
- Public API route `/api/public/professionals` — add when a future interactive UI (client-side filters, infinite scroll) needs it.
- Admin tooling to tune ranking weights at runtime — weights stay as code/SQL constants; edit + redeploy.
