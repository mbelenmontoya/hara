# Plan: main

## Overview

Hará Match is a curated wellness professional marketplace for Latin America and Spain. It combines two modes:

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
- [ ] Public directory page (`/profesionales`) with reputation-based ranking
- [x] Home page redesign with dual CTA (directory + concierge)
- [x] Admin dashboard improvements — search + status filters on all 3 list pages, debug routes migrated to admin, inline match context on leads
- [x] Registration full-flow E2E test — Playwright test covering 4-step form, image upload, DB verification, cleanup
- [x] Unified legal page at `/terminosyprivacidad` with collapsible terms/privacy content and form links

## Constraints

- Design system is fixed — use it as-is, never modify or extend the visual language. If a context doesn't fit, change the context (e.g., use a different background), not the system.
- All user-facing copy in Spanish (Argentine informal: vos, querés, escribís)
- No broad DB schema changes — targeted additions only
- Rejected profile handling is pinned for a future conversation (keep data? allow resubmit?)

## Next Steps

1. **Visual test design system sweep**
   - What: Open every page in the browser and verify visual consistency — background, glass cards, pill buttons, title hierarchy, spacing. The code changes are done but not visually verified.
   - Why: First pass was token-only. Second pass aligned components (Button → rounded-full, Home → glass cards, Leads → GlassCard, identical DOM shells). Needs eyes on it.
   - Considerations: Check `/`, `/solicitar`, `/gracias`, `/profesionales/registro`, `/profesionales/registro/confirmacion`, `/p/[slug]`, `/admin/leads`, `/admin/pqls`, `/admin/leads/[id]/match`, `/admin/professionals`, `/admin/professionals/[id]/review`

2. **Finish image upload testing**
   - What: Verify the full flow — form with image → FormData submission → Supabase Storage upload → URL in DB → visible on review page and profile page.
   - Why: Code is written but the upload hasn't been tested end-to-end.

3. **Decide rejected profile handling**
   - What: Product decision — when a profile is rejected, do we keep the data? Can the professional resubmit? Do they get notified?
   - Why: DB stores `rejected` status and `rejection_reason` but there's no flow after rejection.

4. **DB: Add ranking/tier fields to `professionals` table**
   - What: `subscription_tier`, `rating_average`, `rating_count`, `profile_completeness_score`, `ranking_score`
   - Why: Foundation for the directory page and reputation system

5. **`/profesionales` — Public directory page**
   - What: List approved professionals sorted by ranking_score, filter by specialty/location/modality, search by name
   - Why: Primary discovery path in the new Directory + Concierge model

6. **Admin pages (remaining):**
   - `/admin/leads/[id]` — Lead detail
   - `/admin/professionals/[id]` — Professional detail (separate from review — reviews, rating, tier)
   - `/admin/analytics` — Funnel dashboard
   - `/admin/settings` — Operational config

## Session Log

### Session — 2026-04-20

**Completed:**
- Legal/trust page (`docs/plans/2026-04-20-legal-pages.md`)
  - Replaced the split legal routes with a unified `/terminosyprivacidad` page
  - Structured the page as two glass cards (`Términos` and `Privacidad`) with lightweight top anchor links outside the cards
  - Implemented transparent collapsible subsection titles with a left chevron inside each card
  - Updated the registration and intake form footers to point to the unified legal route
  - Preserved `/terminos` and `/privacidad` as redirects into the unified page anchors

**Deviations:**
- First pass overdesigned the legal content (split routes, extra card treatment, wrong interaction style). Reworked after review to match the design-system constraints and the simpler unified-page approach.
- A stale dev server held deleted-module references and served a broken page state; restarted cleanly and verified the route on a single server instance.

**Blockers:**
- None. Route builds and serves correctly; any remaining work is visual follow-up based on review.

### Session — 2026-04-08

**Completed:**
- Admin dashboard improvements (`/spec` — plan: `docs/plans/2026-04-08-admin-dashboard-improvements.md`, VERIFIED)
  - Created shared `AdminFilterBar` component (`app/admin/components/AdminFilterBar.tsx`, 84 lines, 8 unit tests) — search input + status dropdown, reusable across all admin list pages
  - Created 3 new admin API routes: `GET /api/admin/leads` (with Supabase join for match context: tracking code + professional names), `GET /api/admin/professionals`, `GET /api/admin/pqls`
  - Rebuilt Leads page as client component — search by email/intent, status filter, inline match context for matched leads (tracking code + professional names), urgency badge
  - Enhanced Professionals page — added filter bar (search by name/specialty + status filter), switched from debug to admin API, added registration date to cards
  - Enhanced PQLs page — search by professional name + month dropdown (dynamically populated from data), tracking code column, fixed pre-existing field name bug (`professionals` → `professional` singular)
  - Deleted debug routes: `/api/debug/professionals`, `/api/debug/pqls`
  - Updated match creation page (`/admin/leads/[id]/match`) — API URL from debug→admin + fixed `specialty: string` → `specialties: string[]` field type (API contract drift from migration)
  - Fixed build-time Supabase join type mismatch (Next.js strict mode caught `professionals` array vs object in leads API), wrapped `fetchEntries` in `useCallback` for PQLs page
