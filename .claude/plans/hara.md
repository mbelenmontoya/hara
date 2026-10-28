# Plan: hara

## Overview
Hara Vital is a marketplace for holistic therapies (Argentina and Spanish-speaking markets), built with Next.js 14, Tailwind v4 and Supabase. We are applying the Claude Design "quiet almanac" redesign one page at a time and stopping after each page for review in the browser.

Pages done and approved: the professional profile `/p/[slug]`, the home `/` (which is now the directory), and Ayuda `/que-es-hara`. Sign-up moved to `/registro`. The old `/profesionales` page was removed on purpose, but its components are still in `app/profesionales/components` and `app/profesionales/hooks` because the home imports from them.

This session finished the home page: the sticky filter bar with its panels, and the new professional cards, both copied from the design's round 11 markup.

A separate workstream (Instagram network): the `ig-network` skill in `.claude/skills/ig-network/`. It reads active professionals from Supabase (read-only), opens each one's Instagram in Chrome with the Hara account, and records whether the handle exists, whether Hara follows them and whether they follow Hara. It is separate from `ig-engage` (hashtag comments and DMs to strangers). Later phases, agreed but not built: automatic follows with a daily cap, and finding posts to share in stories with approval.

Rules from the user for this work:
- The design's layout and behavior are copied exactly. Its copy and placeholder data are never used: only real app data, in Argentine Spanish (vos). Anything the app does not have is left blank.
- Do not restyle things that were not asked for. One page at a time. No questions in planning.
- No em dashes or en dashes anywhere. No extra .md files except the spec plan and ISSUES.md entries.
- Never kill processes by port or kill browsers. The dev server on port 3000 is stopped only by the PID in `/tmp/hara-dev.pid`.

