# Plan: hara

## Overview

Current status checked 2026-11-06: registration/accounts, professional login, profile editor/statuses, password setup/recovery and the final public menu were approved, committed and pushed to main as `f9e229717963f5b1d779867e4ece535da44d1a62`. Local HEAD and origin/main matched after push. Admin redesign and roles were already delivered as `ef13ca2` and `e73d5fa`. Both November registration/portal specs are VERIFIED. The deployment of f9e2297 has not been checked and is still an open item.

Practice check before the Arteterapia correction (2026-11-07): 45 active professionals; 41 had empty stored practices/review flags, while the existing resolver already recognized practices for all 45 and specialties for 44. Those flags did not establish 41 pending human classifications. The sole approved residual gap, Arteterapia → Autoconocimiento, is now fixed and verified on both affected public profiles; other practices and every professional record stayed unchanged. The previous account query found no linked accounts. Existing-professional invitations have not been sent. The real browser fixtures were deleted; their Auth/profile absence was checked. General critical-flow testing is deferred by the user.
Hara Vital is a marketplace for holistic therapies (Argentina and Spanish-speaking markets), built with Next.js 14, Tailwind v4 and Supabase. We are applying the Claude Design "quiet almanac" redesign one page at a time and stopping after each page for review in the browser.

Pages done and approved: the professional profile `/p/[slug]`, the home `/` (which is now the directory), and Ayuda `/que-es-hara`. Sign-up moved to `/registro`. The old `/profesionales` page was removed on purpose, but its components are still in `app/profesionales/components` and `app/profesionales/hooks` because the home imports from them.

The earlier home work finished the sticky filter bar, panels and professional cards from design round 11. The latest completed work is the registration/account and professional portal release recorded above.

A separate workstream (Instagram network): the `ig-network` skill in `.claude/skills/ig-network/`. It reads active professionals from Supabase (read-only), opens each one's Instagram in Chrome with the Hara account, and records whether the handle exists, whether Hara follows them and whether they follow Hara. It is separate from `ig-engage` (hashtag comments and DMs to strangers). Later phases, agreed but not built: automatic follows with a daily cap, and finding posts to share in stories with approval.

Rules from the user for this work:
- The design's layout and behavior are copied exactly. Its copy and placeholder data are never used: only real app data, in Argentine Spanish (vos). Anything the app does not have is left blank.
- Do not restyle things that were not asked for. One page at a time. No questions in planning.
- No em dashes or en dashes anywhere. No extra .md files except the spec plan and ISSUES.md entries.
- Never kill processes by port or kill browsers. The dev server on port 3000 is stopped only by the PID in `/tmp/hara-dev.pid`.
- UI checks must use a visible Chrome window (2026-11-06 user correction). Prefer the foreground connector; if occupied, use isolated headed Chrome. A headless-only run does not close visual verification.

