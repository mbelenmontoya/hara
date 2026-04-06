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
- [ ] Admin list and review pages visually match the design system (liquid-glass, tokens, spacing)
- [ ] Public directory page (`/profesionales`) with reputation-based ranking
- [ ] Home page redesign with dual CTA (directory + concierge)

## Constraints

- Design system is fixed — use it as-is, never modify or extend the visual language. If a context doesn't fit, change the context (e.g., use a different background), not the system.
- All user-facing copy in Spanish (Argentine informal: vos, querés, escribís)
- No broad DB schema changes — targeted additions only
- Rejected profile handling is pinned for a future conversation (keep data? allow resubmit?)

## Next Steps

1. **Fix admin pages visual consistency**
   - What: Ensure the professionals list and review page match the design system exactly — correct background, proper spacing between cards, correct component usage.
   - Why: Admin pages have spacing issues (Link elements need `block` for `space-y`) and background choice needs refinement.
   - Considerations: Admin list now shows specialty chips (done in color system), but overall visual polish still needed.

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

6. **`/` — Home page redesign**
   - What: Apply design system, dual CTA (directory + concierge), featured professionals section

7. **Admin pages (remaining):**
   - `/admin/leads/[id]` — Lead detail
   - `/admin/professionals/[id]` — Professional detail (separate from review — reviews, rating, tier)
   - `/admin/analytics` — Funnel dashboard
   - `/admin/settings` — Operational config

8. **Legal pages:**
   - `/privacidad`
   - `/terminos`

## Session Log

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

### Session — 2026-04-02

**Completed:**
- Professional approval flow — full pipeline from registration to admin review
  - `lib/profile-score.ts` — 10-criterion scoring model (image=15, short_desc=10, bio=15, experience=10, specialties=15, service_type=10, location=10, instagram=5, whatsapp=5, modality=5)
  - `app/api/admin/professionals/[id]/route.ts` — GET (fetch by UUID) + PATCH (approve → `active`, reject → `rejected` + reason)
  - `app/admin/professionals/[id]/review/page.tsx` — score ring, per-criterion breakdown, profile cards, approve/reject with modal for rejection reason
  - `lib/email.ts` — `notifyNewProfessional()` now takes `id`, includes "Revisar perfil" button linking to `/admin/login?redirect=/admin/professionals/{id}/review`
  - `app/api/professionals/register/route.ts` — passes `data.id` to email
- Registration form expanded with 4 missing text fields
  - `short_description` (Step 3 — one-liner tagline)
  - `experience_description` (Step 3 — about experience)
  - `instagram` (Step 0 — contact info)
  - `service_type` (Step 1 — individual/grupal toggle)
- Profile image upload (3 milestones)
  - `lib/storage.ts` — Supabase Storage helper, uploads to `profile-images` bucket
  - API switched from JSON to FormData to support file upload
  - Image picker UI in Step 3 with circular preview matching `/p/[slug]` avatar style
- Phone auto-formatting with `AsYouType` from `libphonenumber-js` — formats visually as user types, sends E.164 on submit
- Live validation — email and WhatsApp validated inline, blocks step progression if invalid
- DB changes — added `rejected` to status CHECK constraint, added `rejection_reason TEXT` column
- Extracted 3 reusable UI components: `GlassCard`, `PageBackground`, `SectionHeader`
- Admin professionals list rebuilt — grouped by status (pendientes/revisados), Badge components, chevron navigation
- Admin login page updated to use `GlassCard` and `PageBackground` components
- Removed protected files guard (hook file deleted, settings cleaned, CLAUDE.md and api-routes.md sections removed) — was from another repo, not tailored to Hará
- Set all 45 existing professionals to `submitted` status for testing (`scripts/migrate-review-flow.mjs`)

**Blockers:**
- Admin pages visual polish incomplete — spacing issues discovered (Link elements need `block` for `space-y`), background choice needs refinement, list card content needs discussion
- Specialty color system not built — blocked on design decision (need dedicated colors, not semantic Chip variants)
- 45 existing professionals have no images — old WordPress site and DNS are down, images unrecoverable. New registrations will have upload capability.
- Rejected profile handling punted to future conversation

