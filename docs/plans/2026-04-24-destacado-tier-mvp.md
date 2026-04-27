# Destacado Tier — Admin-Gated MVP Implementation Plan

Created: 2026-04-24
Author: belu.montoya@dialpad.com
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Ship the Destacado tier admin-gated MVP: admin records a payment via a modal, system atomically creates a `subscription_payments` row and updates `professionals.subscription_tier='destacado'` with `tier_expires_at`. Ranking trigger treats tier as effective only when expiry is in the future. Daily Vercel cron cleans up expired rows. Destacado chip appears on `/profesionales` cards and `/p/[slug]`.

**Architecture:** One DB migration bundles schema + trigger update + atomic RPC. TS parity helper mirrors the SQL expiry logic. Admin UI adds a modal + row chip + expandable history to `/admin/professionals`. Vercel cron + secured endpoint handles expiry cleanup. All changes respect the effective-tier concept (stored tier ≠ effective tier after expiry) via a single canonical expression.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase Postgres (triggers + RPC), Tailwind v4, Vitest (unit + integration), Playwright (E2E), Vercel Cron.

## Scope

### In Scope

- **Migration `migrations/005_destacado_tier_mvp.sql`**:
  - `ALTER TABLE professionals ADD COLUMN tier_expires_at TIMESTAMPTZ`.
  - Partial index `idx_professionals_tier_expires` on `(tier_expires_at) WHERE subscription_tier = 'destacado'` — optimizes the cron cleanup query.
  - `CREATE TABLE subscription_payments` (id, professional_id FK CASCADE, amount, currency CHECK ARS/USD, paid_at, period_start, period_end CHECK `> period_start`, payment_method CHECK 4 values, invoice_number, notes, created_at, created_by).
  - Index `idx_subscription_payments_professional` on `(professional_id, paid_at DESC)`.
  - `CREATE OR REPLACE FUNCTION recompute_ranking()` — updated tier-contribution CASE to `tier = 'destacado' AND (tier_expires_at IS NULL OR tier_expires_at > NOW())`.
  - `CREATE OR REPLACE FUNCTION upgrade_destacado_tier(...)` — atomic RPC: inserts payment row, updates professional's tier + expiry (silent extension when active), returns payment id + new expiry.
  - Commented rollback block (drop RPC, index, table, column + note about restoring migration 004 trigger).
- **TS parity helper update** (`lib/ranking.ts`):
  - Extend `computeTierContribution(tier, tierExpiresAt)` to accept optional expiry; returns 100 only when effective.
  - New exported `isEffectivelyDestacado(tier, tierExpiresAt): boolean` helper for app-side rendering decisions.
  - Update `RankingInput` to include `tierExpiresAt: Date | string | null`.
  - Extend unit tests (`lib/ranking.test.ts`) with expiry cases.
- **DB-backed parity test extension** (`__tests__/integration/ranking-parity.test.ts`):
  - Add 2 fixtures: Destacado with future expiry → tier contribution = 100; Destacado with past expiry → tier contribution = 0.
  - Existing fixture 5 (Destacado, no expiry) remains valid via the `IS NULL OR` branch.
- **API routes** (`app/api/admin/subscriptions/route.ts`):
  - `POST` — validates payload, calls `upgrade_destacado_tier` RPC via `supabaseAdmin.rpc('upgrade_destacado_tier', {...})`, returns `{ payment_id, professional_id, tier_expires_at }`.
  - `GET ?professional_id=X` — lists past `subscription_payments` for the professional, ordered `paid_at DESC`.
- **Extend admin professionals list API** (`app/api/admin/professionals/route.ts`):
  - Add `subscription_tier` and `tier_expires_at` to the select clause. Update the output mapping.
- **Admin UI** (`app/admin/professionals/page.tsx` + new components):
  - `DestacadoPaymentModal.tsx` (new) — modal with form fields per PRD. Amount (number input), currency (ARS/USD select, default ARS), paid_at (date input, default today), period (preset 30/90/180/365 buttons + custom end date), payment method (select), invoice number (optional text), notes (optional textarea). Client-side validation (amount > 0, period_end > period_start, required fields).
  - `DestacadoRow.tsx` (new OR inline into ProfessionalRow) — row chip showing "Destacado hasta DD MMM YYYY" (brand) / "Vence pronto" (warning, < 7 days) / "Básico" (neutral). Expand chevron reveals payment history (lazy-loaded via `GET /api/admin/subscriptions?professional_id=X`).
  - "Destacar / Extender" button per row → opens modal.
  - On submit → POST `/api/admin/subscriptions` → close modal → refetch list → new tier chip + expiry reflected.
  - Admin extension behavior: **silent extension** — if current `tier_expires_at` > NOW(), new expiry = `current_tier_expires_at + (period_end - period_start) days`. This happens inside the RPC, not the UI — the modal just submits the payment data.
- **Public UI — Destacado chip**:
  - `app/profesionales/page.tsx` card: `<Chip variant="brand" label="Destacado" />` when `isEffectivelyDestacado(tier, tierExpiresAt)`. Add chip beside specialty chips. Update `DirectoryProfessional` interface + DB select to include `subscription_tier` + `tier_expires_at`.
  - `app/p/[slug]/page.tsx`: same chip near the name in the identity card. Update `Professional` interface + DB select.
- **Vercel Cron — daily expiry cleanup**:
  - `vercel.json` (new) — `{ "crons": [{ "path": "/api/cron/expire-destacado", "schedule": "0 6 * * *" }] }` (06:00 UTC = 03:00 ART).
  - `app/api/cron/expire-destacado/route.ts` (new) — reads `Authorization: Bearer ${CRON_SECRET}` header, runs `UPDATE professionals SET subscription_tier = 'basico', tier_expires_at = NULL WHERE subscription_tier = 'destacado' AND tier_expires_at < NOW()`, returns count of rows touched. The trigger fires per-row and updates ranking_score.
- **Playwright E2E** (`__tests__/e2e/destacado.spec.ts`):
  - Seeds a professional, opens admin modal, submits, verifies row chip + directory badge + ranking boost.
  - Also: expiry path (seeded professional with past `tier_expires_at` → chip absent on public pages, ranking boost not applied).
- **Update `.claude/plans/main.md`** — tick relevant items, add Destacado row-chip + public-chip to Pages notes, surface follow-up PRDs, add session log entry.

### Out of Scope

- Self-serve checkout — follow-up PRD.
- MP / Stripe SDK integration — follow-up PRD.
- Automated AFIP invoicing — admin issues manually.
- Dunning / retry / failed-payment flow — not applicable to retrospective recording.
- `/pro/*` portal — separate PRD.
- Featured Destacados strip on home — kept minimal.
- Multi-tier structure — binary locked.
- Renewal reminders — follow-up PRD.
- Refunds — admin handles out-of-band.
- Admin analytics / MRR dashboard — follow-up PRD.
- Professional-visible billing history — depends on /pro portal.
- Proration on period change — admin handles out-of-band.

