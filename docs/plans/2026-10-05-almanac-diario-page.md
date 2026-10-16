# Almanac Diario Page Implementation Plan

Created: 2026-10-05
Author: mariabmontoya@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** `/blog` (the list) and `/blog/[slug]` (one article) look like the almanac Diario (Claude Design 9e) on a phone, filled only with real data from `blog_posts`.

## Out of Scope

- **Category chips and the element tag ("Para tierra").** `blog_posts` has no category and no element, so both are left out, not invented.
- **Pull quote.** No post has one. Body `<blockquote>` gets the pull-quote look so it shows if an author ever writes one, but nothing is added to the posts.
- **The author's practice line and color dot.** Posts have no practice. All 3 published posts are Hara editorial.
- **The bottom nav bar.** The user asked to skip it.
- **`/blog/escribir`.** The submission form keeps its current look and its header.
- **Dates.** The design shows no date, so it is dropped from both pages.

## Approach

**Chosen:** Keep each `page.tsx` as the server page that queries Supabase. Move the markup into two presentational components, `app/blog/DiarioList.tsx` and `app/blog/[slug]/DiarioArticle.tsx`, with a small pure helper `lib/diario.ts`. This follows the home page, where `app/page.tsx` fetches and the `Home*.tsx` components render.
**Why:** The components can be unit tested with plain props, with no Supabase mocking. The cost is two more files.

## Context for Implementer

**Design source.** The markup is the `id="9e"` block of Claude Design round 9, saved at `/private/tmp/claude-501/-Users-belenmontoya-Desktop-repos-hara/875ffcad-5322-4d16-838a-e262c9b802f7/scratchpad/diario-9e.html`. The full round is in `t9.html` in `.../7176b110-1cbb-4c91-9f1a-086c78d014f5/scratchpad/`. Copy the layout, sizes and spacing exactly. Never use the design's text or placeholder data.

**Colors.** Map the design's colors to the existing tokens and add no new hex values:

| Design | Token |
|--------|-------|
| `#F7EDE8` | `bg-background` |
| `#221E29` | `foreground` |
| `#5E5550` | `gray-700` |
| `#7B706B` | `muted` |
| `#2E282D` | `gray-800` |
| `#B57261` | `brand` |
| `#7B4238` | `brand-dark` |
| `#EACCC1` | `brand-weak` |
| hairlines `rgba(34,30,41,.12)` | `border-foreground/12` |

**Fonts and global CSS gotchas.**
- Use `font-almanac`, `font-almanac-serif` and `almanac-label` from `app/globals.css`.
- The global `h1..h6` rule is unlayered and beats Tailwind utilities, so headings need the almanac classes.
- Global `p + p` adds 16px between adjacent paragraphs, so use spans or divs in compact rows.
- Reuse `Sparkle` from `app/HomeCardParts.tsx`. The exported `destello` SVG renders as a dot.
- Copy the dark card's look from `app/HomeConcierge.tsx`.

**Copy.** Argentine vos only. The design uses tú ("Escríbele", "Sigue leyendo"), so convert it.

**Data facts (checked 2026-10-05).**
- There are 3 published posts. All are Hara editorial (`is_hara_editorial`), and 2 have a cover.
- None has a secondary image, a confirmed professional, or a `<blockquote>`.
- Every `excerpt` is the start of the body. Showing it as the dek above the body would print the same sentence twice, so the article page shows no dek (the list does).
- Body HTML uses `p`, `h2`, `ul/li`, `strong` and `em`.
- There is no Tailwind typography plugin, so the current `prose` classes do nothing.

## Autonomous Decisions

These were made without questions, per the standing rule. They are listed so they can be checked in review.

- **List heading.** The title is "Diario". The subtitle stays our current sentence ("Perspectivas sobre bienestar holístico escritas por profesionales y personas de la comunidad de Hara.") because the design's line is placeholder copy.
- **Meta label.** The design shows "categoría · N min". With no category, the label is "N min de lectura".
- **Featured article.** The newest post is shown big, and the rest go in the rows. If a post has no cover, its image block is left out (no grey box).
- **Author.**
  - Editorial posts show "Hara Vital" with the isotipo as the avatar (as today).
  - Other posts show `author_name`.
  - A confirmed professional's `profile_image_url` is the avatar when present.
