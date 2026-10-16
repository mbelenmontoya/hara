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

### 2. Most professionals have not been mapped to practices yet

**Found:** 2026-10-02.

42 of 45 active professionals are flagged `needs_practice_review`, and none has a curated specialty saved directly. The pages work around this by matching their free text to the practices catalog (`lib/profile-specialties.ts`). Also, 5 practices have no specialties set (`coaching`, `arteterapia`, `mediumnidad`, `pendulo`, `biodescodificacion`), so people who only match those get fewer tiles.

**Idea:** finish the admin review (`SpecialtyMapper` and `PracticeMapper`) and fill the 5 empty practices.

### 3. The home cards barely change the list

**Found:** 2026-10-02.

The four cards are the four most common specialties, and 42 of 45 professionals fall under the first one, because most practices map to `estres-ansiedad`. Tapping a card changes the list very little.

**Idea:** revisit the practice-to-specialty mapping so specialties are more spread out, or choose the cards a different way.

### 4. The home page lists only 9 people

**Found:** 2026-10-02.

The home shows one featured professional plus 8 rows, even under "Todos los profesionales". "Ver todos" opens the full directory.

**Idea:** decide whether a "Ver más" button that expands the list is worth the longer page.

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

### 11. The old directory code is kept but no page uses it

**Found:** 2026-10-02.

The old directory page was removed (the home page replaces it, and `/profesionales` redirects to `/`). The code behind its features is kept in `app/profesionales/components` and `app/profesionales/hooks`, plus `app/components/ContactFooterForm.tsx` and `app/api/contact`, because the new home design will need it: search, practice filter, Online/Presencial filter, city filter, map, result counts, "Cargar más", Índice Hara, Destacado mark, welcome box, contact form. No page imports it today.

Also unused: `app/components/ui/RevealOnScroll.tsx` (since the profile redesign) and `app/components/WelcomeModal.tsx` (already unused before). The visual test baseline `home-visual-darwin.png` shows the old home and needs regenerating. The end-to-end tests for the old directory page were deleted (they are in the last commit); they will need rewriting for the new design.

**Idea:** reuse the restored components when the new design arrives, then delete whatever stays unused.

### 12. Ayuda needs a team WhatsApp, office hours and an emergency line

**Found:** 2026-10-02, while building the Ayuda page (`/que-es-hara`).

The design shows a button to write to the team on WhatsApp with office hours, and an always-visible emergency line card. We have no team WhatsApp number, no office hours and no confirmed emergency line for Argentina, so none of them is on the page: the dark card uses the email and Instagram we do have. The design's emergency number (800 911 2000) is an example from another country and must not be used. A wrong crisis number is worse than none.

**Idea:** decide the team WhatsApp number and hours, and confirm an Argentine emergency line (name and number), then add them to the Ayuda page.

### 13. The home filter bar has no "Usar mi ubicación", and some cities look odd

**Found:** 2026-10-05, while building the home search and filters.

The design's Ciudad panel starts with "Usar mi ubicación". It is not there, because the geolocation code lives inside `app/profesionales/components/LocationFilter.tsx` and reusing it means refactoring that component. The Ciudad panel lists the cities in our data instead.

Some of those cities are written as "Banfield, Buenos Aires" or "Colón, Buenos Aires", so the same place can show up twice under different spellings.

**Idea:** move the geolocation code into a small helper and add the button. Clean up the city values when professionals register (for example by saving the city and province separately).

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

## Done

- 2026-10-02: removed the old directory page `/profesionales` but kept its components for the new design (it redirects to `/`), moved sign-up from `/profesionales/registro` to `/registro` (old addresses redirect), and pointed the nav, other pages, emails, docs and tests to the new places.