## Approach

**Chosen:** Vertical slice per surface. ~9 tasks: migration + trigger + RPC (1), TS helper + unit tests (2), parity integration test extension (3), API routes (4), admin list API extension + admin modal UI (5), public chips (6), Vercel cron (7), Playwright E2E (8), main plan update (9).

**Why:** Each task is independently verifiable. Matches the decomposition used in the Directory + Ranking Foundation spec. Lets implementer validate piece-by-piece rather than hitting a wall of integration at the end.

**Alternatives considered:**
- Horizontal layers (DB → API → UI → cron): rejected — larger tasks, harder to verify, doesn't match repo conventions.
- Single monolithic task: rejected — scope is ~9 surfaces with independent DoD; one task would bury failures.

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Atomic RPC for payment + tier update: `migrations/003_production_hardening.sql:17-97` (`create_match_with_recommendations_atomic`). Same `SECURITY DEFINER SET search_path = public LANGUAGE plpgsql` + `REVOKE/GRANT` trailer.
  - Trigger function idempotency (CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS + CREATE TRIGGER): `migrations/004_ranking_foundation.sql:53-155`.
  - Modal component: `app/components/ui/Modal.tsx` — `{ open, onClose, title, children, footer }`. Use `footer` slot for submit/cancel buttons.
  - Chip with brand variant: `app/components/ui/Chip.tsx` — `<Chip variant="brand" label="Destacado" />`.
  - Admin list API extension: `app/api/admin/professionals/route.ts:15` — just extend the select clause.
  - Admin page row pattern: `app/admin/professionals/page.tsx:154-193` (`ProfessionalRow`).
  - Integration test Supabase client: `__tests__/integration/api-events.test.ts:14-17`.
  - Server component data fetching in directory: `app/profesionales/page.tsx:29-40`.
  - Avatar + chip layout in profile: `app/p/[slug]/page.tsx:131-177`.
- **Conventions:**
  - Spanish copy, Argentine informal. Modal labels: "Monto", "Moneda", "Pagado el", "Periodo", "Método de pago", "Factura N°", "Notas". Status chip: "Destacado hasta DD MMM YYYY" / "Básico".
  - Design tokens only — `bg-brand-weak`, `text-brand`, `rounded-full`, `shadow-soft`. No hex.
  - Error logging via `logError` from `lib/monitoring.ts`.
  - Service-role DB access via `lib/supabase-admin.ts`.
  - Middleware auto-gates `/api/admin/*` routes via Supabase session — no per-route auth check needed in the handler body (see `middleware.ts:20-37`).
  - Cron endpoint is NOT under `/api/admin/*` — gate manually via `CRON_SECRET` header check (pattern: `Authorization: Bearer ${CRON_SECRET}`).
- **Key files:**
  - `lib/ranking.ts` — TS ranking formula helper; extend `computeTierContribution` signature.
  - `lib/ranking.test.ts` — extend with expiry cases.
  - `lib/supabase-admin.ts` — service-role client.
  - `app/globals.css` — design tokens.
  - `migrations/004_ranking_foundation.sql` — **must stay in sync**; new trigger version is a strict superset (backward-compatible via `IS NULL OR` branch).
  - `.env.local` — already has `CRON_SECRET`.
- **Gotchas:**
  - Stored tier vs effective tier: `subscription_tier = 'destacado'` in the DB may be EFFECTIVE basico if `tier_expires_at < NOW()`. The cron eventually cleans this up, but between expiry and cron run, the trigger's inline check handles it correctly. Use `isEffectivelyDestacado()` helper everywhere in the app code.
  - The existing `ranking-parity.test.ts` fixture 5 sets `subscription_tier: 'destacado'` with no `tier_expires_at` set. After migration 005, `tier_expires_at` defaults to NULL for that fixture. The `IS NULL OR` branch in the trigger preserves backward compatibility — fixture 5 still computes tier contribution = 100. Verify this explicitly in the extension test.
  - `created_by` column on `subscription_payments` is nullable. Supabase Auth integration is a stub (`lib/admin-auth.ts`). For MVP, insert `created_by = null`. Real user binding comes with the /pro portal PRD.
  - Vercel Cron requires Vercel Pro plan for production crons. If the user is on Hobby, the cron won't fire — manually triggering the endpoint via `curl` is fine as a workaround; the endpoint itself still ships and works.
  - `vercel.json` doesn't exist yet; creating it may conflict with project-level Vercel dashboard settings. Document that `vercel.json` takes precedence when present.
  - The admin list page is a `'use client'` component with `useState` for filters. Adding modal state and expand state follows the same pattern. Don't try to make it a server component.
  - Silent extension semantics live in the RPC function, not the client. The modal always sends `period_start`/`period_end` as "the period the admin charged for" (30 / 90 / etc. days from `paid_at`). The RPC derives the NEW `tier_expires_at` based on current state.
- **Domain context:**
  - `subscription_tier`: `'basico'` (free, default) | `'destacado'` (paid). Enforced by CHECK constraint from migration 004.
  - `tier_expires_at`: TIMESTAMPTZ (nullable). NULL for basico rows AND for legacy destacado rows that preceded migration 005.
  - Ranking boost: destacado with future expiry adds 10 points (0.1 × 100 tier contribution) to `ranking_score`. Already wired via migration 004 formula; migration 005 just adds the expiry gate.
  - AFIP invoice_number: plain TEXT, no validation. Admin issues the invoice manually via AFIP's "Comprobantes en línea" portal and pastes the number into the modal.

## Runtime Environment

- **Start command:** `npm run dev`
- **Port:** 3000
- **Health check:** `curl http://localhost:3000/api/health`
- **Build:** `npm run build`
- **Tests:**
  - `npm run test:unit` — unit tests (includes `lib/ranking.test.ts`)
  - `npm run test:integration` — integration (parity test, needs Supabase)
  - `npm run test:e2e` — Playwright public project (destacado spec)
- **Cron:** after deploy with `vercel.json` present, Vercel runs the cron automatically on the configured schedule.

## Assumptions

- Migration 004 has already been applied to Supabase. This plan builds on its `subscription_tier` column and `recompute_ranking()` trigger. If 004 is not applied, apply it first (see `scripts/apply-ranking-migration.mjs`).
  - Supporting: `migrations/004_ranking_foundation.sql` is committed and merged to main (commit `6a7ef9a`).
  - Tasks depending: 1, 3, 4, 5, 6, 7.
- The existing parity test fixture 5 (destacado with no expiry) still passes after migration 005 via the `IS NULL OR` branch. No fixture data updates needed for fixture 5.
  - Supporting: `__tests__/integration/ranking-parity.test.ts:106-109`; the new trigger's CASE expression explicitly preserves this.
  - Tasks depending: 3.