**Deviations:**
- Originally planned to score only 5 fields (what the form collected). QA pushed back — expanded the form instead so the full 10-criterion model is honest.
- Originally planned `approved` as intermediate state before `active`. QA + product decided approval → `active` directly (no dead-end limbo state).
- Spent significant time on design system compliance — multiple rounds of feedback on glass cards, backgrounds, and component reuse patterns.

### Archived Sessions
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
| 1 | `/` | Exists — redesign | Home page, needs design system + dual CTA |
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
| 1 | `/admin/leads` | Exists — modify | Bandeja de solicitudes |
| 2 | `/admin/leads/[id]` | **New — Phase 3** | Detalle de solicitud |
| 3 | `/admin/leads/[id]/match` | Exists | Crear match (concierge flow) |
| 4 | `/admin/professionals` | **Done** | Listado profesionales grouped by status |
| 5 | `/admin/professionals/[id]/review` | **Done** | Admin review page with score + approve/reject |
| 6 | `/admin/professionals/[id]` | **New — Phase 3** | Professional detail (reviews, rating, tier) |
| 7 | `/admin/analytics` | **New — Phase 3** | Dashboard: funnel + directory metrics |
| 8 | `/admin/settings` | **New — Phase 3** | Configuración operativa |
| 9 | `/admin/pqls` | Exists | Ledger PQL (kept for concierge billing) |
| 10 | `/admin/matches` | Deprioritized (pivot) | Listado de matches / tokens — may revisit for concierge |
| 11 | `/admin/matches/[id]` | Deprioritized (pivot) | Detalle de match: link, estado, vencimiento, timeline |
| 12 | `/admin/events` | Deprioritized (pivot) | Eventos crudos / auditoría (contact_click, etc.) |

#### Legales / Confianza

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/privacidad` | **New — Phase 3** | |
| 2 | `/terminos` | **New — Phase 3** | |

#### Futuro (Phase 4)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/pro` | **New** | Home profesional autenticado |
| 2 | `/pro/leads` | **New** | Visibilidad de leads para el profesional |
| 3 | `/pro/analytics` | **New** | Performance por profesional |

### Pending Tasks (Backlog)

#### Known Bugs
- [ ] Hardcoded `#FBF7F2` in 3 pages instead of using `var(--color-background)` or `bg-background`
- [ ] BottomSheet has no backdrop animation (no dimming overlay behind sheet)
- [ ] Backdrop-filter blur delay on card swipe (Chrome bug — documented in KNOWN_ISSUES.md)

#### Design System Extraction
- [x] Phase 1: Shared constants file (`lib/design-constants.ts`)
- [x] Phase 2: Chip component
- [ ] Phase 3: AvatarPlaceholder component
- [x] Phase 4: GlassCard component — **done this session**
- [ ] Phase 5: PrivacyNotice component
- [x] Phase 6: SectionHeader component — **done this session**
- [ ] Phase 7: FormField component
- [ ] Phase 8: Sweep + document

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
- [ ] Google Places bypass in E2E (page.route interception for Maps API)
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
- `lib/design-constants.ts` — SPECIALTY_MAP (12), SPECIALTY_COLORS (12), CURATED_SPECIALTY_KEYS, animation constants
- `app/components/ui/Chip.tsx` — Chip with `specialty` prop (discriminated union) + 5 semantic variants
- `app/components/ui/GlassCard.tsx` — Reusable glass card component
- `app/components/ui/PageBackground.tsx` — Reusable page background component
- `app/components/ui/SectionHeader.tsx` — Reusable section header label
- `app/profesionales/registro/components/SpecialtySelector.tsx` — Specialty toggles + custom fields
- `app/admin/professionals/[id]/review/components/SpecialtyMapper.tsx` — Admin specialty mapping dropdown
- `vitest.workspace.ts` — Vitest workspace (unit + integration projects)
- `playwright.config.ts` — Playwright multi-project (public, admin, visual)
- `docs/plans/` — Spec-driven plans (specialty-color-system, testing-infrastructure)

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
