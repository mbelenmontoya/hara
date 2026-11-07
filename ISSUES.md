# Issues and improvements

A running list of problems and ideas we find while working. Add new entries at the bottom of the right section. Keep each one short: what is wrong, how we know, and ideas for fixing it. When something is fixed, move it to "Done" with the date.

This is separate from `KNOWN_ISSUES.md` (a browser bug) and from `PLAN-main.md` (the roadmap).

## Open

### 1. Pages are slow because every database call is slow and nothing is cached

**Found:** 2026-10-02, while checking the almanac profile and home pages.

**What we see:** a simple profile page takes about a second to load, which is too long for a page with a little information.

**What we measured** (local dev server, warm, times in seconds):

| Request | Time |
|---|---|
| Direct Supabase call, even `limit=1` | 0.27 to 0.45 |
| Connecting to Supabase (TCP and TLS) | 0.02 |
| Home `/` (2 queries at the same time) | 0.29 |
| Directory `/profesionales` | 0.45 to 0.52 |
| Profile `/p/<slug>` (4 queries one after another) | 1.0 to 1.3 |

The connection is fast. The time is spent waiting for the database to answer, about 0.3 s per query no matter how small the query is.

**Why it adds up**
- The profile page (`app/p/[slug]/page.tsx`) runs four queries in sequence: the professional, the reviews, the practices catalog, and the blog posts. Each waits for the one before it.
- Nothing is saved between visits. All three public pages use `export const dynamic = 'force-dynamic'`, and the database client sets `cache: 'no-store'` on every request (`lib/supabase-admin.ts:30`).
- The practices catalog (35 rows that rarely change) is downloaded again on every page view.

**Not yet known** (we have not checked these)
- Which region the Supabase project is in, and which region Vercel runs the pages in. If they are far apart, every query pays that distance.
- Whether production is as slow as local. These numbers come from dev mode, so measure on the deployed site before changing anything.

**Ideas, roughly in order of effort**
1. Run independent queries at the same time with `Promise.all` on the profile page (should take it from about 1.2 s to about 0.4 s).
2. Cache the practices catalog and clear the cache when an admin edits a practice (`bustPracticesCache` in `lib/practices.ts` already exists as an empty placeholder).
3. Let public pages be cached for a short time (for example 60 seconds) and refresh them when a profile or review changes, instead of `force-dynamic`.
4. Put the database and the Vercel functions in the same region.
5. Fetch the professional and their reviews in one database call.

### 2. Stored practice fields and automatic resolution need reconciliation

**Found:** 2026-10-02. **Corrected:** 2026-11-07 after the user pointed out that mapping had already been fixed.

The original count was 42/45, later 41/45, for empty professionals.practices and needs_practice_review. This was incorrectly presented as 41 profiles requiring new manual classification. The June session records migration 020 applied, and the existing resolver uses catalog keys, labels and aliases on raw specialties.

**Read-only check before the correction:** Running resolveProfileSpecialties on that snapshot recognized practices for all 45 profiles and specialties for 44. Only the Arteterapia-only profile lacked derived specialties. Evidence: `/tmp/hara-practice-resolution-check.log`; that diagnostic itself made no browser check or database writes. The missing Arteterapia association was subsequently fixed and checked publicly as recorded below.

After the user-approved Arteterapia-only correction on 2026-11-07, four catalog entries retain empty specialty mappings (Biodescodificacion, Coaching, Mediumnidad, Pendulo), but that is separate from the stored-profile flags and is not authorization to invent new mappings. The current schema allows automatic resolution without writing inferred practices back.

**Scope decision (2026-11-07):** the user requested only the Arteterapia fix. It is now associated with Autoconocimiento, verified on both affected public profiles. Persisted practice-array/review-flag reconciliation and the other catalog entries are outside that approved scope. Do not treat the old 41 count as a confirmed public-classification failure or rerun migrations blindly.

### 3. The home cards barely change the list

**Found:** 2026-10-02.

The four cards are the four most common specialties, and 42 of 45 professionals fall under the first one, because most practices map to `estres-ansiedad`. Tapping a card changes the list very little.

**Idea:** revisit the practice-to-specialty mapping so specialties are more spread out, or choose the cards a different way.

### 4. The home page lists only 9 people

**Found:** 2026-10-02.