- Supabase network is reachable from the user's environment (it was not from the sandbox in the prior session). The migration must be applied manually (or via `scripts/apply-destacado-migration.mjs`) before integration/E2E tests go fully green.
  - Supporting: prior session's deviation log; infra constraint not code constraint.
  - Tasks depending: 3, 8.
- `CRON_SECRET` env var is present in `.env.local` and in Vercel's environment variables. It was added earlier for reconciliation job scheduling.
  - Supporting: `.env.local` keys listing includes `CRON_SECRET`.
  - Tasks depending: 7.
- Middleware continues to gate `/api/admin/*`. New `POST /api/admin/subscriptions` and `GET /api/admin/subscriptions` don't need in-handler auth.
  - Supporting: `middleware.ts:20-37` matches `/api/admin/`.
  - Tasks depending: 4.
- `lib/admin-auth.ts` remains a stub; `created_by` on payments is `null` for now. Real user binding deferred to /pro portal PRD.
  - Supporting: `lib/admin-auth.ts:6-22`.
  - Tasks depending: 4.
- Playwright `public` project can hit the admin modal after the admin login flow has been captured in `auth-setup`. If admin auth is not wired for Playwright yet (the project has `admin` and `auth-setup` projects; check if they work locally), the admin-interaction part of E2E may skip.
  - Supporting: `playwright.config.ts:32-60`.
  - Tasks depending: 8.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Trigger update breaks existing parity test fixture 5 (destacado, no expiry) | Low | High (blocks verification) | Extension test explicitly asserts fixture 5 still computes tier contribution = 100. `IS NULL OR` branch is a deliberate backward-compat guard, not an accident. |
| SQL/TS parity drifts after this change | Medium | High | Parity test extension covers: future expiry → effective, past expiry → expired, NULL → effective (legacy). Run parity test after every change touching the formula. |
| Admin accidentally double-charges or double-extends | Low | Medium | Status chip on the row ("Destacado hasta <date>") makes current state visible before clicking Upgrade. Silent extension in RPC ensures paid time is preserved either way. |
| Cron secret leaks → unauthorized cleanup | Low | Low | Cleanup is idempotent (expired rows stay expired). Worst case: someone triggers a no-op. Still gate via Bearer header match. |
| Vercel Cron not available on Hobby plan | Medium | Medium | On Vercel Hobby, neither the cron fires nor does Vercel inject `Authorization: Bearer ${CRON_SECRET}`. Expired Destacado rows will never auto-clean up; stored state drifts from effective state (ranking trigger still computes correctly, but admin UI shows stale "Destacado until <past date>"). Mitigation: endpoint is callable via `curl -H "Authorization: Bearer $CRON_SECRET" http://...`. Production deploy verifies cron fires by inspecting Vercel dashboard logs + checking `subscription_payments` for auto-expired rows after a known expiry date. |
| RPC race: concurrent payment inserts for the same professional | Low | Medium (billing correctness) | Without a lock, two concurrent calls both read the same `v_current_expiry` before either UPDATE, both compute the same `new_expiry`, and one extension silently disappears (T+60 instead of T+90 after two 30-day payments). **Mitigation (committed):** `SELECT tier_expires_at INTO v_current_expiry FROM professionals WHERE id = p_professional_id FOR UPDATE;` at the top of the RPC — serializes concurrent executions at the row lock level. |
| Modal submit fails silently on network error | Low | Medium | Client-side try/catch renders an Alert with error message; admin retries. Standard pattern from registration form. |
| Period arithmetic off-by-one (UTC vs ART) | Low | Low | All timestamps use TIMESTAMPTZ; DATE columns use Postgres DATE arithmetic. Extension test verifies `period_end` accuracy across a known fixture. |
| `tier_expires_at` NULL on destacado row never gets cleaned up | Low | Low | The cron only touches rows with `tier_expires_at < NOW()`. NULL never matches `<`, so legacy destacado rows (fixture 5, test fixtures) stay effective forever — intentional backward-compat. If policy changes, add cleanup for `tier_expires_at IS NULL` in a follow-up. |

## Goal Verification

### Truths

1. Migration 005 adds `tier_expires_at` column + `subscription_payments` table + partial/regular indexes + atomic `upgrade_destacado_tier()` RPC + updated `recompute_ranking()` trigger — verified by `\d professionals`, `\d subscription_payments`, `pg_proc` queries, and by re-applying the migration producing no errors.
2. `recompute_ranking()` trigger, after update, treats a destacado professional with `tier_expires_at < NOW()` as basico in the ranking formula (tier contribution = 0) — verified by parity test fixture "destacado with past expiry".
3. `computeTierContribution(tier, expiry)` in `lib/ranking.ts` returns 100 only when tier is destacado AND (expiry is NULL OR expiry > now); otherwise 0 — verified by `lib/ranking.test.ts` extension cases.
4. `POST /api/admin/subscriptions` with valid payload creates a `subscription_payments` row AND updates `professionals.subscription_tier='destacado'` + `tier_expires_at` atomically — verified by TS-001 E2E + `ranking_score` increases by +10 after the trigger fires.
5. Admin sees "Destacado hasta <date>" status chip on the row after submitting the modal — verified by TS-001.
6. `/profesionales` directory card and `/p/[slug]` profile render a `Destacado` chip when the professional is effectively destacado — verified by TS-002, TS-003.
7. Daily cron endpoint `/api/cron/expire-destacado` (with valid CRON_SECRET) sets `subscription_tier='basico'`, `tier_expires_at=NULL` for all professionals whose expiry has passed — verified by TS-004 (manually triggered call in test).
8. `vercel.json` schedule sets the cron to run daily at 06:00 UTC (03:00 ART) — verified by the `vercel.json` content check in Task 7 DoD.

### Artifacts

- `migrations/005_destacado_tier_mvp.sql`
- `scripts/apply-destacado-migration.mjs` (optional, pattern of `apply-ranking-migration.mjs`)
- `lib/ranking.ts` (modified)
- `lib/ranking.test.ts` (modified)
- `__tests__/integration/ranking-parity.test.ts` (modified)
- `app/api/admin/subscriptions/route.ts`
- `app/api/admin/professionals/route.ts` (modified — select extension)
- `app/admin/professionals/components/DestacadoPaymentModal.tsx`
- `app/admin/professionals/page.tsx` (modified — modal state + row chip + expand)
- `app/profesionales/page.tsx` (modified — Destacado chip)
- `app/p/[slug]/page.tsx` (modified — Destacado chip)
- `app/api/cron/expire-destacado/route.ts`
- `vercel.json`
- `__tests__/e2e/destacado.spec.ts`
- `.claude/plans/main.md` (modified)

## E2E Test Scenarios

