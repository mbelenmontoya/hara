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

## Business Model Decision Log

### Apr 1, 2026 — Pivot from PQL-only to Directory + Concierge

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

### Ranking System Design

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

## Progress

### Session: Mar 11-12, 2026

**Documentation cleanup & consolidation:**
- Audited all 16 MD files in repo, verified done vs not done against git history and codebase
- Removed 8 obsolete files (session summaries, code quality report, week archives, AI handoffs)
- Created `docs/TODO.md` with all 71+ pending items
- Created `docs/DONE.md` with all completed work
- Fixed README.md stale references

**Claude Code tooling (8 milestones completed):**
- CLAUDE.md project guide with 8 working rules
- 4 path-scoped rules (typescript, api-routes, tailwind-tokens, component-standards)
- 7 skills (step-by-step, reuse-enforcer, commit-helper, doc-sync, design-system, supabase-patterns, accessibility)
- 5 slash commands (pr-prep, audit, bug-hunt, feature-start, test-create)
- 3 agents (complexity-watchdog, code-reviewer, documentation-architect)
- 3 hooks (file-size-warning, protected-files-guard, console-log-detector)

**Design system extraction (Phase 1-2):**
- Created `lib/design-constants.ts` — shared animation easing, timing, card layout, SPECIALTY_MAP, RANK_LABELS, isValidReason (removed duplicates from page.tsx and BottomSheet.tsx)
- Extracted Chip component (`app/components/ui/Chip.tsx`) with 5 variants (success, warning, info, brand, neutral)
- Integrated Chip into recommendations page, BottomSheet, and UI showcase