## Success Criteria
- [x] Home `/` has the sticky filter bar (search, Prácticas, Modalidad, Ciudad, count, Limpiar filtros, Lista/Mapa) working with real data
- [x] Home cards (featured and list) follow the design, with real data only
- [x] Unit project and TypeScript passed; the pre-push hook passed again for f9e2297 (108 files, 794 tests). This does not establish email delivery or complete concierge processing
- [x] `/profesionales` leftovers removed without breaking the home (2026-10-25)
- [x] Diario (blog) matches the design (done 2026-10-05, plan `docs/plans/2026-10-05-almanac-diario-page.md`, approved, included in the earlier redesign push)
- [x] Concierge screens (`/solicitar`, `/r/{tracking_code}`, design 9a to 9d) match the design (all four done 2026-10-16; the visual check against the design is done too)
- [x] Home cards filter the list, the count and the map (the user chose this over the design's reorder, 2026-10-19); the featured card is a random pick per visit among Índice Hara 50 or more, and there is no featured card when none of them is shown
- [ ] Upstash rate limiter checked together with the user once the redesign is done (ISSUES.md entry 16)
- [x] Concierge form and confirmation (9a, 9b) done and verified 2026-10-16 (migration 023 run, test lead sent; plan `docs/plans/2026-10-05-almanac-concierge-screens.md`)
- [x] Carta (9c, `/r/[tracking_code]`) and review link (9d) built and checked in Chrome 2026-10-16 (plan `docs/plans/2026-10-16-almanac-carta-resena.md`, migration 024 run)
- [x] Bottom nav bar on home, Diario and Ayuda, originally done 2026-10-19 and now Inicio, Diario, Ayuda, Ingresar (Buscar removed from the bar at the user's request; home search remains) (plan `docs/plans/2026-10-19-almanac-bottom-nav.md`). The masthead search circle was removed at the user's request.
- [ ] Ponytail review findings decided (1 should-fix, 4 nice-to-haves, 2026-10-20)
- [x] Shared bottom menu has one "Ingresar" link to professional access; no Soy pro, Entrar or admin entry (final user clarification, 2026-11-06; ISSUES.md entry 17 done)
- [x] `ig-network` audit of all professionals' Instagram handles done (38 handles: 22 valid, 5 possible new accounts, 11 invalid)
- [ ] Invalid handles resolved with the professionals and the 5 candidate accounts confirmed
- [ ] Follow phase built and run (daily cap, starting with professionals who already follow Hara)
- [ ] Content discovery for stories built (approval required for every share)
- [x] Redesign committed and pushed to `main` (cc2e2d7, 2026-10-28, with the 5 earlier redesign commits)
- [x] Admin redesign (design 13) done page by page and verified (plan `docs/plans/2026-10-29-admin-almanac-redesign.md`, committed and pushed as `ef13ca2`)
- [x] Only the admin can open `/admin` and `/api/admin`: role-based (`app_metadata.role`, plan `docs/plans/2026-11-06-admin-role-permissions.md`, committed and pushed as `e73d5fa`; admin SQL and migration 026 were run by the user)
- [x] "Soy profesional" form (`/registro`) matches design 12, creates an account and supports review status (2026-11-06; committed and pushed in f9e2297)

- [x] Professional profile editor, review/rejection notices and invitation/recovery password pages migrated to almanac, approved and delivered in f9e2297.
- [x] Six real Auth/DB portal scenarios passed in visible Chrome, including persistence and recovery; temporary records deleted and absence verified.
- [x] Registration and portal commit pushed to main: f9e2297; pre-push checks passed, working tree was clean immediately afterward.
- [ ] Verify the automatic deployment of f9e2297 and the public production pages. A successful push alone is not deployment evidence.
- [x] Recheck the claimed 41-profile classification backlog: the existing resolver already recognizes practices for all 45 profiles. The earlier count was a storage/review-flag count, not an actual-resolution count (2026-11-07 correction).
- [x] Complete only Arteterapia → Autoconocimiento (2026-11-07); verified on both affected public profiles in visible Chrome. Other practices and every professional record stayed unchanged.
- [ ] Enable/invite the 45 existing professionals who still lack linked accounts; sending invitations needs a concrete agreed batch.

## Constraints
- The home imports the filter helpers/types (`FilterState`, `DirectoryProfessional`), `DirectoryMap` and `useCityGeocode` from `app/profesionales`; DirectoryFilters.tsx and ProfessionalsDirectory.tsx now contain types/helpers, not directory UI components. Those cannot be deleted.
- Never show raw `professionals.specialties` free text; specialties come from the practices catalog through `resolveProfileSpecialties`.
- Use design tokens only (no new hex colors). Fonts Instrument Serif and Jost are opt-in through `.font-almanac`, `.font-almanac-serif` and `.almanac-label`.
- Git write commands need explicit permission. The user approved commit and push of the registration and professional portal work on 2026-11-06; Instagram changes remain excluded.
- `.env.local` holds the real Supabase keys and is git-ignored; never print its values.
- `ig-network`: Supabase is read-only (one SELECT). Never edit the DB from the skill; wrong handles go to the report and the user decides. No automatic scheduling: it runs only when the user launches it, and by default audits only professionals not yet in the log (or whose instagram changed in the DB). `--all` audits everyone.
- `ig-network`: follows will be automatic but capped per day, never unfollow. Sharing content always needs the user's approval; if native share is not available, mark `manual_required` and never download or repost.
- The user does not want the `ig-network` work committed or pushed.
- Leads are written only through `createLead` (`app/actions/create-lead.ts`). Test leads sent during browser checks are deleted by the user or through the admin, never by a script.
- Supabase migrations are run by the user in the SQL editor, not from a session.
- Pushing to `main` deploys. The user's account must have `app_metadata.role = 'admin'` and migration 026 must be run before the role-based access is pushed, or the live admin and `/pro` lock people out.
- Admin and API actions are tested on a production build (`npm run build` + `npm start`), not only `npm run dev`: a production-only branch once hid a 503 on every admin write.
- PQLs stay in the admin. The "remove pqls" request on 2026-10-28 only meant leaving them out of the Claude Design brief.

## Next Steps
1. **Arteterapia: CLOSED for the approved scope (2026-11-07)**
   - User explicitly limited the work to this case. Updated only practices[arteterapia].specialties from [] to [autoconocimiento]. The two public profiles were checked in visible Chrome at 1280/402 px on localhost and haravital.app; María Laura now shows Autoconocimiento and Victoria retains her other specialties.
   - Compared the complete catalog snapshot and professionals fingerprint: exactly one catalog row/field changed and all professional records stayed identical. Plan: docs/plans/2026-11-07-arteterapia-specialty.md (VERIFIED).
   - No 41-profile reclassification, other catalog edits, code changes or migrations. Existing-professional invitations and photo replacement remain separate, outside this completed data correction.

2. **Verify the deployed release**
   - Commit/push are DONE: f9e2297 contains the approved registration, account, portal and menu changes. Both specs are VERIFIED. The remaining check is the actual automatic deployment and public production routes, using visible Chrome.
   - Already verified locally: production build, TypeScript, unit project, real registration/sign-in/pending notice and the six headed Chrome portal scenarios, including active-profile save/public persistence. Admin notification receipt was confirmed earlier; professional inbox delivery remains unverified.

3. **Pushed admin redesign follow-ups**
   - What: decide on removing the now-unused `onOverride` path in `ScoreBreakdown` (also used read-only by `/pro/perfil`) and the unused `PracticeReclassificationBanner`.

4. **Registration follow-up**
   - Done: design 12, account creation at submit, review/rejection notices, edit guard, login instructions in emails and the home entry points. New accounts work immediately with the chosen password.
   - Deferred by the approved spec: rejected applicants who already have an account cannot resubmit with that email (ISSUES.md entry 19).

5. **Decide which ponytail review findings to fix**
   - What: the review of the bottom bar and home card work (2026-10-20) found no must-fix items. Should fix: (1) a test that the map only shows the professionals of the selected card. Nice to have: (2) drop `pendingScroll` and the `animate` flag in `app/HomeSearch.tsx`, (3) move `Magnifier` back into `app/HomeFilterBar.tsx`, (4) make "Limpiar filtros" also clear the selected card (product choice), (5) drop the unused `export` on `AlmanacTab`.
   - Considerations: no code changed yet; wait for the user to pick by number. Not checked: the bar's fixed 30px bottom padding on a real iPhone with a home indicator.

6. **Check the Upstash rate limiter together with the user**
   - Open, previously parked until the redesign was done. The redesign is now closed; review it after the requested practice-classification work. See ISSUES.md entry 16: inspect the console first, compare Vercel variables, then decide whether a new database is necessary. Do not mark rate limiting fixed from the UI tests.

7. **Work through the open items in ISSUES.md**
   - What: slow database calls with no caching, 41 of 45 active professionals still need practice review (real DB query 2026-11-06), home cards barely differ because most practices map to `estres-ansiedad`, mixed tú and vos wording, the broken destello SVG, lint configuration, odd `.env.local` lines, no Destacado professional in the data, unused leftovers (`RevealOnScroll`, `WelcomeModal`, stale visual baseline), and the Ayuda page's missing WhatsApp number, hours and Argentine emergency line (needs input from the user). Build/install problems were previously resolved; old issue text is not evidence they remain broken.

   - Explicitly deferred by the user: the critical-flow verification/fix plan (ISSUES 20 to 22). This includes real mail/concierge delivery evidence, server rejection of blank/unusable fields, and the sendBeacon=false fallback. Keep them open, not bundled into the completed redesign. Rejected-account reapplication remains a separate product follow-up (entry 19).
   - Older visual/data reports need revalidation before implementation. Example: entry 4 still describes a fixed nine-profile list, but HomeArrival now has a load-more control in source; no fresh browser verification was performed for that old report during this plan update.

8. **Resolve the invalid Instagram handles**
   - What: decide with the user what to do with the 11 invalid handles and confirm or reject the 5 candidate accounts (Guadalupe Rodriguez, Leonela Velona, Lucina Micheloud, Sofía Belluscio, Victoria Garino).
   - Why: the user said "luego vemos qué hacer con los inválidos".
   - Considerations: the full list with evidence is in `scripts/logs/network-audit-2026-10-02.md`. Fixes go into Supabase by the user (or through the admin), never from the skill.

9. **Build the ig-network follow phase**
   - What: follow valid professionals Hara does not follow yet, with a daily cap (was 5, its config file was removed, define it again), logging `last_followed_at`, never unfollowing.
   - Considerations: start with the 9 that already follow Hara ("Follow Back"). The current log has no `follows_hara` values yet; they get filled by the next `plan --all` run.

10. **Build the ig-network content discovery phase**
   - What: read recent posts of valid professionals, classify them (educativo, práctica, sesión, evento, reflexión), and propose `share_to_story`, `comment` or `skip` with the exact post and why it is useful. Every share needs the user's approval.
   - Considerations: test in Chrome what "Add to story" really allows for the Hara account before writing that step.

## Session Log

### Session 2026-11-06 (registration account, Codex continuation)
- Reviewed the inherited uncommitted Tasks 1 and 2, completed Tasks 3 to 5 and the documentation/verification portion of Task 6 in `docs/plans/2026-11-06-registro-almanac-account.md`.
- Review fixes: distinguish email conflicts from weak-password errors, roll back accounts on thrown insert errors, report rollback failures without passwords, restore accessible fields/photo selection and move focus when steps change. Photo preview cleanup works when returning to step 4 in StrictMode.
- Verified: TypeScript, 786 unit tests in 108 files, production build, five public Chrome tests, all four steps at desktop/402px with live Google suggestions. Real Supabase test created the account/profile/image, signed in, saw the review notice, received API 403 on edits, then removed all test records and checked account/profile absence.
- Email delivery limit: example.com was rejected by Resend; copy and both approval paths are unit-tested. Actual admin password sign-in was not repeated because E2E credentials are absent; middleware tests cover the redirect.
- Docs updated in CLAUDE.md, README.md, FINAL_SPEC.md and ISSUES.md (17 done, 19 added). Upstash remains parked under entry 16 and the configured registration limit still fails open while it is unavailable.
- Browser MCP was occupied by another session. Used an isolated Playwright Chrome; screenshots in `/tmp/hara-registro-proof`, test config `/tmp/hara-registro-playwright.config.mjs`. Stopped only the dev server from `/tmp/hara-dev.pid`; production server remains on localhost:3000.
- Pending: user approval for commit and push, required by Task 6. No git writes or deployment performed.

### Session — 2026-11-06 (started 2026-10-28)
**Completed:**
- Wrote the admin and "Soy profesional" descriptions for Claude Design (PQLs and the laptop line left out of the brief, at the user's request).
- Committed and pushed to `main`: `cc2e2d7` (almanac bottom nav, home search, removal of the unused directory code) together with the 5 earlier redesign commits. Checks before: `tsc`, 687 unit tests, production build, pre-push hook.
- Read design 13 (admin) and 12 (Soy profesional) through the `claude_design` MCP after `/design-login`; copy and logic saved in the session scratchpad.
- Planned the admin redesign with /spec: `docs/plans/2026-10-29-admin-almanac-redesign.md` (11 tasks, approved). User decisions: page by page; unread numbers (not totals) for Leads, Profesionales, Blog and Reseñas, read when opened, stored in the database, existing rows start as read; practice form stays on its own pages; PQLs stay and get restyled; fix admin access first.
- Found and logged ISSUES.md entry 18: any signed-in professional could open `/admin` and `/api/admin`.
- Task 1 done: `isAdminEmail` in `lib/admin-auth.ts`, admin check in `middleware.ts` (403 on the API, redirect to `/admin/login?error=no-access` on pages, no redirect loop on the login), no-access message on the login, `ADMIN_EMAILS` in `.env.example`. Tests in `middleware.test.ts` and `lib/admin-auth.test.ts`, mutation-checked.
- Task 2 done: `migrations/025_admin_read_at.sql` (not run yet), `lib/admin-unread.ts`, `app/api/admin/unread/route.ts` with tests, mutation-checked.
- Task 3 built, not yet reviewed: new `app/components/AdminLayout.tsx` (sidebar, phone pills, unread badges, email, Salir, `markRead` prop), `app/admin/components/AdminToast.tsx`, almanac login. Login checked in Chrome. Full unit suite: 714 tests passing, `tsc` clean.

**Modified:**
- PQLs were first planned as hidden from the menu; the user said they never meant to remove them, so they stay and get restyled.
- The menu numbers were first planned as pending totals; the user clarified they mean unread items.

**Deviations:**
- Fixing admin access (ISSUES.md entry 18) was added as Task 1 at the user's request.
- `app/admin/leads/[id]/page.test.tsx` got mocks for `useRouter` and the Supabase client, because the layout now uses them.

**Blockers:**
- Resolved: I overwrote the existing `lib/admin-auth.ts` (it held `getAdminUserId`) without reading it first; restored it from git right away, so the file only gains `isAdminEmail`.
- Open: `ADMIN_EMAILS` is not set in `.env.local`, so nobody can enter the local admin until the user adds it. Migration 025 not run yet.
- Open: `spec-review` agent is not available in this setup, so the admin plan was only self-reviewed.

### Session — 2026-10-25
**Completed:**
- Confirmed every design screen is built and every redesign plan is done (Buscar 9f was cancelled on purpose).
- Deleted the unused old directory code: `ProfessionalCard`, `WelcomeHint`, `LocationFilter` (and their tests), the `ProfessionalsDirectory` and `DirectoryFilters` components, `ContactFooterForm`, `app/api/contact` and `notifyContactForm`. Kept the types, helpers, `DirectoryMap` and `useCityGeocode` the home uses. `tsc` and the unit suite (98 files, 687 tests) pass.
- Updated ISSUES.md entries 11 and 13 and the project structure in CLAUDE.md.
- Open: 14 integration tests fail (mostly the missing Upstash host, ISSUES.md entry 16).


### Session — 2026-10-20 (started 2026-10-19)
**Completed:**
- Found the hara preview session id (`9d3d9da2-baff-4569-ad2b-d6706267e489`); the other id belonged to automations-admin.
- Parked the Upstash check (ISSUES.md entry 16) until the redesign is done.
- Home cards now filter the list, the count and the map (`app/HomeArrival.tsx`); `orderByElement` removed from `lib/home-filters.ts`.
- Destacado is a random pick per visit among Índice Hara 50 or more (`featuredPicks` and `FEATURED_MIN_SCORE` in `lib/home-arrival.ts`, shuffled on the server and passed as a prop); no featured card when none qualifies.
- Bottom bar through /spec (`docs/plans/2026-10-19-almanac-bottom-nav.md`, VERIFIED): new `app/components/AlmanacBottomNav.tsx`, `app/HomeSearch.tsx` (shared search state, `/#buscar` arrival), `lib/home-search.ts`; bar added to `/`, `/blog` and `/que-es-hara`.
- After the user's review: removed the masthead search circle (logo centered) and narrowed Ayuda to `md:max-w-xl` to match the other pages.
- Added ISSUES.md entry 17 (no public link to `/registro` or `/pro/login`). Docs listing shared components updated (`CLAUDE.md`, component-standards rules, code-reuse-enforcer skills, `feature-start.md`).
- Checks: 718 unit tests passing, `tsc` clean, build passing, browser scenarios TS-001 to TS-004 passing.
- Ran the ponytail review on the uncommitted changes. Verdict: ship; 1 should-fix (map test) and 4 nice-to-haves. Nothing changed yet.

**Modified:**
- Home cards filter instead of reordering (overrides the design and the 2026-10-05 decision), at the user's request.
- The masthead search circle was in the first version of the plan; the user said it "was not part of the plan" and it was removed.

**Deviations:**
- Stopped my own dev server by task id to run the build, then restarted it on port 3000 with a clean `.next`. It is still running (task b6eoy2cyc).

**Blockers:**
- Resolved: `scrollIntoView` missing in jsdom (stub in the test setup); hash state leaking between tests; an import cycle between `HomeSearch` and `AlmanacBottomNav`; arriving from `/#buscar` landed 60px too low because input focus scrolled after mine.
- Open: `npm run lint` still has no ESLint config.

### Session — 2026-10-06
**Completed:**
- Resumed the concierge spec plan `docs/plans/2026-10-05-almanac-concierge-screens.md` at Task 3 (Tasks 1 and 2 were done before).
- Task 3: rebuilt `app/solicitar/SolicitarForm.tsx` as the 4-step frame (×, "Concierge · Gratis", progress, Atrás and Continuar bar) and created `app/solicitar/ConciergeSteps.tsx` with steps 1 and 2. `app/solicitar/page.tsx` now loads the home's cards through `getActiveProfessionals` and `buildHomeData`, with the other curated specialties as chips.
- Task 4: steps 3 and 4, the "Tu solicitud" summary with Editar, the consent checkbox, and sending through `createLead(toLeadInput(state))` with the error kept on screen.
- Task 5: created `app/solicitar/ConciergeConfirmation.tsx` (request number, "Listo, {name}.", "Lo que sigue", latest Diario post) with its test. Added `ConciergeLatestPost` to `lib/concierge-request.ts` and the latest-post query to the page.
- Task 6 (code): `/solicitar` added to the header's hidden list, `additional_context` added to the admin lead route, the `Lead` type and a "Lo que contó" card. Deleted `app/gracias/page.tsx` and `content/gracias.json`, rewrote `content/solicitar.json` with the new copy, added ISSUES.md entry 14.
- Every task was mutation-checked. Full unit suite passed (97 files, 690 tests) and `tsc` was clean.
- Chrome on port 3001: TS-001 (all four steps, Zona gate, Editar) and TS-003 (home unchanged, "Contanos →" opens the form, `/gracias` is 404) passed.

**Modified:**
- The header tests used `/solicitar` as their example of a page with the header. They now use `/registro`, since `/solicitar` hides it.

**Deviations:**
- `content/solicitar.json` and `content/gracias.json` (copy inventory files nothing imports) were already out of date. One was rewritten and the other deleted along with the page.
- Started a second dev server on port 3001, because the one on 3000 returns 500 everywhere.

**Blockers:**
- Open: migration 023 has not been run, so TS-002 (sending a lead) could not be checked and Task 6 stays unchecked.
- Open: `next lint` opens its setup prompt instead of linting (ISSUES.md entry 7), so lint was not run.

### Session — 2026-10-05 (ig-network, started 2026-09-30)
**Completed:**
- Read `.claude/skills/ig-engage/SKILL.md` and listed what it does. Found that its config and log files are git-ignored and missing locally, its cron prompt points to an old path, and it uses chrome-devtools tools that are no longer configured.
- Created the `ig-network` skill with `/create-skill`: `.claude/skills/ig-network/SKILL.md` and `.claude/skills/ig-network/scripts/network.py` (`plan`, `record`, `report`).
- Ran the audit on all 38 active professionals with Instagram. Result: 22 valid, 5 `renamed_or_uncertain` with candidate accounts, 11 invalid. Of the valid ones, Hara follows 7; 9 of the rest already follow Hara.
- Fixes after the run, one at a time: (1) name search through Instagram's own search for handles that show "not available", with a second query "name + terapias"; (2) wait for the page with a `MutationObserver` instead of `setTimeout`; (3) read the follow button by selector; (4) removed `title` and `body` from the read snippet and fixed the private-profile text; (5) log records whether the professional follows Hara.
- `plan` now reads professionals from Supabase (read-only, `.env.local`), audits only new ones or ones whose instagram changed, and `--all` audits everyone. Removed the 14-day automatic recheck and `scripts/instagram-network.config.json`.
- `.gitignore` now lists `scripts/instagram-network.professionals.json`, `scripts/instagram-network.log.json` and `scripts/logs/network-audit-*.md`.

**Modified:**
- The professionals list first came as a snapshot pasted from ChatGPT (which has the Supabase connector). Later the repo got `.env.local` and the skill switched to reading Supabase directly.
- Planned fixes 6 to 8 (linked personal accounts, match confidence, stdin for `record`, batching notes) were dropped: the user pointed out the audit is a one-time job and more polishing was not worth it.

**Deviations:**
- Chrome throttles timers in hidden tabs, so any `setTimeout` wait inside the page can hang past the 45 second tool limit. The skill uses `MutationObserver` for this reason.
- I wrote "This account is private" from memory without checking; Instagram actually says "This profile is private". Fixed and verified. The `is_private` values in the current log are unreliable until the next `--all` run.

**Blockers:**
- At session end the repo folder became unreadable ("Operation not permitted"), so this entry is here instead of the repo plan.

### Archived Sessions
- **2026-10-05**: Built the home search and filters from design round 11 (`docs/plans/2026-10-05-home-search-filters.md`); rebuilt bar, panels and cards after the user asked for an exact copy of the design; repo folder access lost late in the session.

## Open Questions
- [ ] Is the wording of the Índice Hara legend on the home okay?
- [x] Which files of the old directory should be deleted? (list to be shown before deleting) Answered 2026-10-25: the user asked to remove all the unused ones; done that day.
- [ ] Team WhatsApp number, office hours and a confirmed Argentine emergency line for the Ayuda page.
- [ ] What to do with the 11 invalid Instagram handles (ask the professionals, clear the field, or leave them)?
- [ ] Are the 5 candidate accounts the right people? Lucina Micheloud's candidate (@bagueslucina) sells Bagués products, and Sofía Belluscio has two candidates.
- [ ] What daily follow cap to use (was 5)?
- [ ] Is the confirmation's "Lo que sigue" copy okay? It is adapted from the old `/gracias` page, in vos and without dashes.
- [ ] Should the concierge budget default to ARS instead of USD? It kept the old form's USD default.
- [x] Which email(s) go in `ADMIN_EMAILS`? Superseded 2026-11-06: the user asked for roles instead of an email list.
- [x] Fix `getAdminUserId` returning 503 in production? Done 2026-11-06 in the roles plan (`requireAdmin`), with a production-mode guard test.

## Notes
- Done 2026-10-20 (removed from Next Steps, verbatim): 4. **Fix or restart the dev server on port 3000** / What: it returns 500 on every page, including the home. The user restarts it (PID in `/tmp/hara-dev.pid`), or I stop it by that PID with the user's approval. / Considerations: my server on port 3001 (PID in Notes) is still running for the TS-002 check. Two `next dev` servers share `.next`, so stop one once TS-002 is done. Port 3000 now serves my dev server (started 2026-10-19 with `rm -rf .next && npm run dev`, background task b6eoy2cyc), and it answers normally.
- Historical pre-release note: earlier sessions had uncommitted almanac work. The earlier redesign and f9e2297 now close those application changes; Instagram exclusions and local-only data remain governed by the separate rules above. Run `git status` once access is back. Files that must not stay untracked (project git hygiene rule): `app/Home*.tsx`, `lib/home-*.ts`, `lib/near-me*.ts`, `lib/moon-phase*.ts`, `lib/profile-specialties*.ts`, `app/registro/`, `app/que-es-hara/AyudaFaq*`, `public/assets/almanac/`, `ISSUES.md`, `docs/plans/*`.
- Design source: Claude Design project `d0e3236f-a77b-4d60-b083-b3dd4cdd9da2`, file `Hara Vital App.dc.html`, read with `DesignSync get_file`. `get_file` returns only the first 256 KB (`truncated: true`), and it has no offset. Newest rounds come first: on 2026-10-05 a fresh fetch returned rounds 11 and 10 only, and round 9 was past the cut. Rounds 10 and 11 do not change the Diario.
- Design file (copy, cut at 256 KB): `/private/tmp/claude-501/-Users-belenmontoya-Desktop-repos-hara/7176b110-1cbb-4c91-9f1a-086c78d014f5/scratchpad/app3.dc.html`. Round 11 (home as directory) is the current one; screens 11a to 11d.
- Round 9 screens (concierge 9a to 9d, Diario 9e, Buscar 9f, Ayuda 9g) are complete in `t9.html` in that same scratchpad folder. Diario 9e is the `id="9e"` block: list (title, category chips, featured article, rows) and article view (cover with back button, meta, title, dek, author row, body with pull quote, dark "Si esto te sonó" card, "Sigue leyendo"). That folder is under `/private/tmp` and can disappear on reboot.
- Gotchas: global `h1` to `h6` font rule is unlayered and beats utilities (use the almanac classes); global `p + p` adds a 16px margin (use spans); the `h1` to `h3` bottom margin is in `@layer base` so `mb-0` works; `backdrop-filter` makes an element the containing block for `fixed` children, so panels are rendered outside the sticky bar.
- Browser checks: Claude-in-Chrome tab id was 63223943; the first click after navigation can land before hydration, so wait about a second. Dev server runs on port 3000 (`npx next dev -p 3000`).
- Mutation-check helper used this session: `/tmp/mut.py <file> <old> <new>` (temporary, may be gone).
- ig-network files (all uncommitted on purpose): `.claude/skills/ig-network/SKILL.md`, `.claude/skills/ig-network/scripts/network.py`, the `.gitignore` lines, plus local data in `scripts/instagram-network.professionals.json`, `scripts/instagram-network.log.json` and `scripts/logs/network-audit-2026-10-02.md`.
- ig-network facts verified in Chrome: Hara's Instagram UI is in English; a missing profile shows "Sorry, this page isn't available" (also shown for renamed or blocking accounts); a private one shows "This profile is private"; follow button states are Follow, Following, Follow Back, Requested. Instagram search works from the page with `fetch('/web/search/topsearch/?context=blended&query=...')`, no extra headers needed.
- Supabase: `public.professionals`, columns `id`, `full_name`, `instagram`, `status = 'active'`. The service key is the new `sb_secret` format and goes only in the `apikey` header. On 2026-10-02 there were 45 active, 38 with Instagram.
- This plan was moved into the repo at `.claude/plans/hara.md` on 2026-10-05 (it was in `~/.claude/plans/` while the folder was blocked). It sits next to the older roadmap `.claude/plans/main.md` and is not merged with it.
- 2026-10-06: dev server started by me on port 3001 (`npx next dev -p 3001`). PID 65765, saved in `/private/tmp/claude-501/-Users-belenmontoya-Desktop-repos-hara/49fccfd3-5aab-49b4-a9ca-fda6037190a8/scratchpad/dev3001.pid`. Stop it only by that PID.
- 2026-10-06: concierge design files 9a to 9d are in `/private/tmp/claude-501/-Users-belenmontoya-Desktop-repos-hara/875ffcad-5322-4d16-838a-e262c9b802f7/scratchpad/` (`concierge-9a.html` to `concierge-9d.html`).
- 2026-10-06: almanac input style reused for the form fields: `rounded-2xl bg-gray-50 shadow-[inset_0_0_0_1.5px] shadow-foreground/10` (from `app/HomeFilterBar.tsx`), exported as `ALMANAC_INPUT_CLASS` in `app/solicitar/ConciergeSteps.tsx`.
- Done 2026-10-28 (removed from Next Steps, verbatim): 4. **Commit and push the redesign when the user says so** / What: all work since c411066 (home cards, featured pick, bottom bar, docs) is uncommitted, including 5 untracked files (`app/HomeSearch.tsx`, `app/components/AlmanacBottomNav.tsx` and its test, `lib/home-search.ts`, `docs/plans/2026-10-19-almanac-bottom-nav.md`). / Considerations: git writes need the user's permission; the user pushes once the whole redesign is done. Pushed as cc2e2d7 at the user's request.
- Archived session 2026-10-05 (home search), full text kept verbatim:
  - Completed: Planned and built the home search and filters from design round 11. Plan file: `docs/plans/2026-10-05-home-search-filters.md` (COMPLETE). New files: `lib/home-filters.ts`, `app/HomeFilterBar.tsx`, `app/HomeFilterPanels.tsx`, `lib/near-me.ts`, `app/HomeCardParts.tsx`, `app/HomeRowCard.tsx`, with tests for each logic piece. Changed `app/HomeArrival.tsx`, `app/HomeFeatured.tsx`, `app/page.tsx`, `lib/home-arrival.ts`. Element cards now only reorder the list (they no longer filter); the list shows everyone, 12 at a time with "Cargar 12 más (N restantes)". Rebuilt the bar and panels after the user said the first version did not match the design: dark search circle with pills that have chevrons, bottom-sheet panels with handle, "Limpiar" and "Ver N resultados", search field with the pills below it, "Usar mi ubicación" in the Ciudad panel. Rebuilt the featured card and list cards from the design: Índice Hara ring, specialty chips with "+N", modality tag, price, "Ver perfil →", Índice legend line. Checked everything in Chrome with real data; mutation-checked the new tests; full unit suite passed (92 files, 652 tests) and `tsc` was clean at the last run. Added ISSUES.md entry 13 (city values like "Banfield, Buenos Aires").
  - Modified: The first filter bar was a loose interpretation of the design and the user rejected it ("design in Claude Design is not a suggestion it needs to be copy exactly"). It was rebuilt from the design's markup. Cards: the old "Abierta" dot was dropped because it is not in the design.
  - Deviations: The Índice Hara legend text on the home is my own wording ("qué tan completo está el perfil y cómo lo valoran en las reseñas"), because the design's wording describes things the app does not compute. The design puts the concierge block above the list; it stays below because the user asked for that earlier. The design's script (panel subtitles, some labels) could not be read, so small copy lines were written by me in vos.
  - Blockers: Late in the session all access to the repo folder under `~/Desktop` was lost ("Operation not permitted"). The user did not change anything. A single attempt to run a read-only command outside the sandbox was denied by the permission classifier, and I stopped. The `/profesionales` removal and Diario were not started. Still open.
- 2026-11-06: design 13 (admin) markup is lines 34 to 445 of the downloaded design file; its logic is the `rvA` function in `logic.js`. Design 12 (`/registro`) is section `t12` (lines 446 to 876). Read through the `claude_design` MCP (`render_preview` then download `serve_url`; never show that URL). Design colors map to tokens: page `bg-background`, cream cards `bg-gray-50`, action `bg-brand-dark`, selected `bg-foreground`.
- 2026-11-06: my dev server on port 3000 is running (PID in `/tmp/hara-dev.pid`); a Chrome tab (63229776) is open on `/admin/login`.
- Completed Next Steps moved here on 2026-10-06 (verbatim):
  1. **Restore access to the repo folder** (done 2026-10-05)
     - Restarting Terminal fixed it; reads and writes under `~/Desktop` work again. On 2026-10-05 the user chose to do the Diario (step 4) next, before the `/profesionales` cleanup.

  4. **Do the Diario (blog) page**
     - What: compare the design's blog screens with `/blog` and `/blog/[slug]`, then plan and build it the same way as the other pages (spec, tests, mutation checks, browser check, stop for review).
     - Why: the user chose it next because it is the easier one.

  5. **Do the concierge screens**
     - What: `/solicitar` form and the `/r/{tracking_code}` recommendations page (design 9a to 9d).
     - Considerations: the home already links here from three places. Re-read the round 9 screens first.

### Registration review follow-up (2026-11-06)
- User rejected the account links in the home masthead and requested more bottom-menu items. Restored the centered logo and moved registration ("Soy pro") and login ("Entrar") to the shared bottom menu on home, Diario and Ayuda.
- User requested "← Volver" for the registration back link; changed it.
- User asked for evidence that tests catch actual flow failures. Nine deliberate behavior-breaking mutations were all detected by existing tests; original files were restored byte for byte. Logs: `/tmp/hara-registration-mutations`. No git writes or extra live accounts.

- Follow-up verification passed: TypeScript, production build, 67 affected tests and the nine home/Diario/Ayuda viewport checks at 1280/402/320px, including actual menu navigation and "← Volver". Screenshots inspected in `/tmp/hara-nav-proof`. No extra accounts or email sends.

### Single professional entry clarification (2026-11-06)
- User clarified that there must be exactly one public access link, "Ingresar", for professionals. Removed Soy pro and Entrar; public menu now has Inicio, Buscar, Diario, Ayuda and Ingresar (`/pro/login`). Admin uses its URL directly.
- Source: `AlmanacBottomNav`'s entries and column count. Existing test was updated first and failed RED on the old two-entry menu, then the source was fixed. No auth/registration behavior or role rules changed.

- Single-access verification: RED reproduced the old extra entries, GREEN passed with one Ingresar; TypeScript/build and all 786 unit tests passed. Production Chrome verified all five menu entries and professional login navigation on home/Diario/Ayuda at 320/402/1280px. Screenshots in `/tmp/hara-single-access-proof`. Lint remains blocked by missing repo ESLint configuration; no new config/dependencies added.

### Professional login and bottom-search revision (2026-11-06)
- User added `/pro/login` styling to the scope: the old visual is not acceptable for approval. Reused registration/admin almanac composition, with one logo, Volver, serif heading, cream card, warm fields and terracotta action. Preserved sign-in/redirect/recovery handlers and added the application link inside this professional entry point. The profile editor remains outside the visual scope.
- User removed Buscar from the public bottom menu: now Inicio, Diario, Ayuda and Ingresar. Removed the nav-only search prop/wrapper; search stays in the home filter bar and #buscar links still work.
- Tests updated first (8 expected RED failures); 25 targeted checks pass after implementation. Production visual checks at 320/402/1280px passed for login/error/recovery, home search and four-entry navigation. Build, TypeScript and 790 tests passed. Real registration/sign-in/review/403 E2E passed in 8.2 seconds and deleted the test account/profile/image. Recovery email delivery was not verified (its browser response is stubbed).

### Critical-flow test coverage audit (2026-11-06)
- User rejected test counts as a readiness signal and requested actual mail, persisted form-data and concierge outcomes plus edge cases. New concrete plan: `docs/plans/2026-11-06-critical-flows-verification.md` (PENDING approval for source fixes).
- Confirmed coverage gap: registration E2E passed with a rejected confirmation recipient. Read-only Gmail verified its admin notice in INBOX; do not claim all mail is broken or all delivery is covered.
- Reproduced isolated boundary bugs: whitespace name/bio and blank specialty reach registration insertion; no-contact concierge input returns a lead id. Diagnostic tests were restored/removed afterwards; no live data was created or changed.
- Added ISSUES.md 20 (verification gaps) and 21 (required-data validation). No business fixes, migrations, extra emails or live concierge submissions performed.
- Future readiness reports must use business scenarios/stages (browser/server/DB/admin/mail), not the count of passing units. Existing useful unit/security tests remain; no mass deletion.

### Critical-flow plan rejected and revised (2026-11-06)
- User explicitly rejected revision 1 because it only expanded their examples. No implementation is approved.
- Read PRODUCT.md and the coupled account/recovery/approval, Carta, contact/reviews, subscription/expiry and Diario paths. Rewrote `docs/plans/2026-11-06-critical-flows-verification.md` around six Hara journeys and domain-specific state transitions, with priorities, evidence classes and unresolved product contracts.
- New reproduced edge: sendBeacon returning false triggers no fallback contact-event request; original unit file restored byte for byte, no real message/contact/data changes (ISSUES.md 22).
- Source findings remain observations/risks: submitted-account recovery conflicts with the new account lifecycle; approve/reject concurrency; Carta availability after professional state changes; consumed review links edit rather than create; review invite insert-before-email tradeoff; UTC/ART renewal/expiry and intentional repeated-payment behavior. Do not label all of these production bugs without reproduction and an agreed contract.
- Pending: user's review of the new case matrix. No source fixes, schema changes, live fixtures, commits or push.

### Session 2026-11-06 (final release approval)
- User approved the headed Chrome results and explicitly requested commit and push. Both registration and portal specs are VERIFIED. Scope includes the account workflow, review/edit guard, professional almanac pages, navigation, tests and synced documentation.
- Evidence: `/tmp/hara-pro-e2e.log` records six scenarios passing in visible Chrome, with verified cleanup. TypeScript, unit project and production build passed; lint configuration, Upstash, real inbox delivery and live Google selection remain disclosed limits.
- Next requested work: classify practices for the 41 outstanding profiles. The broader critical-flow plan is deferred, with no business fixes authorized by this release.

### Session 2026-11-06 (plan status reconciliation after push)
- Confirmed actual delivery: f9e229717963f5b1d779867e4ece535da44d1a62 is both local HEAD and origin/main after the successful push; the pre-push unit project passed and the tree was clean before these documentation-only updates.
- Marked registration/account, professional almanac pages, menu, visible Chrome verification and git delivery complete. No deployment success is claimed: that check remains open.
- Next requested work remains classification of the 41 profiles. Existing-professional account invitations, Upstash, reapplication and Ayuda details remain open; general critical-flow coverage/fixes remain deferred and unapproved.
- This session updates plan records only; it changes no application code or live professional data and runs no new business tests.

### Session 2026-11-07 (correction to practice backlog)
- User said the practice mapping had already been fixed. Confirmed the prior June record that migration 020 was applied, then ran the current resolveProfileSpecialties function on a fresh read-only snapshot of the real 45 profiles and catalog.
- Actual result: 45 profiles resolve practices, 44 resolve specialties, one Arteterapia-only profile has no derived specialties. Evidence: `/tmp/hara-practice-resolution-check.log`. This is a function/data check, not a new browser-flow verification.
- Corrected the previous inference that 41 empty stored arrays imply 41 people needing manual classification. The count describes stored fields/review flags. No profiles, catalog rows or application code were changed.

### Session 2026-11-07 (Arteterapia only, completed)
- Scope explicitly narrowed by the user: complete only the missing specialty association for Arteterapia. Assigned the existing Autoconocimiento category based on the two profiles' descriptions of exploration/connection through art.
- RED visible-browser check reproduced the missing tile. Updated exactly one live catalog field; protected the prior empty value. Independent readback showed no other catalog changes and an identical professionals fingerprint.
- GREEN in visible Chrome on local production and haravital.app: both public profiles show Autoconocimiento at 1280/402 px; Victoria's other specialties remain visible. Evidence and backup are recorded in docs/plans/2026-11-07-arteterapia-specialty.md.
- No 41-profile writeback, other catalog edits, code changes, migrations, accounts or emails. No git delivery was performed for this data-only task.