- **Dark card on the article ("Si esto te sonó").**
  - With a confirmed active professional: "Escribile a *{first name}*, o pedinos tres opciones.", with buttons "Ver perfil" (`/p/{slug}`) and "Concierge" (`/solicitar`).
  - Without one (all current posts): "Contanos y te elegimos *tres* opciones.", with only the "Concierge" button.
  - This replaces the old "Escrito por" card and the "Ver perfil de …" meta link.
- **"Seguí leyendo".** It shows the next older published post, wrapping to the newest. It is hidden when there is only one post.
- **Back button.** The round "←" button links to `/blog` and has `aria-label="Volver al Diario"`. Without a cover, it sits in the page flow at the top. It replaces the breadcrumb and the "← Ver más notas" link.
- **Writing link.** "¿Tenés algo para compartir? Escribí una nota →" stays at the end of the list as a quiet text link, and the empty state is kept. This keeps the only way into `/blog/escribir`.
- **Site header.** It is hidden on `/blog` and `/blog/{slug}`, like the other almanac pages, but kept on `/blog/escribir`. Its nav label "Notas" becomes "Diario".

## Progress Tracking

- [x] Task 1: Diario helpers (reading time, next post)
- [x] Task 2: Diario list page
- [x] Task 3: Diario article page
- [x] Task 4: Site header and browser check

## Implementation Tasks

### Task 1: Diario helpers (reading time, next post)

**Objective:** Two pure functions both pages need. One gives an article's reading time in minutes from its HTML. The other picks which post "Seguí leyendo" points to.

**Files:**

- Create: `lib/diario.ts`
- Test: `lib/diario.test.ts`

**Key Decisions / Notes:**

- Reading time: `readingMinutes(html: string): number`.
  - Strip tags, split on whitespace and count the words.
  - Return `Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))` with `WORDS_PER_MINUTE = 200`.
  - Empty or tag-only HTML returns 1.
- Next post: `nextPost<T extends { slug: string }>(posts: readonly T[], slug: string): T | null`.
  - `posts` is newest first. Return the one after `slug`, wrapping to the first.
  - Return `null` when there are fewer than 2 posts or `slug` is not in the list.

**Definition of Done:**

- [ ] `readingMinutes` returns 1 for "" and for `<p></p>`, 1 for 200 words, 2 for 201 words, and ignores words inside tags (`<a href="uno dos">tres</a>` counts as 1 word)
- [ ] `nextPost` returns the following post, wraps from the last to the first, and returns `null` for a single post or an unknown slug
- [ ] Verify: `npx vitest run --project unit lib/diario`

### Task 2: Diario list page

**Objective:** Rebuild `/blog` as the 9e list. It has the serif "Diario" title and our subtitle, the newest post as a large featured article, and the rest as hairline rows with a thumbnail. Verified by TS-001.

**Files:**

- Create: `app/blog/DiarioList.tsx`
- Create: `app/blog/DiarioList.test.tsx`
- Modify: `app/blog/page.tsx`

**Key Decisions / Notes:**

- `page.tsx` keeps its query and adds `body_html` to the select. It maps each row to `{ slug, title, excerpt, authorLabel, coverUrl, minutes, isEditorial }` (minutes come from `readingMinutes`) and renders `<DiarioList posts={...} />`.
  - Drop `PageBackground`, `GlassCard` and `formatDate`.
  - Wrap the page in `font-almanac bg-background min-h-screen`, centered in a `max-w-md` column, widening to `md:max-w-2xl` (as on Ayuda).
  - Change the metadata title to "Diario | Hara Vital" and keep the description.
  - Handle a Supabase error: if the query returns `error`, call `logError` and render the empty state. Do not hide the error silently.
- Header block (design lines 7 to 8):
  - `h1.font-almanac-serif` 44px/1, tracking -0.6px, with top padding sized for a page that has no site header.
  - Subtitle in Jost 14.5px/1.5 `text-gray-700`, `mt-2`.
- Featured block (design lines 12 to 21). The whole block is a `<Link href="/blog/{slug}">`.
  - Cover: 240px high, `rounded-3xl`, `object-cover`.
  - Meta: `almanac-label` "N min de lectura".
  - Title: serif 32px/1.05.
  - Excerpt: 15px/1.55 `text-gray-700`.
  - Author: 13px `text-gray-700`, with the isotipo (`/assets/logo/isotipo.png`, 14px) when editorial.