The home shows one featured professional plus 8 rows, even under "Todos los profesionales". "Ver todos" opens the full directory.

**Idea:** decide whether a "Ver más" button that expands the list is worth the longer page.

**Revalidation needed (2026-11-06):** `app/HomeArrival.tsx` now has visibleCount pagination and a "Cargar ... más" control. This was observed in source, not newly tested in the browser. Do not treat the original fixed-nine report as a confirmed current bug before checking the actual page.

### 5. Wording is mixed between "tú" and "vos"

**Found:** 2026-10-02.

The design uses "tú" ("Cuéntanos", "llegas"). The project rule is Argentine "vos". The home page was converted ("Contanos", "estás"), but the profile heading "Para cuando llegas con" still has the design's wording.

**Idea:** pick one and apply it to every almanac page as we go.

### 6. The sparkle icon from the design is broken

**Found:** 2026-09-30.

The `destello` SVG exported from Claude Design renders as a dot, even in the original upload. The profile and home use a simple inline sparkle instead. The other exported SVGs are whole-artboard sheets of about 62 KB each, which is heavy for small decorations.

**Idea:** re-export `destello` from the design tool as a clean, single-shape SVG, and trim the others.

### 7. Lint is not working in a fresh checkout

**Found:** 2026-09-30.

- `npm run lint` has no ESLint config, so it asks to set one up.
- Fixed 2026-10-16: `npm ci` works again (the lockfile was refreshed), and `npm run build` passes (`vitest.workspace.ts` is left out of the build's type check in `tsconfig.json`).

**Idea:** add an ESLint config.

### 8. `.env.local` has two odd lines

**Found:** 2026-10-02.

- A line named `X-Cultural-Research-Token` has a hyphen in its name, so it is not a valid environment variable and nothing reads it.
- `NEXT_PUBLIC_SENTRY_DSN` appears twice.

**Idea:** remove the stray line and one duplicate. If that token matters, rotate it, because its value was printed once in a terminal session.

### 9. The home page's featured name probably has extra space below it

**Found:** 2026-10-02.

A global rule adds a 16px bottom margin to every `h1`, `h2` and `h3` on small screens (`app/globals.css`, inside `@layer base`). On the Buscar rows I removed it with `mb-0`. The featured professional's name on the home page (`app/HomeFeatured.tsx`) is an `h3` too, so its gap to the quote is likely bigger than the design's. Same check for the almanac headings on the profile page.

**Idea:** add `mb-0` to those headings and compare with the design.

### 10. No professional is on the Destacado tier

**Found:** 2026-10-02.

All 45 active professionals are on the basic tier, so the Destacado mark cannot be seen with real data on any page. The profile and home marks are covered by unit tests, but nobody has looked at them on screen.

**Idea:** mark one test professional as Destacado in a development database and check the mark on the directory, the home page and the profile.

### 11. Leftovers from the old directory page

**Found:** 2026-10-02. **Updated:** 2026-10-25.

The old directory page was removed (the home page replaces it, and `/profesionales` redirects to `/`). On 2026-10-25 its unused code was deleted: `ProfessionalCard`, `WelcomeHint`, `LocationFilter`, the `ProfessionalsDirectory` and `DirectoryFilters` components, `app/components/ContactFooterForm.tsx`, `app/api/contact` and `notifyContactForm` in `lib/email.ts`. They are in git history if a new design needs them. What stays in `app/profesionales` is what the home uses: the `DirectoryProfessional` type, the search and filter helpers, `FilterState`, `DirectoryMap` and `useCityGeocode`.

Still unused: `app/components/ui/RevealOnScroll.tsx` (since the profile redesign) and `app/components/WelcomeModal.tsx` (already unused before). The visual test baseline `home-visual-darwin.png` shows the old home and needs regenerating. The end-to-end tests for the old directory page were deleted (they are in the last commit); they will need rewriting for the new design.

**Idea:** delete `RevealOnScroll` and `WelcomeModal`, and regenerate the visual baseline.

### 12. Ayuda needs a team WhatsApp, office hours and an emergency line

**Found:** 2026-10-02, while building the Ayuda page (`/que-es-hara`).

The design shows a button to write to the team on WhatsApp with office hours, and an always-visible emergency line card. We have no team WhatsApp number, no office hours and no confirmed emergency line for Argentina, so none of them is on the page: the dark card uses the email and Instagram we do have. The design's emergency number (800 911 2000) is an example from another country and must not be used. A wrong crisis number is worse than none.

**Idea:** decide the team WhatsApp number and hours, and confirm an Argentine emergency line (name and number), then add them to the Ayuda page.

### 13. Some cities in the home filter bar look odd

**Found:** 2026-10-05, while building the home search and filters. "Usar mi ubicación" was added later (`lib/near-me.ts`).

The Ciudad panel lists the cities in our data. Some of those cities are written as "Banfield, Buenos Aires" or "Colón, Buenos Aires", so the same place can show up twice under different spellings.

**Idea:** clean up the city values when professionals register (for example by saving the city and province separately).

### 14. The new concierge form no longer asks for a practice, and test leads need deleting

**Found:** 2026-10-06, while building the new `/solicitar` form (design 9a).

The new form leaves out "Tipo de práctica que preferís", because the user chose to drop it. New leads therefore have an empty `practice_preference`, and whoever picks the three professionals has to decide the practice from the intents and the note in "Lo que contó".

Checking the form in the browser sends a real lead to Supabase. Those test leads stay in the admin list until someone deletes them.

**Idea:** delete each test lead from the admin after a check. If matching without a practice turns out hard, add the question back as an optional chip row in step 1.

### 15. Review tags are saved but not shown on the profile yet

**Found:** 2026-10-16, while building the new review link (design 9d).

The review page now asks "¿Qué fue cierto?" with six tags, and saves them in `reviews.tags` (migration 024). The same link can also edit the review until it expires. The tags show on the review's thank-you preview, but the public profile's reviews section does not show them, because the profile design has no place for them.

The tag labels come from the design. One of them ("Me sentí escuchada") is written in the feminine.

**Idea:** when the profile reviews get their almanac design, show the tags there. Decide then whether the labels need neutral wording.

### 16. The Upstash rate limiter is gone, and every rate-limited request waits about 4 seconds

**Found:** 2026-10-16, while checking the Carta in the browser (it took about 5 seconds to load).

The host in `UPSTASH_REDIS_REST_URL` (`sacred-calf-69756.upstash.io`) no longer exists in DNS (`getaddrinfo ENOTFOUND`). That usually means the free Upstash database was deleted for inactivity. `lib/rate-limit.ts` fails open, so requests still go through, but each one first waits about 4.4 seconds for the lookup to fail. This slows every endpoint that calls `ratelimit.limit`: the Carta data, review submissions, contact events and the other public routes. Nothing is being rate limited right now.

Measured locally: the recommendations API takes about 5 seconds, of which the rate limiter is 4.4 seconds and the three database calls are about 0.8 seconds. Production uses whatever Upstash variables are set in Vercel, which were not checked.

Fixed in part on 2026-10-16: `lib/rate-limit.ts` now waits at most 800 ms for Redis (the library default was 5 seconds), so a dead database costs 0.8 seconds instead of 4.4.

**Still to do:** create a new Upstash Redis database, put its URL and token in `.env.local` and in Vercel, and check that `ratelimit.limit` answers in milliseconds.

**Parked on 2026-10-19:** the user wants to check this together once the redesign is done. First look in the Upstash console for an archived `sacred-calf-69756`, then compare with the Upstash variables in Vercel, and only then create a new database.

### 19. Rejected applicants with an account cannot reapply with the same email

**Found:** 2026-11-06, while adding account creation to `/registro`.

New applicants already have a Supabase Auth account. After rejection and the 60-day cooldown, another application using that email returns 409 with the login/contact message. Existing profiles without an account keep the previous reapplication flow. This is explicitly out of scope in `docs/plans/2026-11-06-registro-almanac-account.md`.

**Still to do:** define how an authenticated rejected applicant resubmits without creating a second account.

### 20. Passing unit tests do not verify critical request and mail delivery

**Found:** 2026-11-06, while reviewing what the test suite actually guarantees.

The real registration/sign-in E2E passed while Resend rejected its example.com confirmation recipient. The admin email did arrive (checked read-only in Hara Gmail), but the test asserted neither mail receipt. SolicitarForm mocks createLead, and even the createLead test under integration mocks both DB and email, so they cannot establish that a concierge request reaches the database, admin and receiving inbox.

**Verification gap:** not evidence that every live notification or concierge request is broken. The release gate needs real persisted-row/admin/inbox assertions, recorded by scenario. Plan: `docs/plans/2026-11-06-critical-flows-verification.md`, deferred by the user and unapproved. The approved portal release verifies real invitation/password/profile persistence, not inbox delivery or concierge processing.

### 21. Required server fields accept unusable values

**Found:** 2026-11-06, reproduced with isolated diagnostic tests.

Registration returns 200 and attempts account/profile insertion for a whitespace name, a 60-space biography, or specialties containing an empty string. createLead accepts a concierge input with no email or WhatsApp. These were verified against the actual handlers with mocked external services; no invalid live row was inserted. The public form validates contacts, but a broken mapper/direct caller can bypass that protection.

**Contact validation status:** registration is fixed and shipped in e782854. Concierge contact validation is implemented locally with the /fix workflow (2026-11-07), final review approved by the user; git delivery pending. createLead now requires a valid email and international WhatsApp before queries, inserts or notifications. Its existing mocked action tests moved into app/actions/create-lead.test.ts so unit/pre-push runs them; RED proved the original bug and GREEN preserves valid submissions and notification invocation. Visible Chrome called the real production action with four invalid contacts; each rejected and Supabase had zero matching leads. TypeScript/build/unit passed; lint remains unconfigured. Valid live concierge submission and inbox receipt were not tested. Evidence and scope are in .claude/plans/hara.md, session /fix concierge contact.

**Registration fix (2026-11-07):** plan `docs/plans/2026-11-07-register-required-fields.md` VERIFIED; final user review and commit/push approved. Persistent RED → GREEN plus revert-test proves the regression detects the original bug. Visible Chrome against local production rejected four real JSON/multipart requests with 400 and confirmed no Auth/profile records; valid registration, image bytes in Storage, login, pending edit 403 and fixture cleanup passed. TypeScript/build/unit passed; ESLint remains unconfigured. Google selection, inbox delivery and deployment were not verified. Upstash remains parked; the general flow plan has not been resumed.

### 22. Contact event is not retried when the browser refuses sendBeacon

**Found:** 2026-11-06, during the domain-flow test review.

`ContactButton` checks whether sendBeacon exists, but ignores a false return and does not use its fetch fallback. An isolated diagnostic forced false and expected a POST fallback; the assertion failed with zero calls (`/tmp/hara-beacon-rejection-probe.log`). The original source/test was restored; no real contact was sent.

**Impact to verify end to end:** contact statistics and opt-in review eligibility can miss the interaction even when the WhatsApp destination remains usable. Fix remains unapproved under the revised critical-flow plan.

## Done

- 2026-11-07: completed the sole approved Arteterapia gap: practices[arteterapia].specialties now contains autoconocimiento. Verified on the María Laura and Victoria public profiles in visible Chrome on haravital.app at desktop/mobile sizes. Snapshot comparison confirms no other catalog row/field or professional record changed. No application code or migration was needed. Plan: docs/plans/2026-11-07-arteterapia-specialty.md.

- 2026-11-06: fixed entry 17 (found 2026-10-19 while adding the bottom bar): professional sign-up and login previously required direct URLs, and neither the bottom bar nor the design exposed them. The shared bottom menu has one "Ingresar" link to `/pro/login`, exclusively presented as professional access. The user removed the separate registration/admin entry links; admin uses `/admin/login` directly. The user moved these out of the masthead after reviewing the first implementation; the centered home logo is restored.

- 2026-11-06: fixed entry 18 (any signed-in professional could open the admin). Access now depends on the role in the Supabase Auth user (`app_metadata.role`, only writable by the server): `admin` opens `/admin` and `/api/admin`, `professional` opens `/pro`. Also fixed: the admin write routes (Crear match, practices create/edit/discard, PQL adjust) returned 503 on the live site because the old `getAdminUserId` rejected every request in production. They now use `requireAdmin()`, guarded by `app/api/admin/admin-auth.production.test.ts`, which runs them with `NODE_ENV=production`.
- 2026-10-02: removed the old directory page `/profesionales` but kept its components for the new design (it redirects to `/`), moved sign-up from `/profesionales/registro` to `/registro` (old addresses redirect), and pointed the nav, other pages, emails, docs and tests to the new places.