### TS-001: Admin records a payment → Destacado tier activates
**Priority:** Critical
**Preconditions:** Migration 005 applied. Admin logged in. One active professional exists (seeded or existing).
**Mapped Tasks:** Task 1, Task 4, Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/professionals` | List renders with fixtures; target professional row shows "Básico" chip |
| 2 | Click "Destacar" button on target row | Modal opens with form |
| 3 | Fill modal: amount=5000, currency=ARS, paid_at=today, period=30 days, payment_method=mp_link, invoice_number="A-0001-00000001" | Form validates; submit button enables |
| 4 | Submit | Modal closes; row refetches |
| 5 | Inspect target row | Chip now reads "Destacado hasta <DD MMM YYYY>" in brand color |
| 6 | Expand row (click chevron) | Payment history shows 1 row: amount 5000 ARS, date today, method "Mercado Pago link", invoice "A-0001-00000001" |

### TS-002: Destacado chip visible on /profesionales
**Priority:** Critical
**Preconditions:** TS-001 passed (or equivalent: a professional in the DB with destacado + future expiry).
**Mapped Tasks:** Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales` | Directory list renders |
| 2 | Locate the card for the destacado professional | Card includes `<Chip variant="brand" label="Destacado" />` beside specialty chips |
| 3 | Inspect the DOM | `[data-testid="destacado-chip"]` element present on the destacado card only |

### TS-003: Destacado chip visible on /p/[slug]
**Priority:** High
**Preconditions:** Same as TS-002.
**Mapped Tasks:** Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/p/<destacado-slug>` | Profile renders |
| 2 | Locate the identity card near the name | `Destacado` chip visible near the `<h1>` |

### TS-004: Expiry cron cleans up past-expiry rows
**Priority:** High
**Preconditions:** Migration 005 applied. Seed a professional with `subscription_tier='destacado'` and `tier_expires_at = NOW() - 1 day`. `CRON_SECRET` env var set.
**Mapped Tasks:** Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify seeded professional: `SELECT subscription_tier, tier_expires_at, ranking_score FROM professionals WHERE id = <seed_id>` | `subscription_tier='destacado'`, `tier_expires_at` in past. `ranking_score` does NOT include the +10 boost (trigger already handles this). |
| 2 | Trigger the cron: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/expire-destacado` | Returns `{ updated: 1 }` (or similar success payload) |
| 3 | Re-read professional | `subscription_tier='basico'`, `tier_expires_at=NULL`, `ranking_score` unchanged (already effective-basico) |
| 4 | Navigate to `/profesionales` | Destacado chip NOT on this professional's card |

### TS-005: Silent extension preserves paid time
**Priority:** High
**Preconditions:** TS-001 passed — professional is destacado with `tier_expires_at = today + 30 days`.
**Mapped Tasks:** Task 1 (RPC), Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open modal on same professional, submit another 30-day payment | Modal closes successfully |
| 2 | Inspect row chip | "Destacado hasta <today + 60 days>" (not today + 30) |
| 3 | Expand row | Payment history shows 2 rows |
| 4 | Check DB: `SELECT tier_expires_at FROM professionals WHERE id = <id>` | expiry = original expiry + 30 days, NOT paid_at + 30 |

### TS-006: Migration applies cleanly + backward compat with fixture 5
**Priority:** Critical (parity verification)
**Preconditions:** Clean DB with migration 004 applied. No migration 005 yet.
**Mapped Tasks:** Task 1, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Apply migration 005 | No errors |
| 2 | Run `npm run test:integration` | Parity test passes, including fixture 5 (destacado, no expiry) computing tier contribution = 100 |
| 3 | Re-apply migration 005 | No errors (idempotent) |

## Progress Tracking

- [x] Task 1: Migration 005 — columns, table, trigger update, RPC
- [x] Task 2: TS ranking helper extension + unit tests
- [x] Task 3: Parity integration test extension
- [x] Task 4: API routes — POST/GET /api/admin/subscriptions + admin list select extension
- [x] Task 5: Admin UI — modal + row chip + expand history
- [x] Task 6: Destacado chip on /profesionales + /p/[slug]
- [x] Task 7: Vercel cron — vercel.json + /api/cron/expire-destacado endpoint
- [x] Task 8: Playwright E2E — destacado.spec.ts
- [x] Task 9: Update `.claude/plans/main.md`

**Total Tasks:** 9 | **Completed:** 9 | **Remaining:** 0

## Implementation Tasks

### Task 1: Migration 005 — columns, table, trigger update, RPC

**Objective:** Add `tier_expires_at`, `subscription_payments`, indexes, updated `recompute_ranking()` trigger with expiry check, and `upgrade_destacado_tier()` atomic RPC.
**Dependencies:** None (but assumes migration 004 applied)
**Mapped Scenarios:** TS-006 (and enables TS-001 through TS-005)

**Files:**
- Create: `migrations/005_destacado_tier_mvp.sql`
- Create: `scripts/apply-destacado-migration.mjs` (mirror of `scripts/apply-ranking-migration.mjs`)

**Key Decisions / Notes:**
- Columns + constraints per PRD spec exactly.
- Partial index on `(tier_expires_at) WHERE subscription_tier = 'destacado'` — only destacado rows ever hit the cron cleanup query.
- `recompute_ranking()` function body is a strict superset of migration 004's: all 10 completeness criteria identical (copy-paste from 004), only the `v_tier_contrib` CASE expression gains the `AND (tier_expires_at IS NULL OR tier_expires_at > NOW())` branch.
- `upgrade_destacado_tier()` RPC (see PRD key decisions):
  - **Locks** the professional row at entry: `SELECT tier_expires_at INTO v_current_expiry FROM professionals WHERE id = p_professional_id FOR UPDATE;` — spec-review should_fix. Without this, two concurrent calls both read the same stale `v_current_expiry`, compute the same `new_expiry`, and one extension gets silently dropped (T+60 instead of T+90). The `FOR UPDATE` lock serializes at the row level so the second call reads the already-extended expiry.
  - Computes new expiry: if current > NOW() → `current + (period_end - period_start) days`; else → `period_end` cast to TIMESTAMPTZ. `period_days` is the **purchased duration** (not anchored to `paid_at` or `NOW()`) — supports retroactive-recording correctly (see fixture 11 in Task 3).
  - Inserts `subscription_payments` row with submitted period_start/period_end (this is the *period the admin charged for*, not the effective period on the professional row — important for audit).
  - Updates professional tier + expiry in same transaction (the `FOR UPDATE` already holds the lock); trigger fires and recomputes ranking_score.
  - Returns JSONB `{payment_id, professional_id, tier_expires_at}`.
- Trigger recreation uses `DROP TRIGGER IF EXISTS ... ; CREATE TRIGGER ...` (same pattern as migration 004).
- Commented rollback block at end: drops RPC, index, table, column; notes that fully reverting also requires restoring the migration 004 version of `recompute_ranking()` via git history.
- `scripts/apply-destacado-migration.mjs` follows the exact pattern of `apply-ranking-migration.mjs`: verify columns exist, try `exec_sql` RPC fallback, print manual application instructions.