- Rows (design lines 24 to 37), one `<Link>` each:
  - The list sits under a `border-t` hairline, and each row is `py-4` with a `border-b` hairline.
  - Thumbnail: 86×98, `rounded-2xl`, only when there is a cover.
  - Meta label, serif 21px/1.12 title, and the author in 12px `text-muted`.
- End link: "¿Tenés algo para compartir? Escribí una nota →" to `/blog/escribir`, `text-brand`, below the rows.
- Empty state: keep the current `EmptyState` with its "Escribir una nota" action. It is used when there are 0 posts.

**Definition of Done:**

- [ ] With 3 posts, the first is the featured link (its title in the large serif and its excerpt shown), and the other two are row links. Every link goes to `/blog/{slug}`
- [ ] Each post shows "N min de lectura" with its own N, and "Hara Vital" with the isotipo for editorial posts
- [ ] A post without a cover renders no `<img>` for the cover, and a post with one renders it with `alt=""`
- [ ] With 0 posts, the empty state and its `/blog/escribir` link show. No category chips, element tag or date are rendered
- [ ] Verify: `npx vitest run --project unit app/blog/DiarioList`

### Task 3: Diario article page

**Objective:** Rebuild `/blog/[slug]` as the 9e article view. It has the cover with a round back button, the meta and serif title, the author row, the body in the almanac reading style, the dark "Si esto te sonó" card and "Seguí leyendo". Verified by TS-002.

**Files:**

- Create: `app/blog/[slug]/DiarioArticle.tsx`
- Create: `app/blog/[slug]/DiarioArticle.test.tsx`
- Modify: `app/blog/[slug]/page.tsx`
- Modify: `app/globals.css`

**Key Decisions / Notes:**

- `page.tsx` keeps the post query, the 404 handling and the confirmed-professional lookup, and adds `profile_image_url` to that select.
  - Add one query for published `slug, title` ordered by `published_at desc`, so `nextPost` can pick the next article.
  - If that second query errors, call `logError` and pass `next = null`.
  - Pass the props to `<DiarioArticle>`, and drop `PageBackground` and `formatDate`.
- Cover (design lines 50 to 52):
  - 330px high and full width, with no rounding at the top of the page.
  - Back `Link`: 40px circle at `left-5 top-[58px]`, `bg-gray-50/90`, "←", `aria-label="Volver al Diario"`.
  - With no cover, the same button sits in the flow at the top.
- Text block (design lines 53 to 60):
  - The column has `px-6 pt-[22px]`.
  - Meta is `almanac-label` "N min de lectura".
  - The title is an `h1.font-almanac-serif` at 38px/1.02.
  - There is no dek, because the excerpt repeats the body's first line.
- Author row: a hairline top and bottom with `py-3.5`.
  - The avatar is 38px round: the isotipo for editorial posts, otherwise the professional's photo when present, otherwise no avatar.
  - The name is in 14px medium.
- Body: `dangerouslySetInnerHTML` stays (body is sanitized at write time).
  - Wrap it in a new unlayered `.diario-body` block in `globals.css`, placed after the global heading rules so it wins.
  - `p` and `li` are Jost 17px/1.75 `--color-gray-800`, with 18px between blocks (this overrides `p + p`).
  - `h2` is Instrument Serif 26px/1.15 with `margin-top: 28px`.
  - `ul` has a disc and left padding.
  - `strong` is 500.
  - `blockquote` gets the pull-quote look (design lines 63 to 66): terracotta top and bottom hairlines, 22px padding, Instrument Serif italic 26px/1.25 `--color-brand-dark`.
  - The secondary image, when present, follows the body as today, `rounded-2xl`.
- Dark card (design lines 69 to 76, look of `HomeConcierge`): the `almanac-label`-style "Si esto te sonó" in `text-brand-weak`, then the serif 26px/1.1 heading and buttons as in Autonomous Decisions. "Ver perfil" is `bg-brand-weak text-brand-dark rounded-[13px]`, and "Concierge" is outlined `border-background/30`.
- "Seguí leyendo" (design lines 77 to 80): the label, the next post's serif 24px title and a `text-brand-dark` "→", all as one `Link`, hidden when `next` is null.

**Definition of Done:**

