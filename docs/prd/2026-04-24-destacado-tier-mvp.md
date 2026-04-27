# Destacado Tier — Admin-Gated MVP

Created: 2026-04-24
Author: belu.montoya@dialpad.com
Category: Feature
Status: Final
Research: Standard

## Problem Statement

Hará Match's 2026-04-01 pivot made subscription tiers the core monetization story. The Directory + Ranking Foundation PRD (shipped 2026-04-24) added the `subscription_tier` column to `professionals` (`'basico'` | `'destacado'`) and wired a +10 ranking boost for paid tier into `recompute_ranking()`. Today nothing writes to that column. No professional is `'destacado'`. The paid tier has no data, no visible signal to users, and no path to revenue.

Full payment-provider integration (MercadoPago subscriptions + webhooks + dunning + self-serve checkout) is the right long-term answer, but it's a multi-week investment for a solo dev building a product that hasn't yet proven professionals will pay. The highest-leverage move is to ship an **admin-gated MVP**: admin records a payment + extends a time-boxed Destacado boost via the existing admin UI. Payment itself happens out-of-band (MP link, transfer, WhatsApp handshake) and the admin enters the AFIP invoice number after issuing it via AFIP's portal. This starts generating revenue in days, validates demand, and builds the data model self-serve will later plug into without schema changes.

The legal constraint that shapes the MVP: AFIP requires an electronic invoice for every Argentine SaaS payment regardless of the payment channel. The admin UI therefore records payment metadata (amount, currency, invoice number, period) — not just a "toggle tier" button.

## Core User Flows

### Flow 1: Admin upgrades a professional to Destacado
1. Admin reviews `/admin/professionals` list, sees a professional who paid for Destacado (payment received via MP link, transfer, or other out-of-band channel).
2. Admin issues the AFIP invoice manually via AFIP's "Comprobantes en línea" portal; captures the invoice number.
3. Admin clicks "Upgrade / Extend Destacado" on the professional's row.
4. Modal opens: amount, currency (ARS or USD), paid_at (defaults to today), period (30 / 90 / 180 / 365 days or custom end date), payment method (MP link / transferencia / efectivo / otro), invoice number, notes.
5. Admin submits. System inserts a `subscription_payments` row, updates `professionals.subscription_tier = 'destacado'` and `tier_expires_at = period_end`. The `recompute_ranking()` trigger fires and the professional's `ranking_score` jumps by +10.
6. The row now shows "Destacado until <date>" as a brand chip.
7. The professional appears with a `Destacado` badge on `/profesionales` cards and `/p/[slug]`. Their ranking position rises visibly.

### Flow 2: Admin extends an active Destacado boost before it expires
1. Professional pays for a renewal a week before current boost expires.
2. Admin opens the same modal on the same row.
3. System detects `tier_expires_at > NOW()` and calculates `new period_end = tier_expires_at + N days` — paid time is never lost.
4. New `subscription_payments` row recorded; `tier_expires_at` extended.

### Flow 3: Boost expires naturally
1. `tier_expires_at` passes while ranking recomputes for some other reason (e.g., the professional edits their profile) — the expiry check in the trigger renders the ranking contribution as 0 immediately.
2. Daily cleanup cron runs (e.g., 03:00 ART) and sets `subscription_tier = 'basico'` + `tier_expires_at = NULL` for all rows where `tier_expires_at < NOW()` AND `subscription_tier = 'destacado'`. The Destacado badge disappears, the professional returns to Básico ranking.
3. Admin is NOT automatically notified (renewal reminders are a follow-up PRD). Admin notices via `/admin/professionals` list where no badge appears.

### Flow 4: User sees Destacado in the directory
1. User visits `/profesionales`.
2. Paid professionals appear higher (via +10 ranking boost) AND show a `Destacado` chip beside their specialty chips.
3. User clicks a card → lands on `/p/[slug]`, which also shows the Destacado chip near the name.

## Scope

### In Scope