- Registration full-flow E2E test (`/spec` — plan: `docs/plans/2026-04-08-registration-full-flow-e2e.md`, VERIFIED)
  - `__tests__/e2e/registration-full-flow.spec.ts` — complete 4-step form walkthrough with Google Maps mock, image upload via `setInputFiles`, API response interception, DB + Storage cleanup via Supabase service role client

**Deviations:**
- Code reviewer caught `specialty` field mismatch in match creation page — the old debug route transformed `specialties[0]` → `specialty`, but the new admin route returns the raw array. Fixed during verification phase.
- PQL adjustment modal is broken (pre-existing: sends `{ amount, reason }` but API expects `{ adjustment_type, reason, billing_month }`). Documented as known issue, explicitly out of scope.

**Blockers:**
- E2E scenarios (TS-001/002/003) could not be browser-verified — admin login credentials not available in test session. All code statically verified (TypeScript clean, 35 tests pass, build succeeds).

### Session — 2026-04-07

**Completed:**
- Design system sweep — two passes (`/spec` — plan: `docs/plans/2026-04-06-design-system-sweep.md`)
  - **Pass 1 (token replacement):** Extracted shared label maps (MODALITY_MAP, STYLE_MAP, STATUS_CONFIG, SERVICE_TYPE_MAP) to `lib/design-constants.ts`. Extracted ScoreRing + ScoreBreakdown from review page → `ScoreDisplay.tsx` (522 → 423 lines). Added profile image avatar to admin review header. PQL ledger and match creation pages fully rewritten (AdminLayout, GlassCard, Modal, Button, Alert, Spanish copy, logError). All `#FBF7F2` replaced with `PageBackground` (7 files). All `border-white/30` → `border-outline/30`. E2E test `admin-match-flow.spec.ts` updated (dialog → React Alert assertions, English → Spanish text).
  - **Pass 2 (real visual patterns):** Button component — all sizes `rounded-lg`/`rounded-xl` → `rounded-full` (pill shape matches actual finished pages). Home page full rework — removed PublicLayout, added PageBackground + glass card "Cómo funciona" + pill CTAs + privacy footer. Admin leads page — `Card` → `GlassCard`, "Leads" → "Solicitudes". Cleaned up redundant `rounded-full` overrides on review and match pages.
- DOM structure alignment — all standalone public pages now share identical wrapper: `relative z-10 max-w-md mx-auto px-4 pt-8 pb-12`
- Design system pattern catalog built — audited every finished page and cataloged: page shell, title hierarchy, glass card, section headers, button shapes (pill CTAs, chip toggles, option toggles), form inputs, privacy footer, back navigation, avatar, timeline steps

**Deviations:**
- First `/spec` attempt treated design system as "token replacement" only — swapped CSS class names without addressing actual visual patterns (button shapes, card types, page structure). User pushed back: "you clearly did not understand what a design system is." Second pass audited finished pages and applied the real patterns.
- Original plan had "Home page redesign" as a future next step (step 6). Moved it up because the home page was the most visually broken page — it used `PublicLayout` (flat header/footer) while every other page uses standalone glass-card layout.

**Blockers:**
- All changes are code-complete but NOT visually verified — user will test next session
- Admin pages behind auth can't be E2E tested without `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` env vars

### Session — 2026-04-06

**Completed:**
- Test suite hardening (`/spec` — plan: `docs/plans/2026-04-06-test-suite-hardening.md`, VERIFIED)
  - Rewrote Badge, Alert, GlassCard tests to assert behavior/rendering instead of CSS classes
  - Removed Clerk reference from admin-auth-gating E2E, now tests Supabase Auth redirect
  - Made ui-smoke content-agnostic (no specific heading text or link href)
  - Replaced silent `test.skip` with `beforeAll` throws on missing seed data
  - Replaced `waitForTimeout` with condition-based polling (`expect.poll`)
  - Fixed dialog listener race condition in admin-match-flow E2E
  - Used seed data slugs for public-profile instead of auth-gated API
  - Added pre-push hook (`scripts/hooks/pre-push`) that runs unit tests
  - Added `scripts/setup-hooks.sh`, auto-installs via `npm prepare` script
  - Added `test:preflight` npm script
- Pushed 1 commit: `d6e1c6f`

### Session — 2026-04-03

