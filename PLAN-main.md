# Plan: main

## Overview

Hará Match is a performance-based lead marketplace connecting people seeking wellness services (therapy, coaching) with qualified professionals in Latin America and Spain. The core flow: user gets a link → sees 3 ranked recommendations → contacts a professional via WhatsApp → billing happens automatically.

The app is built with Next.js 14.2 + TypeScript + Tailwind CSS v4 + Supabase + Upstash Redis. Backend is production-ready (billing, attribution tokens, RLS, rate limiting). Frontend needs design system application across all pages and new pages built per the full app map.

Deployed at: https://hara-weld.vercel.app

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

### Tomorrow: Test the full deployed flow
1. **Deploy and test on Vercel** — add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `RESEND_API_KEY` to Vercel env vars, redeploy, and test:
   - `/solicitar` → fill form → redirects to `/gracias` → email arrives
   - `/admin/login` → sign in → see leads dashboard with the new submission
   - `/r/{tracking_code}` → tap profile → `/p/{slug}` → back button works
   - Public pages load without login requirement

### Then, in priority order:

2. **`/` — Home page redesign**
   - Currently exists but needs design system (liquid-glass, tokens, consistent patterns)
   - Should link to `/solicitar` and `/profesionales`

3. **`/profesionales` — Professional landing page (new page)**
   - Captures new professionals — links to `/profesionales/registro`
   - Value prop, how it works, CTA to register

4. **`/ayuda` — Help page (new page)**
   - Link recovery, common errors, support contact

5. **Admin pages (new):**
   - `/admin/leads/[id]` — Lead detail
   - `/admin/matches` — Match list
   - `/admin/matches/[id]` — Match detail with timeline
   - `/admin/professionals/[id]` — Professional detail
   - `/admin/analytics` — Funnel dashboard
   - `/admin/events` — Event audit log
   - `/admin/settings` — Operational config

6. **Design system extraction (remaining phases):**
   - Phase 3: AvatarPlaceholder component
   - Phase 4: GlassCard component
   - Phase 5: PrivacyNotice component
   - Phase 6: SectionHeader component
   - Phase 7: FormField component (would bring registro/page.tsx from 571 → ~380 lines)
   - Phase 8: Sweep + document

7. **Email: send copy to person who submitted**
   - Add checkbox to `/solicitar` form: "Recibir una copia por email"
   - Requires domain verification in Resend to send to arbitrary addresses

8. **Legal pages:**
   - `/privacidad`
   - `/terminos`

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

### Bugs fixed this session
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