- **Migration `migrations/005_destacado_tier_mvp.sql`**:
  - `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ`.
  - New table `subscription_payments`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE`
    - `amount NUMERIC(10,2) NOT NULL CHECK (amount > 0)`
    - `currency TEXT NOT NULL CHECK (currency IN ('ARS','USD'))`
    - `paid_at TIMESTAMPTZ NOT NULL`
    - `period_start DATE NOT NULL`
    - `period_end DATE NOT NULL CHECK (period_end > period_start)`
    - `payment_method TEXT NOT NULL CHECK (payment_method IN ('mp_link','transferencia','efectivo','otro'))`
    - `invoice_number TEXT` (nullable — admin may record invoice later)
    - `notes TEXT`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - `created_by UUID` (admin user id from Supabase auth, nullable for now)
  - Index `idx_subscription_payments_professional` on `(professional_id, paid_at DESC)`.
  - Index `idx_professionals_tier_expires` on `(tier_expires_at)` for the cleanup cron.
- **Update `recompute_ranking()` trigger function** to compute tier contribution as:
  `CASE WHEN subscription_tier = 'destacado' AND (tier_expires_at IS NULL OR tier_expires_at > NOW()) THEN 100 ELSE 0 END`. (The `IS NULL OR` branch protects against legacy rows that may have tier set but no expiry.)
- **Update `lib/ranking.ts`** `computeTierContribution()` signature to take an optional `tierExpiresAt: Date | string | null` — must mirror SQL exactly.
- **Update parity test** `__tests__/integration/ranking-parity.test.ts` to cover: Destacado with future expiry → 100, Destacado with past expiry → 0, basico ignores expiry.
- **Admin UI in `app/admin/professionals/page.tsx`**:
  - New inline "Destacado" status chip per row: "Destacado until <DD MMM YYYY>" (brand color, expires-soon color when < 7 days out) or "Básico" (neutral).
  - New "Upgrade / Extend" button per row (icon + label) opening the modal.
  - Modal component (`app/admin/professionals/components/DestacadoPaymentModal.tsx`): form with the fields listed above, client-side validation (amount > 0, period_end > period_start, required fields), submit to API.
  - History: small expandable section per row showing past `subscription_payments` (date, amount + currency, period, method, invoice #).
- **Server action / API route** `POST /api/admin/subscriptions`:
  - Auth: admin-only (reuse the pattern from existing admin routes — server-role check).
  - Validates payload.
  - Inserts `subscription_payments` row.
  - Updates `professionals.subscription_tier = 'destacado'` and `tier_expires_at = new_period_end`. If professional currently has Destacado with a future `tier_expires_at`, extend by adding the period to that date rather than `paid_at`.
  - Wrap in a Postgres function / RPC for atomicity (same pattern as `create_match_with_recommendations_atomic` in migration 003).
  - Returns 201 with the new payment row.
- **Daily cleanup cron**:
  - Simplest path: Vercel Cron Job hitting a secured endpoint `/api/cron/expire-destacado` that runs the cleanup SQL. Reuse existing `CRON_SECRET` env var for auth.
  - SQL: `UPDATE professionals SET subscription_tier = 'basico', tier_expires_at = NULL WHERE subscription_tier = 'destacado' AND tier_expires_at < NOW()`. The `BEFORE UPDATE` ranking trigger fires and recomputes ranking_score to effectively-basico.
- **Public UI — Destacado chip**:
  - `app/profesionales/page.tsx` card: add `<Chip variant="brand" label="Destacado" />` when the professional is effectively Destacado (i.e., `tier='destacado' AND (tier_expires_at IS NULL OR tier_expires_at > NOW())`). Chip placed beside specialty chips.
  - `app/p/[slug]/page.tsx`: same chip, near the name in the identity card.
  - Both pages must include `tier_expires_at` and `subscription_tier` in their select clauses.
- **Tests**:
  - Unit: `lib/ranking.ts` — `computeTierContribution` with expiry (future → 100, past → 0, null → current behavior for destacado = 100).
  - Unit: `DestacadoPaymentModal` — form validation, submit payload shape.
  - Integration: `POST /api/admin/subscriptions` happy path (creates payment + updates tier + ranking) + extension case (current expiry + N days).
  - Parity test extension: 2 new fixtures with tier_expires_at in past and future.
  - Playwright E2E: admin opens modal → submits → directory shows Destacado chip → card has ranking boost → expire the fixture → badge disappears.
- **Update `.claude/plans/main.md`**: tick paid-tier success-criteria items, add Destacado badge/UX row to Pages table note, surface follow-up PRDs (self-serve checkout, /pro portal, automated invoicing).

### Explicitly Out of Scope

- **Self-serve checkout** (professional clicks Upgrade, pays with card) — separate follow-up PRD. Ship admin-gated first, validate demand.
- **MercadoPago / Stripe SDK integration** — follows self-serve PRD.
- **Automated AFIP invoice generation** (Tusfacturas / Contabilium / AFIP web service) — admin issues manually via AFIP's portal; app records the invoice number. Automation is a future PRD when volume justifies it.
- **Dunning / payment retry / failed-payment flow** — N/A for retrospective recording; automated payments don't exist yet.
- **`/pro/*` portal** (professional sees their own tier status) — out of scope; they learn via admin WhatsApp. Relevant with self-serve.
- **Featured Destacados strip on home page** — kept minimal. Badge + ranking boost is the MVP signal.
- **Multi-tier structure** (Premium etc.) — binary `basico` / `destacado` locked; revisit when binary proves itself.
- **Automated renewal reminders** (email professional or admin N days before expiry) — follow-up PRD.
- **Refund handling** — admin handles out-of-band; app doesn't enforce or reverse subscription_payments rows.
- **Dashboard / analytics for admin** ("MRR", "active destacados this month", "churn") — raw `subscription_payments` table is queryable; a real dashboard is a future PRD.
- **Billing history visible to the professional** — depends on `/pro/*` portal.
- **Proration for mid-period changes** — admin handles out-of-band; model just records what admin enters.

## Technical Context

- **Framework & stack**: Next.js 14 App Router, TypeScript, Supabase Postgres, Tailwind v4, Vitest (unit + integration), Playwright (E2E + visual).
- **Builds on**:
  - `migrations/004_ranking_foundation.sql` — ranking columns + `recompute_ranking()` trigger (must be extended, not replaced).
  - `lib/ranking.ts` — TS parity helper (must be extended).
  - `__tests__/integration/ranking-parity.test.ts` — extended with new fixtures.
  - `app/profesionales/page.tsx` + `app/p/[slug]/page.tsx` — add Destacado chip.
  - `app/admin/professionals/page.tsx` — add inline controls + modal.
- **Patterns to follow**:
  - Atomic SQL RPC for payment + tier update: `migrations/003_production_hardening.sql` (`create_match_with_recommendations_atomic`).
  - Admin API route structure: `app/api/admin/leads/[id]/route.ts`, `app/api/admin/professionals/route.ts`.
  - Modal component: `app/components/ui/Modal.tsx` (existing primitive).
  - Chip: `app/components/ui/Chip.tsx` — use `variant="brand"` for Destacado.
  - Cron endpoint pattern: existing `CRON_SECRET` env var; similar to Apr 1 PQL reconciliation notes.
- **Constraints**:
  - Design system is fixed — reuse Chip, Modal, Button, GlassCard. No new primitives.
  - All user-facing + admin-facing copy in Spanish (Argentine informal: "Destacar", "Básico", "Cobrado", "Hasta", "Factura N°", etc.).
  - Service-role DB writes via `lib/supabase-admin.ts`.
  - Error logging via `lib/monitoring.ts`.
  - Push-to-main workflow.
- **Effective-tier computation — define once, reuse everywhere**:
  - Canonical SQL expression: `subscription_tier = 'destacado' AND (tier_expires_at IS NULL OR tier_expires_at > NOW())`.
  - Canonical TS helper: `export function isEffectivelyDestacado(tier: string, expiresAt: Date | string | null): boolean`.
  - Both the directory page, profile page, and admin UI use the TS helper; ranking trigger uses the SQL expression. Tested for parity.
- **AFIP integration constraint**: admin issues invoices out-of-band. The app stores `invoice_number` as plain TEXT; no validation against AFIP. If volume grows, swap the manual step for Tusfacturas/Contabilium later — schema doesn't change.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Upgrade path | Admin-gated MVP (retrospective recording) | Ships in days; validates demand before weeks of MP/Stripe integration. Revenue starts flowing immediately. |
| Billing shape | Time-boxed boost with `tier_expires_at` | Simplest model: no subscription concept, no dunning, no cancel. Natural renewal moment at each expiry. Maps cleanly to future self-serve. |
| Tier structure | Keep binary (`basico` / `destacado`) | Directory PRD already locked this. Two levels is enough product signal. Multi-tier is one migration away. |
| Admin UI placement | Modal inline from `/admin/professionals` list | Works with existing page; no new routes to build; fastest to ship. Also the page where admin already triages professionals. |
| Destacado visibility | Chip badge on card + profile, ranking boost unchanged | Pays for the boost; combined with +10 ranking rise, the paid tier is visibly rewarded. Lower complexity than featured placement strip. |
| Ranking-aware expiry | Trigger checks `tier_expires_at` at recompute time | Effective tier is always correct in ranking_score the next time the row is touched. Cron just cleans up stored state for reporting. |
| Cleanup mechanism | Daily Vercel cron → secured API route | Reuses existing `CRON_SECRET` pattern. Simpler than a Postgres scheduled function. |
| Extension semantics | New `period_end = tier_expires_at + N days` when extending before expiry | Fair to the professional — they don't lose paid time if they renew early. |
| AFIP invoicing | Admin issues manually via AFIP portal; app stores invoice number | No integration cost for MVP. Swap in Tusfacturas/Contabilium later without schema change. |
| Currency | Per-payment ARS or USD (both allowed) | Admin may charge either depending on professional. Store as amount + currency; aggregate reporting is a future problem. |
| Tests | Unit + integration + Playwright E2E | Same stack as the rest of the app; parity test extension keeps SQL↔TS in sync. |

## Research Findings

**MercadoPago Subscriptions API (for future self-serve PRD)** — `preapproval_plan` + `preapproval` endpoints, per-country URLs (AR/MX/BR/CO). Supports create/update/pause/cancel. Low risk when we integrate.

**AFIP invoicing is legally required for Argentine SaaS revenue** — regardless of payment channel. Monotributistas issue Factura C via AFIP's "Comprobantes en línea" portal or via the "Facturador móvil" mobile app. Responsables inscriptos issue Factura A/B. For MVP, admin issues manually and enters the invoice number in the modal. Tusfacturas and Contabilium offer automation APIs when volume justifies it.

**ARS vs USD pricing in LATAM SaaS (2025)** — localized pricing outperforms simple USD conversion. Argentina's ARS volatility pushes many SaaS to bill USD for revenue stability; others anchor in ARS and re-index every 3–6 months. Both work. This PRD stores amount + currency per payment — pricing strategy is a business decision separate from the data model.

**Competitor pricing (Zonaprop, Doctoralia, etc.)** — not publicly listed; B2B sales-gated. No usable reference.

**Dunning** — smart retries (3–5 attempts over 7–14 days) recover 70–80% of failed subscription payments in self-serve flows. Not applicable to this admin-gated PRD; relevant when self-serve ships.

## Open Questions

- When admin extends a Destacado boost before current one expires, new `period_end = current tier_expires_at + N days` — proposed as default ("don't lose paid time"). Edge case: if admin wants to start a fresh period instead (e.g., switched billing cycle), should the modal offer both options? **Proposed:** ship with "extend from current expiry" only; add "start fresh" if admin asks.
- What happens to a Destacado professional who gets `paused` or `rejected`? **Proposed:** tier data persists on the row; status filter already excludes them from the directory, so they stop benefiting. On reactivation to `active`, existing `tier_expires_at` resumes.
- Does the public `/p/[slug]` profile page need a different treatment for Destacado (e.g., subtle border, position of badge)? **Proposed:** same chip as the directory card, placed near the name in the identity card. Simple, consistent.
- Should the cron delete expired `subscription_payments` rows? **Proposed:** no. The history is audit-valuable. `subscription_payments` is append-only.

## Follow-up PRDs

These are intentionally not in scope, listed so future sessions know what unlocks after this ships:

1. **Self-serve Destacado checkout** — MercadoPago SDK, checkout page at `/profesionales/[slug]/upgrade`, webhook to `/api/webhooks/mercadopago`, subscription lifecycle sync. Unlocks auto-renewal.
2. **Automated AFIP invoicing** — Tusfacturas or Contabilium integration. Removes manual step from admin flow.
3. **Renewal reminders** — email professional N days before `tier_expires_at`; email admin daily summary of expiring subscriptions.
4. **`/pro/*` portal** — professionals see their tier status, past payments, and eventually self-serve upgrades from the portal.
5. **Billing dashboard** — `/admin/subscriptions` page with MRR, active-destacado count, churn, monthly revenue summary for AFIP declarations.
6. **Multi-tier** — Premium / Pro tiers if the binary structure saturates (e.g., if every serious professional goes Destacado, there's no more differentiation).
7. **Refund / downgrade flow** — formalize in-app what admin does manually today.