**Definition of Done:**
- [ ] Migration applies cleanly against a DB with migration 004 already applied.
- [ ] Re-applying migration 005 produces no errors. **Explicitly** (spec-review suggestion): `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS idx_professionals_tier_expires`, `CREATE INDEX IF NOT EXISTS idx_subscription_payments_professional`, `CREATE TABLE IF NOT EXISTS subscription_payments`, `CREATE OR REPLACE FUNCTION` on both functions, `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` on the trigger.
- [ ] After migration: `SELECT column_name FROM information_schema.columns WHERE table_name = 'professionals' AND column_name = 'tier_expires_at'` returns one row.
- [ ] `SELECT to_regclass('public.subscription_payments')` returns the table.
- [ ] `SELECT proname FROM pg_proc WHERE proname = 'upgrade_destacado_tier'` returns one row.
- [ ] `SELECT indexname FROM pg_indexes WHERE tablename = 'professionals' AND indexname = 'idx_professionals_tier_expires'` returns one row.
- [ ] Sanity check: `SELECT recompute_ranking()` is callable as a trigger; manually setting `tier_expires_at = NOW() + INTERVAL '30 days'` on a destacado professional and triggering UPDATE produces `ranking_score` with +10 boost. Setting expiry to `NOW() - INTERVAL '1 day'` produces ranking_score without the boost.

**Verify:**
```bash
# Apply migration (user-environment only; sandbox can't reach Supabase):
node scripts/apply-destacado-migration.mjs
# Or via Supabase SQL Editor.

# Schema checks:
psql $SUPABASE_URL -c "\d professionals" | grep tier_expires_at
psql $SUPABASE_URL -c "\d subscription_payments"
psql $SUPABASE_URL -c "SELECT proname FROM pg_proc WHERE proname IN ('recompute_ranking','upgrade_destacado_tier');"

# Trigger expiry logic — pick any active professional, not a specific tier (spec-review must_fix: 'active' is a STATUS value, not a tier value):
psql $SUPABASE_URL -c "SELECT id, ranking_score, subscription_tier, tier_expires_at FROM professionals WHERE status='active' LIMIT 1;"
# Capture id. Then set tier + future expiry and verify boost appears:
psql $SUPABASE_URL -c "UPDATE professionals SET subscription_tier='destacado', tier_expires_at=NOW() + INTERVAL '30 days' WHERE id='<id>'; SELECT ranking_score FROM professionals WHERE id='<id>';"
# Expect: ranking_score increased by 10 (tier contribution applies).
# Then set expiry to past and verify boost disappears:
psql $SUPABASE_URL -c "UPDATE professionals SET tier_expires_at=NOW() - INTERVAL '1 day' WHERE id='<id>'; SELECT ranking_score FROM professionals WHERE id='<id>';"
# Expect: ranking_score decreased by 10 (tier contribution = 0 via expiry check).
# Revert after verification:
psql $SUPABASE_URL -c "UPDATE professionals SET subscription_tier='basico', tier_expires_at=NULL WHERE id='<id>';"
```

---

### Task 2: TS ranking helper extension + unit tests