**Professional profile page (`/p/[slug]`) — full rebuild:**
- Fixed critical bug: was querying `specialty` (doesn't exist) instead of `specialties` (array) — caused 404
- Added 6 new DB columns via schema migration: instagram, short_description, experience_description, service_type, offers_courses_online, courses_presencial_location
- Updated FINAL_SPEC.md with new schema
- Rebuilt page with 5 glass cards (identity, expertise, about, logistics, contact)
- Uses design system tokens, liquid-glass, Chip component, SVG illustration background
- Added back button with `?from=` param — returns to recommendations or home
- Updated seed script with realistic data for all new fields

**Recommendations page fixes:**
- Fixed E2E seed script: uses `generateTrackingCode()` instead of hardcoded invalid `E2ETEST12345`
- Rewrote seed cleanup to find matches via professional slugs instead of hardcoded tracking code
- Added sessionStorage to `useRevealTransition` — skips reveal screen on revisit within same session
- Links to profile now pass `?from=/r/{trackingCode}` for navigation back

**Production deployment fixes:**
- Fixed liquid-glass backdrop-filter: production build was dropping non-prefixed property. Changed to `@apply backdrop-blur-[10px] backdrop-saturate-[160%]` so Tailwind generates correct output
- Resolved Upstash Redis 503 on Vercel: old database was deleted, needed new one via Vercel Marketplace integration (region matching)
- Verified full flow works on https://hara-weld.vercel.app

**Full page/workflow map added to TODO.md:**
- 27 routes total: 10 exist, 17 new
- Grouped by: Público (Lead), Público (Profesional), Admin/Ops, Legales, Futuro

### Session: Mar 12, 2026 (continued)

**Intake form (`/solicitar`) — new page:**
- Single scrollable form with 4 glass cards (intent tags, location/modality, urgency, WhatsApp) + expandable advanced section (style preference, budget, email)
- Google Places Autocomplete replaces country dropdown + city input — auto-detects country from selected city
- Live phone validation with `libphonenumber-js` — validates format against detected country, shows error inline as user types
- Auto-fills country calling code prefix when city is selected (e.g., `+54` for Argentina)
- Submits via `createLead` server action → redirects to `/gracias`

**Confirmation page (`/gracias`) — new page:**
- Post-submission page with timeline steps (analizamos, seleccionamos, enviamos link, vos elegís)
- Same design patterns: SVG background, liquid-glass card, privacy notice

**Email notifications (`lib/email.ts`):**
- Installed Resend (`npm install resend`)
- Created `lib/email.ts` with `notifyNewLead()` and `notifyNewProfessional()` functions
- Admin email notifications on new lead submission (with urgency indicator, intent tags, location, WhatsApp)
- Admin email notifications on new professional registration
- Fire-and-forget pattern — email failures never block the main operation
- Wired into `create-lead.ts` server action and `professionals/register/route.ts`
- Currently sends to `mariabmontoya@gmail.com` (Resend test mode limitation — needs domain verification for other recipients)

**Supabase Auth for admin (`/admin/login`):**
- Installed `@supabase/ssr`
- Created `lib/supabase/client.ts` (browser client), `lib/supabase/server.ts` (server client), `lib/supabase/middleware.ts` (session refresh helper)
- Replaced Clerk middleware with Supabase Auth — `/admin/*` routes now require login, public routes unaffected
- Login page at `/admin/login` with email + password, redirects to dashboard after auth
- If already logged in, `/admin/login` redirects to `/admin/leads`
- Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
- Admin user created in Supabase Auth dashboard

## Next Steps

### Phase 1: Foundation for Directory Model

1. **Populate real professionals**
   - Get real professional data from owner (via email/spreadsheet)
   - Add them to Supabase `professionals` table
   - Ensure all profile fields are complete for ranking

2. **DB: Add ranking/tier fields to `professionals` table**
   - `subscription_tier` — enum: `basico`, `destacado` (default: `basico`)
   - `rating_average` — decimal, default 3.0 (everyone starts at 3 stars)
   - `rating_count` — integer, default 0
   - `profile_completeness_score` — integer 0-100, computed
   - `ranking_score` — decimal, computed from tier + rating + completeness
   - Update FINAL_SPEC.md with new schema

3. **`/profesionales` — Public directory page (new)**
   - Lists all approved professionals, sorted by `ranking_score` desc
   - "Destacado" badge for paid tier professionals
   - Filter by specialty, location, modality (online/presencial)
   - Search by name
   - Links to `/p/[slug]` for full profile
   - CTA: "¿Sos profesional? Registrate" → `/profesionales/registro`

4. **`/` — Home page redesign**
   - Apply design system (liquid-glass, tokens)
   - Two clear CTAs: "Buscar profesional" → `/profesionales` and "Que te recomendemos" → `/solicitar`
   - Featured "Destacado" professionals section

### Phase 2: Reviews & Reputation

5. **Review collection system**
   - After contact event, generate unique review link (no login needed)
   - Review form: star rating (1-5) + optional text comment
   - DB: `reviews` table (professional_id, rating, comment, review_token, created_at)
   - Reviews update `rating_average` and `rating_count` on `professionals`
   - Display reviews on `/p/[slug]` profile page

6. **Profile completeness scoring**
   - Calculate score based on filled fields: photo, short_description, experience_description, specialties, location, instagram, etc.
   - Auto-update on profile changes
   - Show completeness indicator on admin/professional dashboard

### Phase 3: Monetization & Polish

7. **Subscription tier system**
   - Admin can set a professional's tier (manual for now)
   - "Destacado" visual treatment in directory and profile
   - Future: Stripe/MercadoPago integration for self-service

8. **`/ayuda` — Help page**
   - Link recovery, common errors, support contact

9. **Admin pages (new):**
   - `/admin/leads/[id]` — Lead detail
   - `/admin/professionals/[id]` — Professional detail with reviews, rating, tier
   - `/admin/analytics` — Funnel dashboard (directory views → profile views → contacts)
   - `/admin/settings` — Operational config

10. **Legal pages:**
    - `/privacidad`
    - `/terminos`

### Phase 4: Professional Portal (Future)

11. **`/pro/*` — Authenticated professional area**
    - Dashboard with their stats, reviews, leads
    - Profile editing
    - Subscription management

## Notes

### Working rules (from CLAUDE.md)
1. Never delete information without preserving it first
2. Do not assume — verify
3. Discuss before executing
4. Do not take shortcuts
5. One thing at a time, test after every change
6. Check the dev server before sending URLs
7. Read before writing
8. Track everything in TODO.md

### Known bugs still open
- Hardcoded `#FBF7F2` in 3 pages instead of using `var(--color-background)` or `bg-background`
- BottomSheet has no backdrop animation (dimming overlay)
- Backdrop-filter blur delay on card swipe (Chrome bug — documented in KNOWN_ISSUES.md)

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

### Google Places in intake form
- PlacesAutocomplete component already existed, reused it
- Returns city, country, countryCode from selected place — replaces manual country dropdown
- Arrow key selection in Places dropdown may have minor issues (noted by user, not investigated yet)

### Key files reference
- `docs/TODO.md` — Full task list with page map
- `docs/DONE.md` — All completed work
- `CLAUDE.md` — Project guide and working rules
- `FINAL_SPEC.md` — Database schema (source of truth, updated with 6 new columns)
- `.claude/README.md` — Tooling reference

### Seed data
- Run `npm run qa:seed-e2e` to seed 4 professionals + 1 lead + 1 match with 3 recommendations
- Current tracking code changes on each seed run (uses `generateTrackingCode()`)
- Check `.e2e-test-data.json` for the latest tracking code after seeding

### Deployment
- Auto-deploys on push to main via Vercel
- Upstash Redis connected via Vercel Marketplace integration
- All env vars set in Vercel
- Live at https://hara-weld.vercel.app
- **New env vars needed in Vercel for latest deploy:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`

### Packages added this session
- `@supabase/ssr` — Supabase server-side auth for Next.js
- `resend` — transactional email API
- `libphonenumber-js` — phone number validation by country