- [ ] The article shows its title as the h1, "N min de lectura", the body HTML and "Hara Vital" with the isotipo for an editorial post. It does not show the excerpt as a separate paragraph
- [ ] The back button links to `/blog` with the label "Volver al Diario", with and without a cover
- [ ] With a confirmed professional, the dark card says "Escribile a {first name}" and links "Ver perfil" to `/p/{slug}` and "Concierge" to `/solicitar`. Without one, it shows only the Concierge link and no "Ver perfil"
- [ ] "Seguí leyendo" links to the next post's slug with its title, and is absent when `next` is null
- [ ] Verify: `npx vitest run --project unit app/blog`

### Task 4: Site header and browser check

**Objective:**
- Hide the global header on the two Diario pages, the way the other almanac pages do, while `/blog/escribir` keeps it.
- Rename its "Notas" link to "Diario".
- Check both pages in Chrome with real data.

**Files:**

- Modify: `app/components/SiteHeader.tsx`
- Modify: `app/components/SiteHeader.test.tsx`

**Key Decisions / Notes:**

- Hide rule: also return null when `pathname === '/blog'`, or when the path starts with `/blog/` and is not `/blog/escribir`. Update the file's top comment.
- Test updates:
  - Add `/blog` and `/blog/algo` to the hidden list in the test at `SiteHeader.test.tsx:70`.
  - Add one test that `/blog/escribir` still renders the header.
  - Change the two `'Notas'` link assertions (lines 59 and 65) to `'Diario'`.
- Browser check:
  - Dev server: `npx next dev -p 3000`, with the PID saved to `/tmp/hara-dev.pid`, unless one is already running.
  - Use Claude in Chrome at about 390px wide, and wait about a second after navigating before clicking.

**Definition of Done:**

- [ ] The header is hidden on `/blog` and on article pages, and visible on `/blog/escribir`. The nav link reads "Diario"
- [ ] TS-001 and TS-002 pass in the browser with real posts
- [ ] Verify: `npm run test:unit && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/"`

## E2E Test Scenarios

### TS-001: Diario list on a phone
**Priority:** Critical
**Preconditions:** Dev server on port 3000, viewport about 390px, 3 published posts
**Mapped Tasks:** Task 2, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/blog` | No site header. Serif "Diario" title, our subtitle, the newest post large with its cover, "N min de lectura", title, excerpt and "Hara Vital". No horizontal scroll |
| 2 | Look below the featured post | Two hairline rows, each with meta, serif title and author. The thumbnail shows only for the post that has a cover. Then the "Escribí una nota" link |
| 3 | Tap a row | Opens `/blog/{that slug}` |

### TS-002: Reading an article
**Priority:** Critical
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 3, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the article that has a cover | Full-width cover with the round "←" button, meta, serif title, the author row with the isotipo, and the body with serif h2s and 17px text. The first sentence is not repeated |
| 2 | Scroll to the end | Dark "Si esto te sonó" card with a Concierge link to `/solicitar`, then "Seguí leyendo" with the next post's title |
| 3 | Tap "Seguí leyendo" | Opens that post |
| 4 | Tap "←" | Back on `/blog` |
| 5 | Open `/blog/escribir` | The site header is shown and its nav says "Diario" |

## Deviations

- The back button on the cover sits at `top-5` (20px), not the design's `top-[58px]`. The design's 58px makes room for the iPhone status bar inside its frame, and the web page has no status bar.

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 0 | Checked in Chrome with the 3 real posts. Header hidden, featured post with cover, two rows (thumbnail only on the post with a cover), "Escribí una nota" link |
| TS-002 | Critical | PASS | 0 | Article with cover, back button, serif h2s in the body, dark card with Concierge only, "Seguí leyendo" wraps from the oldest to the newest post and opens it, back button returns to `/blog`, the post without a cover shows the back button in the flow, `/blog/escribir` keeps the header with "Diario" in the nav |

## Verification Notes

- Unit suite: 95 files, 670 tests passed. `tsc` has no errors in `app` or `lib`.
- Not verified: the 390px phone width in Chrome. The window resize did not take effect (the viewport stayed at 1512px), so the check ran at desktop width inside the `md:max-w-xl` column.
- Not run: `npm run build` (known to fail on the `vitest.workspace.ts` type conflict) and `next lint` (the project has no ESLint config). Both are already listed in ISSUES.md.
- The old dev server (from 2026-10-02) returned 500 on every page. It was stopped by its recorded PID and restarted; the new PID is in `/tmp/hara-dev.pid`.
- Bug mutations caught by the new tests: 5 in `lib/diario.ts`, 8 in `DiarioList`, 12 in `DiarioArticle`, 3 in `SiteHeader`.
