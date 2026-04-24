# Directory + Ranking Foundation

Created: 2026-04-24
Author: belu.montoya@dialpad.com
Category: Feature
Status: Final
Research: Quick

## Problem Statement

Hará Match pivoted its business model on 2026-04-01 from "PQL/concierge only" to "Directory + Concierge with subscription tiers and review-based ranking." The concierge infrastructure (tracking codes, attribution tokens, matches, events, PQLs) is complete. The directory side of the new model is not built: there is no `/profesionales` page, no ranking logic, and no `subscription_tier` / `rating_average` / `ranking_score` data anywhere in the schema.

Without a directory, the app has no organic discovery path. Users can only reach professionals via admin-sent concierge links, which means no self-serve acquisition, no subscription revenue story, and no surface for the future review system to live on. The plan's recent work has polished the concierge-era infrastructure (home dual CTA, specialty colors, admin list improvements, legal page) while the load-bearing directory + ranking + reviews + payments system remains unbuilt.

This PRD builds the minimum foundation to put `/profesionales` online with real ranking data: ranking columns on `professionals`, a scoring function that anticipates review and tier inputs (even though those inputs aren't active yet), a DB trigger that keeps scores fresh, and a minimal list view sorted by ranking. Filters, search, Destacado UI, reviews, and payments are explicit follow-up PRDs.

## Core User Flows

### Flow 1: User browses professionals from the directory
1. User visits `/profesionales` (from the home page CTA or direct link).
2. System renders all `active` + `accepting_new_clients` professionals, ordered by `ranking_score DESC`, then `created_at DESC` as tiebreaker.
3. Each card shows: profile image (or initials fallback), name, up to 3 specialty chips, city + country or "Online" badge, "Ver perfil" CTA.
4. User clicks a card → navigates to `/p/[slug]` (existing public profile).
5. From there, the existing WhatsApp contact flow takes over unchanged.

### Flow 2: A professional's ranking stays current as data changes
1. Admin approves a submitted professional → professional row goes to `active`.
2. DB `BEFORE INSERT OR UPDATE` trigger fires `recompute_ranking()` → recomputes `profile_completeness_score` and `ranking_score` in-place.
3. Professional immediately appears on `/profesionales` in the correct position.
4. Later (when the Reviews and Payments PRDs land): review submission or tier change will fire equivalent triggers on their respective tables. The formula already accounts for those inputs — no formula migration needed.

### Flow 3: Backfill on deploy
1. Migration adds ranking columns with `NOT NULL DEFAULT 0`.
2. Migration ends with `UPDATE professionals SET updated_at = NOW()` — trigger fires for every row, computing completeness and ranking.
3. Directory is immediately usable with real scores for the existing 45 professionals.

## Scope

### In Scope

- **DB migration** `migrations/004_ranking_foundation.sql` adding to `professionals`:
  - `profile_completeness_score INTEGER NOT NULL DEFAULT 0` (0–100)
  - `rating_average NUMERIC(3,2) NOT NULL DEFAULT 0` (0.00–5.00)
  - `rating_count INTEGER NOT NULL DEFAULT 0`
  - `subscription_tier TEXT NOT NULL DEFAULT 'basico' CHECK (subscription_tier IN ('basico','destacado'))`
  - `ranking_score NUMERIC(6,2) NOT NULL DEFAULT 0`
  - Index: `CREATE INDEX idx_professionals_directory ON professionals (status, accepting_new_clients, ranking_score DESC)`.
- **Postgres function** `recompute_ranking()` (trigger function) that:
  - Computes `profile_completeness_score` from the 10 criteria mirrored from `lib/profile-score.ts` (same keys, same weights, same truthiness rules — e.g., `bio` only counts if length ≥ 50 chars).
  - Computes `ranking_score = round(0.7 * completeness + 0.2 * rating_contribution + 0.1 * tier_contribution, 2)` where:
    - `rating_contribution = CASE WHEN rating_count > 0 THEN LEAST(rating_average * 20, 100) ELSE 0 END`
    - `tier_contribution = CASE WHEN subscription_tier = 'destacado' THEN 100 ELSE 0 END`
  - Writes both columns on the row being inserted/updated.
  - At launch (no reviews, no paid tier), this evaluates to `0.7 * completeness`.
- **DB trigger** `BEFORE INSERT OR UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION recompute_ranking()`.
- **Backfill**: final statement in the migration is `UPDATE professionals SET updated_at = NOW();` so the trigger fires for all existing rows.
- **`/profesionales` page** (`app/profesionales/page.tsx`, server component):
  - Fetches via `supabaseAdmin` filtered by `status = 'active' AND accepting_new_clients = true`, ordered by `ranking_score DESC, created_at DESC`.
  - Uses `PageBackground`, `GlassCard`, `Chip` with specialty variant, existing tokens.
  - Card content: profile image (or initial-letter fallback for missing images), name, up to 3 specialty chips (colored), city + country or "Online" badge, pill "Ver perfil" CTA linking to `/p/[slug]`.
  - Empty state: Spanish copy "Todavía no hay profesionales disponibles." (should not trigger at launch).
  - Mobile-first responsive — matches existing `max-w-md mx-auto px-4` page shell established by the design sweep.
- **TS parity helper** (`lib/ranking.ts` — new, required):
  - Exports `computeRankingScore({ completeness, ratingAverage, ratingCount, tier })` returning the same number the SQL trigger would.
  - Lets admin UIs and tests reason about ranking without round-tripping to the DB.
  - Enables the TS↔SQL parity test (below), which is the only low-cost guard against the ranking formula drifting between languages.
- **Tests**:
  - Unit tests for `lib/ranking.ts`: empty inputs → 0, all-maxed → 100, tier-only → 10, rating-only with count=0 → 0, rating with count=1 → weighted contribution.
  - **TS↔SQL parity test**: a fixture professional row is scored by `computeRankingScore()` in TS and by the SQL trigger, and the two results must match exactly (to 2 decimal places). Catches drift the moment it happens.
  - Integration test: seed 5 professionals with varied completeness (and 1 with `accepting_new_clients=false`, 1 with `status='paused'`), assert the directory returns the correct 3 in the correct order.
  - Playwright visual baseline for `/profesionales` (follows existing visual regression pattern in `__tests__/e2e/visual/`).
- **Plan updates** in `.claude/plans/main.md`:
  - Tick off the "DB: Add ranking/tier fields" and "`/profesionales` — Public directory" success-criteria entries once shipped.
  - Update `/profesionales` row in the Pages table from "**New — Phase 1**" to "**Done**".
  - Surface the follow-up PRDs (Reviews, Payments, Professional portal) as new Next Steps.

### Explicitly Out of Scope

- **Filter bar** (specialty / location / modality) — separate follow-up PRD. Deferring UX decisions (chip-based vs dropdown, mobile drawer vs inline) to a dedicated pass.
- **Name search / fuzzy search** — separate follow-up. Requires FTS or trigram index; not needed at ~45 professionals.
- **Pagination** — deferred. Returns all matching professionals in one query; revisit at ~100+ active.
- **Destacado visual differentiation** (badge, featured placement, highlighted card) — deferred to the Payments PRD. The UI only matters once there are paid professionals; baking it in now is premature.
- **Review collection flow** — separate PRD. The `rating_average` / `rating_count` columns exist to receive this data but nothing writes them yet.
- **Payment / subscription activation** — separate PRD. The `subscription_tier` column exists but admins cannot change it yet; for testing, toggle via direct DB update.
- **Directory-contact tracking bug fix** (`app/components/ContactButton.tsx:43` skips events when `attributionToken` is absent) — flagged as a known issue but fixing it belongs with the Review collection PRD where it has direct consequences.
- **SEO metadata** (structured data, sitemap, OG images for `/profesionales` and `/p/[slug]`) — separate polish PRD.
- **Admin UI to tune ranking weights** — weights stay as SQL constants inside the trigger function, editable via new migration.
- **`/p/[slug]` changes** — existing page stays as-is; directory only links to it.
- **Public API route** (`/api/public/professionals`) — not needed for a server-rendered page; add only if a future interactive feature requires it.

## Technical Context

- **Framework & stack**: Next.js 14 App Router (server components by default), TypeScript, Supabase PostgreSQL, Tailwind CSS v4 (`@theme` tokens in `app/globals.css`).
- **Existing patterns this must follow**:
  - Service-role DB writes via `lib/supabase-admin.ts` (never expose service role to client).
  - Design system is fixed — reuse `liquid-glass` class, pill CTAs (`rounded-full`), `GlassCard`, `PageBackground`, `Chip`. Never modify the design system; change context if it doesn't fit.
  - Error logging via `lib/monitoring.ts`, never `console.log`.
  - All user-facing copy in Spanish (Argentine informal: vos, querés, escribís).
  - Push-to-main workflow (no PRs).
- **Existing code to reuse**:
  - `lib/profile-score.ts` — completeness logic (10 criteria, 100 pts). SQL trigger must mirror this exactly; drift between TS and SQL scoring is a bug source.
  - `lib/supabase-admin.ts` — service role client.
  - `app/components/ui/GlassCard.tsx`, `PageBackground.tsx`, `Chip.tsx` (specialty variant).
  - `lib/design-constants.ts` — `SPECIALTY_MAP`, `SPECIALTY_COLORS`, `MODALITY_MAP`.
  - `app/globals.css` — tokens.
- **Existing infrastructure to preserve**:
  - All concierge-mode code (`/r/[tracking_code]`, events, PQLs, matches) is untouched; this PRD only adds.
  - RLS policies on `professionals` stay as-is (directory reads happen via service-role in a server component).
- **Files to be created**:
  - `migrations/004_ranking_foundation.sql`
  - `app/profesionales/page.tsx`
  - `lib/ranking.ts` (TS parity helper — see scope)
  - `__tests__/integration/directory.test.ts`
- **Files to be modified**:
  - `.claude/plans/main.md` — Next Steps, Success Criteria, Pages table, add follow-up PRD entries.
- **Verification**:
  - `npm run test:unit` passes (including new ranking formula tests and TS/SQL parity test if TS helper is added).
  - `npm run build` succeeds.
  - Manual browser check on `/profesionales` — renders, cards look right, order matches ranking_score, click navigates to `/p/[slug]`.
  - DB spot-check: pick 2 professionals with very different completeness, confirm their `ranking_score` reflects the expected ordering.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Scope shape | Foundation-only: ranking backend + minimal list page (no filters, no search, no pagination, no Destacado UX) | Proves the ranking model on real data before investing in filter UX. Smaller scope ships faster and makes mistakes easier to roll back. |
| Formula shape | Weighted sum with all three inputs wired from day one (completeness 70% / rating 20% / tier 10%) | When Reviews and Payments PRDs ship, no formula migration needed — just turn on the data. Transparent, tunable, easy to debug. |
| Refresh cadence | Postgres trigger on `BEFORE INSERT OR UPDATE ON professionals` | Simple, always fresh. Completeness is the only live input at launch and rarely changes, so trigger overhead is negligible. Future review/tier changes fire their own triggers. |
| Completeness source of truth | Mirror `lib/profile-score.ts` criteria in SQL (same 10 rules, same weights, same truthiness logic) | Single conceptual source of truth; parity enforced by a test that runs the same fixture through both paths. Alternative (computing in TS and writing to DB) would add a second write path and couple every DB update to app code. |
| Completeness threshold for directory inclusion | No hard threshold at launch — all `active + accepting_new_clients` profiles appear regardless of completeness | Defer the "hide incomplete profiles" decision until we see the real distribution. Flagged in Open Questions. |
| Tiebreaker after `ranking_score DESC` | `created_at DESC` (newer profiles win ties) | Predictable, stable, no randomness. Can revisit if we see unfair clustering. |
| Card content | Image (with initial-letter fallback), name, up to 3 specialty chips, city/online, "Ver perfil" CTA | Matches existing `/p/[slug]` vocabulary; reuses established design primitives; no new patterns to learn. |
| Inclusion criteria | `status = 'active' AND accepting_new_clients = true` | Matches the semantic intent of both fields — `active` means approved and visible, `accepting_new_clients` gates whether we're sending traffic to someone who can actually take on clients. |
| Pagination | None for v1 | Not needed at ~45 profiles. Add when active count crosses ~100. |
| Destacado UX | Deferred to Payments PRD | No paid professionals exist today; UI work is premature. `subscription_tier` column exists so the Payments PRD only needs to add admin UI + checkout wiring. |
| Public API route | Skip for this PRD | The server-rendered page doesn't need it. Add only when a future interactive feature requires it. |

## Open Questions

- How should profiles with `completeness_score = 0` or very low scores be handled? Hide them? Show with a "perfil incompleto" badge? Show as-is at the bottom? (For v1 they show as-is; revisit after seeing the real distribution.)
- Should the migration's backfill trigger a one-time email to existing professionals whose computed completeness is below some threshold (e.g., < 50), nudging them to complete their profile? (Probably no for this PRD — belongs with a professional-engagement or onboarding PRD.)
- When the Reviews PRD adds a `reviews` table, does the trigger on `reviews` recompute the professional's `rating_average` / `rating_count` inline, or is there a separate materialized summary? (Not this PRD's call, but worth flagging so the Reviews PRD knows the ranking trigger depends on those columns being accurate.)

## Follow-up PRDs (not this PRD)

These are intentionally not in scope here, but listed so future sessions know they exist and that this PRD was designed to unblock them:

1. **Review collection system** — post-contact review link, reviews table, submission page (no login), display on `/p/[slug]`. Also fixes the `ContactButton.tsx` tracking bug for directory-initiated contacts.
2. **Payments + subscription tiers** — MercadoPago (LATAM) or Stripe (global) integration, checkout, subscription lifecycle, webhook, admin tier visibility.
3. **Directory filters + search** — specialty / location / modality filters, name search, pagination.
4. **Destacado UX** — badge, featured placement, card highlight, home page "Destacados" strip.
5. **Professional portal (`/pro/*`)** — auth-bind `professionals.user_id`, `/pro/leads`, `/pro/profile` edit, `/pro/tier` upgrade flow.
6. **Real verification** — credential upload, license field, document storage, admin verification workflow.
7. **SEO foundation** — structured data, sitemap, OG images, meta per profile.