**Completed:**
- WhatsApp phone input reworked — flag dropdown with country auto-detect from Google Places, user types local number only, E.164 formatted on submit
- Reordered Step 0: Name → Email → Location → WhatsApp → Instagram (location before phone so country is known)
- Added 40-country phone dropdown (LATAM + Europe + US) with flag emojis via Unicode regional indicators
- Instagram field: now accepts username only, auto-strips URLs/@ prefixes/query params, validates Instagram username format
- Specialty color system (`/spec` — plan: `docs/plans/2026-04-03-specialty-color-system.md`, VERIFIED)
  - 24 specialty color tokens in `globals.css` under `@theme` (12 hues × strong + weak)
  - `SPECIALTY_MAP` expanded from 5 → 12 entries, `SPECIALTY_COLORS` map, `CURATED_SPECIALTY_KEYS`
  - Chip extended with `specialty` prop (discriminated union — auto-resolves label + color, falls back to neutral)
  - `SpecialtySelector` extracted from registration form — 12 curated toggles + up to 2 custom "otra" fields with validation + duplicate detection
  - `SpecialtyMapper` for admin review — dropdown to map custom specialties to curated ones or approve as-is
  - Admin PATCH API accepts specialty edits independently of approve/reject
  - All 5 display surfaces updated (admin list, admin review, public profile, recommendations, BottomSheet)
- Testing infrastructure (`/spec` — plan: `docs/plans/2026-04-03-testing-infrastructure.md`, VERIFIED)
  - Vitest workspace: `unit` (jsdom, 1.2s) + `integration` (node) projects
  - 26 component tests across 8 files: Chip, Badge, Alert, GlassCard, Button, Modal, SpecialtySelector, SpecialtyMapper
  - Playwright multi-project: public (no auth), admin (storageState), visual (screenshots)
  - E2E tests: registration flow (8 tests), public profile (3 tests, graceful skip)
  - Visual regression: 4 page baselines (home, registration, admin login, confirmation)
  - npm scripts: `test:unit`, `test:e2e`, `test:visual`, `test:visual:update`, `test:all`
- Bug fixes from code review: SpecialtySelector state init from prop (custom inputs preserved on multi-step nav), SpecialtyMapper `__keep__` handler (signals to parent), sp-teal/sp-violet color collisions with success/info
- Consolidated tests from 57 → 26 (same coverage, half the noise)
- Pushed 5 commits: `40bd918`, `808efb8`, `b8c799a`, `eb38678`, `3057719`

**Deviations:**
- Originally planned only specialty color system for this session. Added testing infrastructure because it was needed before continuing with more features.
- Registration form at 807 lines — pre-existing from phone/instagram work. Specialty section extracted but form grew from other changes. Needs a larger refactor pass.

### Archived Sessions
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
| 5 | `/profesionales` | **New — Phase 1** | Public directory ranked by reputation |
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
| 2 | `/admin/leads/[id]` | **New — Phase 3** | Detalle de solicitud |
| 3 | `/admin/leads/[id]/match` | **Done** | Crear match — GlassCard, Spanish copy, AdminLayout |
| 4 | `/admin/professionals` | **Done** | Listado profesionales grouped by status |
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

### Pending Tasks (Backlog)

#### Known Bugs
- [x] Hardcoded `#FBF7F2` in 3 pages instead of using `var(--color-background)` or `bg-background` — **fixed in design system sweep (2026-04-07)**
- [ ] BottomSheet has no backdrop animation (no dimming overlay behind sheet)
- [ ] Backdrop-filter blur delay on card swipe (Chrome bug — documented in KNOWN_ISSUES.md)
- [ ] PQL adjustment modal sends `{ amount, reason }` but API expects `{ adjustment_type, reason, billing_month }` — pre-existing, documented in admin dashboard plan

#### Design System Extraction
- [x] Phase 1: Shared constants file (`lib/design-constants.ts`)
- [x] Phase 2: Chip component
- [ ] Phase 3: AvatarPlaceholder component
- [x] Phase 4: GlassCard component — **done this session**
- [ ] Phase 5: PrivacyNotice component
- [x] Phase 6: SectionHeader component — **done this session**
- [ ] Phase 7: FormField component
- [ ] Phase 8: Sweep + document — **partially done: all pages migrated to PageBackground, GlassCard, pill buttons, shared maps. Needs visual QA.**

#### UI / UX — High Priority
- [ ] WhatsApp button redesign (add icon, pulse animation)
- [ ] Backdrop-filter blur delay — decide on fix approach (Option B: remove scale recommended)

#### UI / UX — Medium Priority
- [ ] Progress indicator dot animations (transitions between cards)
- [ ] Chips staggered entrance animation
- [ ] Avatar/photo placeholders with initials fallback
- [ ] Micro-animations (haptic feedback on buttons)
- [ ] Staggered element reveals
- [ ] Card deck depth shadows between cards
- [ ] Spring physics for swipe (momentum, bounce)
- [ ] Smoother drag resistance curve
- [ ] More delightful entrance animation for reveal screen
- [ ] Shimmer effect on loading elements
- [ ] Text reveal animations
- [ ] Better hierarchy on card typography