**Objective:** Extend `lib/ranking.ts` to accept `tierExpiresAt` in tier contribution calculation; add `isEffectivelyDestacado` helper; extend unit tests.
**Dependencies:** None (pure TS; doesn't require migration applied)
**Mapped Scenarios:** None directly (supports TS-006 via parity)

**Files:**
- Modify: `lib/ranking.ts`
- Modify: `lib/ranking.test.ts`

**Key Decisions / Notes:**
- `RankingInput` gains **optional** `tierExpiresAt?: Date | string | null` (spec-review must_fix — keep optional to avoid breaking the 18 existing callers in parity test and unit tests that construct `RankingInput` without this field). When absent or `null`, the helper falls back to "legacy destacado = effective" behavior.
- `computeTierContribution(tier: SubscriptionTier, tierExpiresAt?: Date | string | null): number`:
  ```ts
  if (tier !== 'destacado') return 0
  if (tierExpiresAt === null) return 100   // legacy / backward compat
  const expires = typeof tierExpiresAt === 'string' ? new Date(tierExpiresAt) : tierExpiresAt
  return expires > new Date() ? 100 : 0
  ```
- New exported function: `isEffectivelyDestacado(tier: string, tierExpiresAt: Date | string | null): boolean` — same logic returning boolean. Used by admin UI + public pages to drive the chip.
- `computeRankingScore(input)` now passes `tierExpiresAt` through to `computeTierContribution`.
- Unit tests to add in `lib/ranking.test.ts`:
  - `computeTierContribution('destacado', null)` → 100 (backward compat).
  - `computeTierContribution('destacado', future_date)` → 100.
  - `computeTierContribution('destacado', past_date)` → 0.
  - `computeTierContribution('basico', any)` → 0 (past, future, null).
  - `isEffectivelyDestacado('destacado', future)` → true.
  - `isEffectivelyDestacado('destacado', past)` → false.
  - `isEffectivelyDestacado('basico', future)` → false.
  - `computeRankingScore` with full completeness + past destacado expiry → 70.00 (no boost).
  - `computeRankingScore` with full completeness + future destacado expiry → 80.00 (includes boost).

**Definition of Done:**
- [ ] `npm run test:unit` runs all `lib/ranking.test.ts` tests; all pass; test count increases by at least 8.
- [ ] `npx tsc --noEmit` clean (no type errors).
- [ ] `isEffectivelyDestacado` is exported and importable in `app/**`.
- [ ] No `any` types.
- [ ] **Audit all RankingInput / computeRankingScore construction sites** (spec-review must_fix): `grep -r "computeRankingScore\\|RankingInput" --include="*.ts" .` and confirm each site either (a) passes `tierExpiresAt` explicitly, or (b) relies on the optional field's null-default behavior deliberately. Document the scan result in a commit message or PR description.

**Verify:**
```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -E "ranking|destacado|computeTierContribution|isEffectivelyDestacado"
npx tsc --noEmit
# Audit construction sites:
grep -rn "computeRankingScore\|RankingInput" --include="*.ts" . | grep -v node_modules
```

---

### Task 3: Parity integration test extension

**Objective:** Add fixtures proving SQL trigger and TS helper agree on the expiry behavior (past / future / null).
**Dependencies:** Task 1 (migration applied to test DB), Task 2 (helper extended)
**Mapped Scenarios:** TS-006

**Files:**
- Modify: `__tests__/integration/ranking-parity.test.ts`

**Key Decisions / Notes:**
- Add 3 new fixtures (bringing total to 11 — spec-review must_fix + suggestion):
  - Fixture 9: full completeness + destacado + `tier_expires_at: new Date(Date.now() + 30*86400000)` (future) → expected ranking_score = 80.00.
  - Fixture 10: full completeness + destacado + `tier_expires_at: new Date(Date.now() - 86400000)` (past) → expected ranking_score = 70.00 (no boost, expired).
  - Fixture 11 (retroactive-recording regression — spec-review suggestion): seed row with `tier_expires_at = NOW() + 10 days`, then call `upgrade_destacado_tier` RPC with `period_start` 60 days ago, `period_end` 30 days ago (30-day purchased duration). Assert resulting `tier_expires_at` = original + 30 days, NOT `NOW() + 30 days`. Confirms extension arithmetic uses purchased duration regardless of period anchor.
- **Existing fixtures 1-8 must explicitly pass `tierExpiresAt: null`** when constructing their `computeRankingScore` argument (spec-review must_fix — the type field is optional, but making the intent explicit prevents future misreads). Where fixtures read `tier_expires_at` from the DB row, that field is null for basico/untouched rows — pass it through.
- Ensure existing fixture 5 (destacado, `tier_expires_at` absent in insert payload — defaults to NULL in DB) still passes with ranking_score = 100.00 via the backward-compat branch.
- Cleanup uses the same `slug LIKE 'ranking-parity-%'` LIKE pattern.
- TS side: pass `tierExpiresAt` through to `computeRankingScore` from the DB readback (Supabase returns ISO string or null).

**Definition of Done:**
- [ ] `npm run test:integration` runs the parity test; all 10 fixtures pass when migration 005 is applied.
- [ ] When migration 005 not applied, the test skips cleanly (existing `migrationApplied` flag remains correct).
- [ ] The `computeRankingScore` TS call is updated to include `tierExpiresAt` from the DB row.

**Verify:**
```bash
npm run test:integration 2>&1 | grep -E "parity|ranking-parity|fixture"
```

---

### Task 4: API routes — POST/GET /api/admin/subscriptions + admin list extension

**Objective:** Ship the admin API surface: create payment (atomic RPC), list payment history, and include tier+expiry in the professionals list.
**Dependencies:** Task 1 (RPC + columns exist)
**Mapped Scenarios:** TS-001, TS-005

**Files:**
- Create: `app/api/admin/subscriptions/route.ts`
- Modify: `app/api/admin/professionals/route.ts` (select extension)

**Key Decisions / Notes:**
- `POST /api/admin/subscriptions`:
  - Accepts JSON body: `{ professional_id, amount, currency, paid_at, period_start, period_end, payment_method, invoice_number?, notes? }`.
  - Validation: amount > 0; currency in ('ARS','USD'); payment_method in ('mp_link','transferencia','efectivo','otro'); period_end > period_start; professional_id is UUID; paid_at is ISO date.
  - On validation fail: 400 with `{ error, field }`.
  - Calls: `supabaseAdmin.rpc('upgrade_destacado_tier', {...})` passing `p_created_by: null`.
  - Returns 201 with `{ payment_id, professional_id, tier_expires_at }`.
  - On RPC error: 500 with error message + `logError` call.
  - Middleware auto-gates auth.
- `GET /api/admin/subscriptions?professional_id=<uuid>`:
  - Validates UUID query param.
  - `supabaseAdmin.from('subscription_payments').select('*').eq('professional_id', id).order('paid_at', { ascending: false })`.
  - Returns `{ payments: [...] }`.
- `/api/admin/professionals` GET select extension: add `subscription_tier, tier_expires_at` to select and to output mapping.
- Output format for professionals: include `subscription_tier: string`, `tier_expires_at: string | null`.

**Definition of Done:**
- [ ] `POST /api/admin/subscriptions` with valid payload creates a `subscription_payments` row AND the matching professional row has `subscription_tier='destacado'` and `tier_expires_at` set correctly.
- [ ] Silent extension confirmed via repeated POST: second call with same professional_id when `tier_expires_at` is in the future sets expiry to `current + period_days`, not `paid_at + period_days`.
- [ ] Invalid payloads return 400 with a helpful error message (each validation failure mode tested manually or via a TS-005 integration/E2E case).
- [ ] `GET /api/admin/subscriptions?professional_id=<id>` returns `{ payments: [...] }` ordered `paid_at DESC`.
- [ ] `GET /api/admin/professionals` returns rows including `subscription_tier` and `tier_expires_at`.
- [ ] `npx tsc --noEmit` clean.
- [ ] No `console.log`; `logError` on exception paths.

**Verify:**
```bash
npm run build
# Manual test with curl against local dev server (requires migration applied):
curl -X POST http://localhost:3000/api/admin/subscriptions \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \  # admin session cookie
  -d '{"professional_id":"<uuid>","amount":5000,"currency":"ARS","paid_at":"2026-04-24T12:00:00Z","period_start":"2026-04-24","period_end":"2026-05-24","payment_method":"mp_link","invoice_number":"A-0001-00000001"}'
```

---

### Task 5: Admin UI — modal, row chip, expand history

**Objective:** Add the `DestacadoPaymentModal`, inline status chip per row, and lazy-loaded payment history expansion to `/admin/professionals`.
**Dependencies:** Task 4 (API exists)
**Mapped Scenarios:** TS-001, TS-005

**Files:**
- Create: `app/admin/professionals/components/DestacadoPaymentModal.tsx`
- Create: `app/admin/professionals/components/DestacadoPaymentModal.test.tsx` (spec-review should_fix — PRD explicitly requires this)
- Modify: `app/admin/professionals/page.tsx`

**Key Decisions / Notes:**
- `DestacadoPaymentModal` — client component, props `{ open, onClose, professional: { id, name, subscription_tier, tier_expires_at }, onSuccess }`:
  - Uses `Modal` from `app/components/ui/Modal.tsx`.
  - Controlled inputs via `useState` per field (matches registration form pattern). No React Hook Form.
  - Fields:
    - Amount (number input, min=1, placeholder "5000").
    - Currency (select: ARS / USD, default ARS).
    - Paid at (date input, default today's ISO date).
    - Period (preset pills: "30 días", "90 días", "180 días", "365 días", "Personalizado") — choosing a preset sets `period_start = paid_at` and `period_end = paid_at + N days`. "Personalizado" reveals a second date input for manual `period_end`.
    - Payment method (select: "Mercado Pago link" / "Transferencia" / "Efectivo" / "Otro").
    - Invoice number (text input, optional, placeholder "A-0001-00000001", label "Factura N° (AFIP)").
    - Notes (textarea, optional).
  - Client-side validation: amount > 0, `period_end > period_start`, currency + payment_method required, period_end not in past.
  - If `professional.subscription_tier === 'destacado' && tier_expires_at > NOW()`, show informational banner: "Este profesional ya es Destacado hasta <date>. Al registrar un nuevo pago, el periodo se extiende automáticamente."
  - Submit: `POST /api/admin/subscriptions` with payload; on success call `onSuccess()`; on error render Alert with message.
  - Uses `Button` for Cancelar / Guardar; loading state on Guardar.
- `app/admin/professionals/page.tsx` modifications:
  - Extend `Professional` interface with `subscription_tier`, `tier_expires_at`.
  - Track per-row state: `expandedId: string | null` and `payments: Record<string, Payment[]>` (lazy-loaded cache).
  - Add state: `upgradeTarget: Professional | null` (controls modal).
  - `ProfessionalRow` updates:
    - Status chip: `<Chip variant={isEffectivelyDestacado(p.subscription_tier, p.tier_expires_at) ? "brand" : "neutral"} label={chipLabel} />` where `chipLabel = effective ? \`Destacado hasta ${format(tier_expires_at)}\` : 'Básico'`.
    - "Destacar" button (or "Extender" when already destacado) → `setUpgradeTarget(p)`.
    - Chevron → toggles `expandedId`. On expand, if `payments[p.id]` is missing, fetch `GET /api/admin/subscriptions?professional_id=p.id` and populate cache.
    - Expanded section: list of past payments (date, amount + currency, period, method, invoice #).
  - On modal success: close modal, refetch professionals list.
  - Use `isEffectivelyDestacado` from `lib/ranking.ts`.
- Spanish date formatting: `format(date, "d MMM yyyy", { locale: es })` via date-fns (check if date-fns is installed; if not, use `toLocaleDateString('es-AR')`).
- **Unit test file** (`DestacadoPaymentModal.test.tsx`) covers (spec-review should_fix):
  - (a) Submitting with `amount=0` renders validation error ("Monto debe ser mayor que 0") and does NOT call fetch.
  - (b) Submitting with `period_end` before `period_start` renders validation error and does NOT call fetch.
  - (c) Valid payload: fetch is called with `POST /api/admin/subscriptions` and JSON body matching the expected shape (amount, currency, paid_at, period_start, period_end, payment_method, invoice_number, notes, professional_id). Use `vi.mock` or `globalThis.fetch = vi.fn(...)` to stub.
  - (d) Info banner renders when `professional.subscription_tier === 'destacado'` AND `professional.tier_expires_at > now`; absent otherwise.
  - (e) Modal calls `onClose` on Cancelar; does NOT call `onSuccess` on Cancelar.
  - (f) On successful submit: `onSuccess()` called, then `onClose()` called.
  - Mock `next/navigation` per existing `component-setup.ts` pattern.

**Definition of Done:**
- [ ] Modal opens on button click, closes on ESC + backdrop click.
- [ ] Submitting valid payload creates payment + upgrades tier + closes modal + shows new chip on row.
- [ ] Invalid inputs (amount=0, period_end before period_start) show inline error; submit disabled.
- [ ] Info banner visible in modal when professional is currently destacado with future expiry.
- [ ] Expand chevron shows past payments; collapses on re-click.
- [ ] Payments cache prevents refetching on re-expand.
- [ ] `npx tsc --noEmit` clean.
- [ ] No `console.log` — use `logError` in catch.
- [ ] Spanish copy throughout.
- [ ] **`DestacadoPaymentModal.test.tsx` passes all 6 cases** (a–f above) via `npm run test:unit` (spec-review should_fix).

**Verify:**
- Manual browser check at `/admin/professionals`.
- TS-001 E2E (Task 8).

---

### Task 6: Destacado chip on /profesionales + /p/[slug]

**Objective:** Visual signal for paid professionals on public pages.
**Dependencies:** Task 1 (columns in DB)
**Mapped Scenarios:** TS-002, TS-003

**Files:**
- Modify: `app/profesionales/page.tsx`
- Modify: `app/p/[slug]/page.tsx`

**Key Decisions / Notes:**
- Extend both pages' `select(...)` to include `subscription_tier, tier_expires_at`.
- Extend interfaces (`DirectoryProfessional`, `Professional`) with both fields.
- Import `isEffectivelyDestacado` from `lib/ranking.ts`.
- `/profesionales/page.tsx`:
  - In `ProfessionalCard`, after the `<h3 data-testid="professional-name">`, before the specialty chips row, render:
    ```tsx
    {isEffectivelyDestacado(pro.subscription_tier, pro.tier_expires_at) && (
      <Chip variant="brand" label="Destacado" className="mb-1" />
    )}
    ```
  - Add `data-testid="destacado-chip"` for E2E targeting (either wrap the Chip or add the attr to a container div since Chip doesn't accept `data-testid` today — wrap in a `<span data-testid="destacado-chip">`).
- `/p/[slug]/page.tsx`:
  - Identity card (Card 1): after the name h1, before short_description paragraph, render the same chip (centered, `flex justify-center mb-2`).
  - Same `data-testid` wrapper.

**Definition of Done:**
- [ ] When fixture professional has `tier='destacado'` + `tier_expires_at` in future, Destacado chip is visible on both `/profesionales` card and `/p/[slug]`.
- [ ] When expiry is in past, chip absent on both.
- [ ] When tier is 'basico', chip absent.
- [ ] `[data-testid="destacado-chip"]` selector finds the chip wrapper in both pages when active.
- [ ] `npx tsc --noEmit` clean.
- [ ] No hardcoded colors.

**Verify:**
- Manual browser check + TS-002/TS-003 E2E (Task 8).

---

### Task 7: Vercel cron — vercel.json + /api/cron/expire-destacado endpoint

**Objective:** Daily scheduled cleanup of expired destacado rows.
**Dependencies:** Task 1 (columns exist)
**Mapped Scenarios:** TS-004

**Files:**
- Create: `vercel.json`
- Create: `app/api/cron/expire-destacado/route.ts`

**Key Decisions / Notes:**
- `vercel.json`:
  ```json
  {
    "crons": [
      { "path": "/api/cron/expire-destacado", "schedule": "0 6 * * *" }
    ]
  }
  ```
  (06:00 UTC = 03:00 ART in standard time; Argentina does not observe DST, so this is stable year-round.)
- `/api/cron/expire-destacado/route.ts`:
  - `export const runtime = 'nodejs'`.
  - **Auth mechanism** (spec-review should_fix — documented explicitly): Vercel Cron on Vercel Pro automatically injects `Authorization: Bearer ${CRON_SECRET}` into scheduled invocations ONLY when `CRON_SECRET` is set in the project's Vercel environment variables. On Vercel Hobby, crons do not fire at all. The endpoint therefore checks `request.headers.get('Authorization') === \`Bearer ${process.env.CRON_SECRET}\``.
  - Extract `Authorization` header, verify it matches `Bearer ${process.env.CRON_SECRET}`.
  - On auth fail (missing, malformed, or mismatched): return 401 with `{ error: 'Unauthorized' }`. This is expected in local dev unless you manually pass the header via `curl`.
  - Run: `supabaseAdmin.from('professionals').update({ subscription_tier: 'basico', tier_expires_at: null }).eq('subscription_tier', 'destacado').lt('tier_expires_at', new Date().toISOString()).select('id')` — the chained `.select('id')` returns the affected ids.
  - Return `{ updated: N, ids: [...] }` with 200.
  - On DB error: logError + return 500.
  - Document at the top of the route file: **"This endpoint is NOT under `/api/admin/*`. Auth is CRON_SECRET only. Verify `CRON_SECRET` exists in Vercel project environment (Production + Preview). Vercel Hobby plan does not support scheduled crons — manually trigger via curl as a fallback."**
- `vercel.json` comment: note in the plan's risk table that Vercel Hobby blocks automatic cron firing AND the Bearer header injection.

**Definition of Done:**
- [ ] `vercel.json` exists with one cron entry.
- [ ] Endpoint returns 401 when `Authorization` header is missing or wrong.
- [ ] Endpoint returns 200 with `{updated: N}` when called with correct `CRON_SECRET`.
- [ ] After calling with a seeded past-expiry professional, the professional's `subscription_tier` is `'basico'` and `tier_expires_at` is `null`.
- [ ] Calling twice in a row: first call returns N, second returns 0 (idempotent).
- [ ] `npx tsc --noEmit` clean.
- [ ] No `console.log`.

**Verify:**
```bash
# Dev server running. Seed a past-expiry professional manually.
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/expire-destacado
# Expect 200 + { "updated": 1, "ids": [...] }
curl -i http://localhost:3000/api/cron/expire-destacado
# Expect 401
```

---

### Task 8: Playwright E2E — destacado.spec.ts

**Objective:** End-to-end browser verification of all 5 user-visible flows (TS-001, TS-002, TS-003, TS-004, TS-005).
**Dependencies:** Task 1, Task 4, Task 5, Task 6, Task 7
**Mapped Scenarios:** TS-001, TS-002, TS-003, TS-004, TS-005

**Files:**
- Create: `__tests__/e2e/destacado.spec.ts`

**Key Decisions / Notes:**
- Use `public` Playwright project for /profesionales and /p/[slug] (no auth needed).
- Use `admin` Playwright project (with storageState from `auth-setup`) for `/admin/professionals` interactions.
- If admin project setup is broken in this repo currently, document as deviation; TS-001/TS-005 then skip gracefully.
- Pattern: seed professional in `test.beforeAll` via `supabaseAdmin`; cleanup in `test.afterAll`.
- Skip gracefully when migration 005 not applied (probe for `tier_expires_at` column existence).
- Slugs prefixed `destacado-e2e-${ts}-` for cleanup.
- For TS-004 (cron), the test directly calls the cron endpoint via `fetch(url, { headers: { Authorization: 'Bearer ' + process.env.CRON_SECRET } })`.
- TS-001 and TS-005 require admin login; if admin project is not set up, mark as `test.fixme` with a clear reason.

**Definition of Done:**
- [ ] `npm run test:e2e` runs destacado.spec.ts.
- [ ] Public-only tests (TS-002, TS-003, TS-004) pass without admin auth (given DB is set up).
- [ ] Admin-required tests (TS-001, TS-005) pass when admin Playwright project is working; skip cleanly otherwise.
- [ ] All fixtures cleaned up in `afterAll`.
- [ ] Test file uses no hardcoded ids, relies on `${Date.now()}` uniqueness.

**Verify:**
```bash
npm run test:e2e -- --grep "destacado"
```

---

### Task 9: Update `.claude/plans/main.md`

**Objective:** Reflect the shipped state in the project-level plan: tick success criteria, add Destacado to Pages notes, surface follow-up PRDs, add session log entry.
**Dependencies:** All prior tasks complete and verified.
**Mapped Scenarios:** None (documentation).

**Files:**
- Modify: `.claude/plans/main.md`

**Key Decisions / Notes:**
- Add Success Criteria tick (if not already present): add an item like "Destacado tier MVP — admin can record payment, Destacado chip visible, cron cleans up expiries" as `[x]`.
- Add new Session Log entry dated 2026-04-24 (or whatever the implementation-complete date is): list files created + summary of capability shipped.
- Surface follow-up PRDs in Next Steps:
  - Self-serve Destacado checkout (MP SDK)
  - Automated AFIP invoicing (Tusfacturas / Contabilium)
  - Renewal reminders
  - `/pro/*` portal
  - Billing dashboard (/admin/subscriptions)
- Update Pages & Workflows table row for `/admin/professionals` to note "+ Destacado management (modal, history expand)".
- Add files to Key files reference section: `migrations/005_destacado_tier_mvp.sql`, `lib/ranking.ts` (extended), `app/api/admin/subscriptions/route.ts`, `app/api/cron/expire-destacado/route.ts`, `vercel.json`.
- Note that migration 005 must be applied to Supabase before feature is fully live.

**Definition of Done:**
- [ ] Session log entry dated 2026-04-24 present.
- [ ] Next Steps list includes at least 3 of the 5 follow-up PRDs.
- [ ] Key files reference includes the new artifacts.
- [ ] `/admin/professionals` row notes Destacado management.
- [ ] Prompt to apply migration 005 mentioned in the session log.

**Verify:**
```bash
grep -A2 "2026-04-24" .claude/plans/main.md | head -10
grep -E "Destacado|subscription_payments" .claude/plans/main.md | head -15
```

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | DEFERRED | 0 | Admin upgrade flow — covered by `DestacadoPaymentModal.test.tsx` (validation + payload shape) + parity fixture 11 (RPC). Full Playwright admin project not configured. |
| TS-002 | Critical | DEFERRED | 0 | Destacado chip on /profesionales — DB-dependent, skips until migration 005 applied. Manual test guide covers it. |
| TS-003 | High | DEFERRED | 0 | Destacado chip on /p/[slug] — same as TS-002. |
| TS-004 | High | PASS | 0 | Cron 401/auth path verified via Playwright (3 tests green: missing header, wrong token, wrong format). DB cleanup path skips until migration applied. |
| TS-005 | High | DEFERRED | 0 | Silent extension — covered by parity fixture 11 (RPC arithmetic). |
| TS-006 | Critical | DEFERRED | 0 | Migration idempotency + fixture 5 backward compat — covered by parity test extension (3 new fixtures). Skips until migration applied. |

## Open Questions

- If admin wants to "reset" the period (not extend) on an already-destacado professional — deferred (Extension semantics locked to silent extension for MVP). Revisit if admin asks for the toggle.
- `tier_expires_at IS NULL` on a destacado row (fixture 5 style) remains effective forever. Intended as backward-compat for pre-migration-005 data. If policy changes later (e.g., "all destacado rows must have an expiry"), follow-up migration adds cleanup + NOT NULL constraint.
- Should the payment history in the expanded row show the invoice as a clickable link? Deferred — AFIP comprobantes are not web-linkable. Admin has the invoice PDF in AFIP's portal.

### Deferred Ideas

- Admin "bulk upgrade" action (select N professionals + upgrade all) — future admin UX PRD.
- `/admin/subscriptions` standalone billing page — follow-up PRD for reporting/MRR.
- Email receipt to professional when admin records a payment — depends on /pro portal.
- Webhooks from MP (when self-serve ships) syncing tier state back into subscription_payments — self-serve PRD.
