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

## Next Steps

Following the core user flow, in priority order:

1. **`/solicitar` — Intake web form (new page)**
   - Top of funnel — currently no way for users to submit a request without admin manually creating a lead
   - Needs: form fields matching `leads` table, service role insert, confirmation redirect to `/gracias`

2. **`/gracias` — Post-solicitud confirmation (new page)**
   - Simple thank-you page after intake submission
   - Explain what happens next (we'll match you with 3 professionals)

3. **`/` — Home page redesign**
   - Currently exists but needs design system (liquid-glass, tokens, consistent patterns)
   - Should link to `/solicitar` and `/profesionales`

4. **`/profesionales` — Professional landing page (new page)**
   - Captures new professionals — links to `/profesionales/registro`
   - Value prop, how it works, CTA to register

5. **`/ayuda` — Help page (new page)**
   - Link recovery, common errors, support contact

6. **Design system extraction (remaining phases):**
   - Phase 3: AvatarPlaceholder component
   - Phase 4: GlassCard component
   - Phase 5: PrivacyNotice component
   - Phase 6: SectionHeader component
   - Phase 7: FormField component (would bring registro/page.tsx from 571 → ~380 lines)
   - Phase 8: Sweep + document

7. **Admin pages (new):**
   - `/admin/leads/[id]` — Lead detail
   - `/admin/matches` — Match list
   - `/admin/matches/[id]` — Match detail with timeline
   - `/admin/professionals/[id]` — Professional detail
   - `/admin/analytics` — Funnel dashboard
   - `/admin/events` — Event audit log
   - `/admin/settings` — Operational config

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