## Success Criteria
- [x] Home `/` has the sticky filter bar (search, Prácticas, Modalidad, Ciudad, count, Limpiar filtros, Lista/Mapa) working with real data
- [x] Home cards (featured and list) follow the design, with real data only
- [x] Unit suite and `tsc` pass at the last run (92 files, 652 tests)
- [x] `/profesionales` leftovers removed without breaking the home (2026-10-25)
- [x] Diario (blog) matches the design (done 2026-10-05, plan `docs/plans/2026-10-05-almanac-diario-page.md`, approved, not committed)
- [x] Concierge screens (`/solicitar`, `/r/{tracking_code}`, design 9a to 9d) match the design (all four done 2026-10-16; the visual check against the design is done too)
- [x] Home cards filter the list, the count and the map (the user chose this over the design's reorder, 2026-10-19); the featured card is a random pick per visit among Índice Hara 50 or more, and there is no featured card when none of them is shown
- [ ] Upstash rate limiter checked together with the user once the redesign is done (ISSUES.md entry 16)
- [x] Concierge form and confirmation (9a, 9b) done and verified 2026-10-16 (migration 023 run, test lead sent; plan `docs/plans/2026-10-05-almanac-concierge-screens.md`)
- [x] Carta (9c, `/r/[tracking_code]`) and review link (9d) built and checked in Chrome 2026-10-16 (plan `docs/plans/2026-10-16-almanac-carta-resena.md`, migration 024 run)
- [x] Bottom nav bar (Inicio, Buscar, Diario, Ayuda) on the home, Diario and Ayuda, done 2026-10-19 (plan `docs/plans/2026-10-19-almanac-bottom-nav.md`). The masthead search circle was removed at the user's request.
- [ ] Ponytail review findings decided (1 should-fix, 4 nice-to-haves, 2026-10-20)
- [ ] Links to professional sign-up and login placed somewhere public (ISSUES.md entry 17, needs a design)
- [x] `ig-network` audit of all professionals' Instagram handles done (38 handles: 22 valid, 5 possible new accounts, 11 invalid)
- [ ] Invalid handles resolved with the professionals and the 5 candidate accounts confirmed
- [ ] Follow phase built and run (daily cap, starting with professionals who already follow Hara)
- [ ] Content discovery for stories built (approval required for every share)

## Constraints
- The home imports filter logic, `DirectoryFilters`, `DirectoryMap`, `useCityGeocode` and the `DirectoryProfessional` type from `app/profesionales`. Those cannot be deleted.
- Never show raw `professionals.specialties` free text; specialties come from the practices catalog through `resolveProfileSpecialties`.
- Use design tokens only (no new hex colors). Fonts Instrument Serif and Jost are opt-in through `.font-almanac`, `.font-almanac-serif` and `.almanac-label`.
- Git write commands need explicit permission. Nothing from this work is committed yet.
- `.env.local` holds the real Supabase keys and is git-ignored; never print its values.
- `ig-network`: Supabase is read-only (one SELECT). Never edit the DB from the skill; wrong handles go to the report and the user decides. No automatic scheduling: it runs only when the user launches it, and by default audits only professionals not yet in the log (or whose instagram changed in the DB). `--all` audits everyone.
- `ig-network`: follows will be automatic but capped per day, never unfollow. Sharing content always needs the user's approval; if native share is not available, mark `manual_required` and never download or repost.
- The user does not want the `ig-network` work committed or pushed.
- Leads are written only through `createLead` (`app/actions/create-lead.ts`). Test leads sent during browser checks are deleted by the user or through the admin, never by a script.
- Supabase migrations are run by the user in the SQL editor, not from a session.

## Next Steps
1. **Decide which ponytail review findings to fix**
   - What: the review of the bottom bar and home card work (2026-10-20) found no must-fix items. Should fix: (1) a test that the map only shows the professionals of the selected card. Nice to have: (2) drop `pendingScroll` and the `animate` flag in `app/HomeSearch.tsx`, (3) move `Magnifier` back into `app/HomeFilterBar.tsx`, (4) make "Limpiar filtros" also clear the selected card (product choice), (5) drop the unused `export` on `AlmanacTab`.
   - Considerations: no code changed yet; wait for the user to pick by number. Not checked: the bar's fixed 30px bottom padding on a real iPhone with a home indicator.

2. **Check the Upstash rate limiter together with the user (parked until the redesign is done)**
   - What: see ISSUES.md entry 16. Check the Upstash console first, then Vercel's variables, and only then create a new database.

3. **Place the professional sign-up and login links**
   - What: nothing public links to `/registro` or `/pro/login` (ISSUES.md entry 17). The bottom bar is done (2026-10-19) and does not include them.
   - Considerations: ask Claude Design where they go before building anything.

4. **Commit and push the redesign when the user says so**
   - What: all work since c411066 (home cards, featured pick, bottom bar, docs) is uncommitted, including 5 untracked files (`app/HomeSearch.tsx`, `app/components/AlmanacBottomNav.tsx` and its test, `lib/home-search.ts`, `docs/plans/2026-10-19-almanac-bottom-nav.md`).
   - Considerations: git writes need the user's permission; the user pushes once the whole redesign is done.

5. **Work through the open items in ISSUES.md**
   - What: slow database calls with no caching, 42 of 45 professionals still need practice review, home cards barely differ because most practices map to `estres-ansiedad`, mixed tú and vos wording, the broken destello SVG, build, install and lint problems, odd `.env.local` lines, no Destacado professional in the data, unused leftovers (`RevealOnScroll`, `WelcomeModal`, stale visual baseline), and the Ayuda page's missing WhatsApp number, hours and Argentine emergency line (needs input from the user).

6. **Resolve the invalid Instagram handles**
   - What: decide with the user what to do with the 11 invalid handles and confirm or reject the 5 candidate accounts (Guadalupe Rodriguez, Leonela Velona, Lucina Micheloud, Sofía Belluscio, Victoria Garino).
   - Why: the user said "luego vemos qué hacer con los inválidos".
   - Considerations: the full list with evidence is in `scripts/logs/network-audit-2026-10-02.md`. Fixes go into Supabase by the user (or through the admin), never from the skill.

7. **Build the ig-network follow phase**
   - What: follow valid professionals Hara does not follow yet, with a daily cap (was 5, its config file was removed, define it again), logging `last_followed_at`, never unfollowing.
   - Considerations: start with the 9 that already follow Hara ("Follow Back"). The current log has no `follows_hara` values yet; they get filled by the next `plan --all` run.

8. **Build the ig-network content discovery phase**
   - What: read recent posts of valid professionals, classify them (educativo, práctica, sesión, evento, reflexión), and propose `share_to_story`, `comment` or `skip` with the exact post and why it is useful. Every share needs the user's approval.
   - Considerations: test in Chrome what "Add to story" really allows for the Hara account before writing that step.

## Session Log

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

### Session — 2026-10-05
**Completed:**
- Planned and built the home search and filters from design round 11. Plan file: `docs/plans/2026-10-05-home-search-filters.md` (COMPLETE).
- New files: `lib/home-filters.ts`, `app/HomeFilterBar.tsx`, `app/HomeFilterPanels.tsx`, `lib/near-me.ts`, `app/HomeCardParts.tsx`, `app/HomeRowCard.tsx`, with tests for each logic piece.
- Changed `app/HomeArrival.tsx`, `app/HomeFeatured.tsx`, `app/page.tsx`, `lib/home-arrival.ts`.
- Element cards now only reorder the list (they no longer filter); the list shows everyone, 12 at a time with "Cargar 12 más (N restantes)".
- Rebuilt the bar and panels after the user said the first version did not match the design: dark search circle with pills that have chevrons, bottom-sheet panels with handle, "Limpiar" and "Ver N resultados", search field with the pills below it, "Usar mi ubicación" in the Ciudad panel.
- Rebuilt the featured card and list cards from the design: Índice Hara ring, specialty chips with "+N", modality tag, price, "Ver perfil →", Índice legend line.
- Checked everything in Chrome with real data; mutation-checked the new tests; full unit suite passed (92 files, 652 tests) and `tsc` was clean at the last run.
- Added ISSUES.md entry 13 (city values like "Banfield, Buenos Aires").

**Modified:**
- The first filter bar was a loose interpretation of the design and the user rejected it ("design in Claude Design is not a suggestion it needs to be copy exactly"). It was rebuilt from the design's markup.
- Cards: the old "Abierta" dot was dropped because it is not in the design.

**Deviations:**
- The Índice Hara legend text on the home is my own wording ("qué tan completo está el perfil y cómo lo valoran en las reseñas"), because the design's wording describes things the app does not compute.
- The design puts the concierge block above the list; it stays below because the user asked for that earlier.
- The design's script (panel subtitles, some labels) could not be read, so small copy lines were written by me in vos.

**Blockers:**
- Late in the session all access to the repo folder under `~/Desktop` was lost ("Operation not permitted"). The user did not change anything. A single attempt to run a read-only command outside the sandbox was denied by the permission classifier, and I stopped. The `/profesionales` removal and Diario were not started. Still open.

## Open Questions
- [ ] Is the wording of the Índice Hara legend on the home okay?
- [ ] Which files of the old directory should be deleted? (list to be shown before deleting)
- [ ] Team WhatsApp number, office hours and a confirmed Argentine emergency line for the Ayuda page.
- [ ] What to do with the 11 invalid Instagram handles (ask the professionals, clear the field, or leave them)?
- [ ] Are the 5 candidate accounts the right people? Lucina Micheloud's candidate (@bagueslucina) sells Bagués products, and Sofía Belluscio has two candidates.
- [ ] What daily follow cap to use (was 5)?
- [ ] Is the confirmation's "Lo que sigue" copy okay? It is adapted from the old `/gracias` page, in vos and without dashes.
- [ ] Should the concierge budget default to ARS instead of USD? It kept the old form's USD default.

## Notes
- Done 2026-10-20 (removed from Next Steps, verbatim): 4. **Fix or restart the dev server on port 3000** / What: it returns 500 on every page, including the home. The user restarts it (PID in `/tmp/hara-dev.pid`), or I stop it by that PID with the user's approval. / Considerations: my server on port 3001 (PID in Notes) is still running for the TS-002 check. Two `next dev` servers share `.next`, so stop one once TS-002 is done. Port 3000 now serves my dev server (started 2026-10-19 with `rm -rf .next && npm run dev`, background task b6eoy2cyc), and it answers normally.
- Uncommitted: all of this session's work and earlier almanac work are untracked or modified in the working tree and not committed. Run `git status` once access is back. Files that must not stay untracked (project git hygiene rule): `app/Home*.tsx`, `lib/home-*.ts`, `lib/near-me*.ts`, `lib/moon-phase*.ts`, `lib/profile-specialties*.ts`, `app/registro/`, `app/que-es-hara/AyudaFaq*`, `public/assets/almanac/`, `ISSUES.md`, `docs/plans/*`.
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
- Completed Next Steps moved here on 2026-10-06 (verbatim):
  1. **Restore access to the repo folder** (done 2026-10-05)
     - Restarting Terminal fixed it; reads and writes under `~/Desktop` work again. On 2026-10-05 the user chose to do the Diario (step 4) next, before the `/profesionales` cleanup.

  4. **Do the Diario (blog) page**
     - What: compare the design's blog screens with `/blog` and `/blog/[slug]`, then plan and build it the same way as the other pages (spec, tests, mutation checks, browser check, stop for review).
     - Why: the user chose it next because it is the easier one.

  5. **Do the concierge screens**
     - What: `/solicitar` form and the `/r/{tracking_code}` recommendations page (design 9a to 9d).
     - Considerations: the home already links here from three places. Re-read the round 9 screens first.