#### UI / UX — Low Priority
- [ ] Dark mode (define tokens, toggle, respect system preference)
- [ ] Confetti on contact initiation
- [ ] Success animation after WhatsApp opens
- [ ] Document desktop-specific issues
- [ ] Moonly-style card redesign exploration (text over image, no card container)
- [ ] Design system component extraction (AnimatedIcon, enhanced GlassCard)
- [ ] Background may need adjustment (currently SVG illustration)
- [ ] Admin dashboard design polish
- [ ] Hover states for desktop

#### Feature Work
- [x] Email notifications (`lib/email.ts`) — `notifyNewLead()` and `notifyNewProfessional()` — **done**
- [x] Resend installed and wired — **done**
- [ ] Email: send copy to person who submitted (requires Resend domain verification)
- [ ] Google Places Autocomplete refinement (feels "funky")
- [ ] Reconciliation API endpoint (`/api/admin/reconciliation`) — for concierge flow
- [x] Supabase Auth replaces Clerk — **done**
- [x] Upstash Redis connected via Vercel Marketplace — **done**
- [ ] Set production environment variables (verify all are in Vercel)
- [ ] `NODE_ENV=production` configured
- [ ] Rate limiting verified in production
- [ ] CORS configured (if needed)
- [ ] Enable Cloudflare proxy / DDoS protection
- [ ] Advanced DDoS protection (Cloudflare WAF rules)

#### Monitoring / Analytics
- [ ] Add Sentry DSN + integration
- [ ] Vercel Analytics integration
- [ ] Uptime monitoring configured
- [ ] Log aggregation set up
- [ ] Monitor post-deploy error rates (first 48 hours)
- [ ] Set up alerts for error spikes
- [ ] Monitor Supabase query performance
- [ ] Review user feedback channels
- [ ] Check for unexpected traffic patterns

#### Performance Targets
- [ ] Lighthouse score > 90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] TTFB < 800ms
- [ ] API response times < 500ms
- [ ] Page load < 3s on 3G
- [ ] Time to interactive < 5s
- [ ] Build size < 100KB first load JS

#### Testing
- [x] Component tests (Vitest + React Testing Library) — 26 tests across 8 components
- [x] E2E tests (Playwright) — registration flow, public profile
- [x] Visual regression (Playwright screenshots) — 4 page baselines
- [ ] Add unit tests for custom hooks (useRecommendations, useSwipeGesture, etc.)
- [ ] E2E tests for admin review flow (requires admin auth storageState + seeded data)
- [x] Google Places bypass in E2E (page.route interception for Maps API) — done in registration-full-flow E2E
- [x] Registration full-flow E2E test (`__tests__/e2e/registration-full-flow.spec.ts`)
- [ ] Contract tests for validation rules
- [ ] Core Web Vitals measurement
- [ ] CI/CD integration for test suite (GitHub Actions)

#### CI/CD
- [ ] CI/CD workflow (GitHub Actions)
- [ ] Lockfile verification in CI (`npm ci`)

#### Accessibility
- [ ] Focus trap for modals/bottom sheets
- [ ] Skip navigation links
- [ ] Screen reader announcements for swipe actions
- [ ] High contrast mode support
- [ ] WCAG AAA compliance (full)

#### Content / SEO
- [ ] SEO meta tags verified in production
- [ ] Open Graph images set
- [ ] 404 page customized
- [ ] Spanish copy reviewed (full audit)

#### Operations
- [ ] Schedule recurring reconciliation job (calls `check_pql_event_integrity()`)
- [ ] Schedule recurring event purge job (calls `purge_old_events()`)
- [ ] Pre-merge checklist: ensure all 7 QA rules pass
- [ ] Drift prevention: update FINAL_SPEC.md before architecture changes
- [ ] Lazy load BottomSheet if it grows >200 lines

#### Documentation Cleanup
- [ ] README references `CODE_QUALITY_AUDIT_2026-01-06.md` (deleted) — fix reference
- [ ] README references week summary docs for DB setup (wrong path) — fix reference

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

### Email decisions
- Resend chosen for simplicity (one API call, good Next.js integration, free tier 3,000/month)
- Test mode only sends to the account owner email (`mariabmontoya@gmail.com`)
- To send to other recipients (e.g., centrovitalhara@gmail.com, or copy to the person who submitted): need to verify a domain in Resend dashboard
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
- `docs/plans/` — Spec-driven plans (specialty-color-system, testing-infrastructure, design-system-sweep, test-suite-hardening, registration-full-flow-e2e, admin-dashboard-improvements)

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
