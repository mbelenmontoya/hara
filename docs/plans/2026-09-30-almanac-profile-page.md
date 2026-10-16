# Almanac Profile Page (/p/[slug]) Implementation Plan

Created: 2026-09-30
Author: mariabmontoya@gmail.com
Agent: Claude Code
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** The public profile page /p/[slug] looks like the "quiet almanac" design (Claude Design round 7b) on a phone: arch portrait circled by the orbit, serif name and quote, a short facts row, the WhatsApp button, and a floating WhatsApp bar once the main button scrolls away. All existing data and tracking keep working.

## Out of Scope

- Other pages (home 7a is the next plan). The global `SiteHeader` stays as it is; the design's own top bar is not built.
- Diario and Tú screens.
- New profile fields: session length, years of experience and reply time from the design are not shown, because we do not store them.
- Mapping specialties to the four elements (air, fire, water, earth). Specialties show as tiles instead.
- Desktop-specific layout. The page is one centered narrow column on wide screens.

## Approach

**Chosen:** Rewrite the existing `Profile*` components in `app/p/[slug]/components/` in place and re-assemble them in `page.tsx`, with the new fonts scoped to a wrapper class on this page only.
**Why:** Keeps data fetching, tracking and the review form untouched and gives a clean revert (remove the wrapper class). The cost is that the page looks different from the rest of the site until the other pages are redone.

**Decisions already made with the user:**
- Fonts: Instrument Serif and Jost are loaded next to Poppins/Montserrat and used on this page only. The old fonts stay untouched.
- Colors: the design's guessed hexes map to existing tokens (terracotta to `brand`, deep terracotta to `brand-dark`, paper to `background`, card to `gray-50`, muted to `muted`, gold to `warning-dark`, green to `success`, lines to `outline`). No new hexes.
- "Para cuando llegas con" shows the professional's real specialties as tiles.
- Facts row shows only rating, price and availability, each hidden when its data is missing.

## Progress Tracking

- [x] Task 1: Load almanac fonts (scoped) and add the SVG assets
- [x] Task 2: New hero (arch portrait, orbit, pill, name, quote) and facts row
- [x] Task 3: WhatsApp button restyle and floating bar on scroll
- [x] Task 4: Body sections restyle and page assembly

## Implementation Tasks

### Task 1: Load almanac fonts (scoped) and add the SVG assets

**Objective:** Make Instrument Serif and Jost available only to this page, and copy the brand SVGs the design uses into the repo. Nothing else on the site changes font.

**Files:**

- Modify: `app/layout.tsx` (+ `app/layout.test.ts` font mock)
- Modify: `app/globals.css` (unlayered `.font-almanac` / `.font-almanac-serif` so they beat the global h1-h6 font rule)
- Create: `public/assets/almanac/orbita_punteada-primary.svg` (`isotipo-ink.svg` dropped: only the design's own top bar used it, which is out of scope. `destello-primary.svg` dropped: the exported file renders as a dot even in the original upload, so the pill uses an inline sparkle; the design file needs re-exporting)

**Key Decisions / Notes:**

- In `app/layout.tsx` add `Instrument_Serif` (weight 400, styles normal and italic, variable `--font-instrument`) and `Jost` (weights 400, 500, 600, variable `--font-jost`) next to Poppins/Montserrat (`layout.tsx:1-20`), and add both variables to the `<html>` className. Leave Poppins/Montserrat exactly as they are.
- In `app/globals.css` add to `@theme` two font tokens (`--font-almanac`, `--font-almanac-serif`) that point at those variables, so utilities `font-almanac` and `font-almanac-serif` exist. Do not touch `body` or `h1..h6` rules (`globals.css:116-131`). To go back: delete the wrapper class on the page.
- SVGs: fetch each from the Claude Design project `d0e3236f-a77b-4d60-b083-b3dd4cdd9da2` with `DesignSync get_file` (path `assets/<name>`), write the content into `public/assets/almanac/`, and open each file to confirm it is valid SVG. Filenames are kept identical to the design.
- Tailwind v4: tokens live in `@theme`, not `theme.extend` (`.claude/rules/tailwind-tokens.md`).

**Definition of Done:**

- [ ] `npm run build` succeeds and the profile page HTML references `--font-instrument` and `--font-jost`
- [ ] The three SVG files exist under `public/assets/almanac/` and start with `<svg`
- [ ] Other pages (for example `/profesionales`) still render in Poppins/Montserrat
- [ ] Verify: `npm run build && head -c 60 public/assets/almanac/*.svg`

### Task 2: New hero (arch portrait, orbit, pill, name, quote) and facts row

**Objective:** Replace the glass hero card with the almanac hero: arch-shaped portrait with the dotted orbit, a "DESTACADA" pill when featured, the name in serif, one line with practice and place, the short description as an italic quote, and a three-column facts row. This is verified by TS-001.

**Files:**

- Modify: `app/p/[slug]/components/ProfileHero.tsx`
- Create: `app/p/[slug]/components/ProfileFacts.tsx`
- Modify: `app/p/[slug]/components/ProfileHero.test.tsx`
- Test: `app/p/[slug]/components/ProfileFacts.test.tsx`

**Key Decisions / Notes:**

- Portrait box 236x282, `border-radius: 118px 118px 26px 26px`, `object-cover`; no photo: show the initial on a `bg-brand-weak` arch (same fallback as today, `ProfileHero.tsx:33-42`). Only `http` image URLs are used, as today.
- Orbit image `/assets/almanac/orbita_punteada-primary.svg` absolutely positioned top right, `aria-hidden`, decorative `alt=""`. Pill `DESTACADA` with the `destello-primary.svg` icon keeps `data-testid="destacado-chip"` (existing test and e2e rely on it).
- Line under the name: first practice label, then location, separated by dots. `ProfileHero` gets a new optional prop `primaryPractice: string | null`, passed from `page.tsx` (`practiceLabels[0]`). The quote only renders when `short_description` exists.
- `ProfileFacts` props: `ratingAverage`, `ratingCount`, `priceMin`, `priceMax`, `currency`, `acceptingNewClients`. Rating shows when `ratingCount > 0`; price shows when `priceMin` is set (single value when min equals max or max is null, otherwise a range); availability shows "Abierta / acepta gente" only when accepting. The row renders nothing when all three are missing. Grid uses one column per visible fact, so two facts do not leave a gap.
- `page.tsx` must select and pass `price_range_min/max` and `currency`; they are already selected and in `Professional` (`page.tsx:30`, `types.ts`), so no query change.
- Keep the review count text format `N reseña(s)` with singular for 1 (existing test asserts it). Move that assertion to `ProfileFacts.test.tsx` and keep `ProfileHero.test.tsx` for name, quote, pill and fallback initial.
- Why >2 test classes: not needed; one test file per component.

**Definition of Done:**

- [ ] Hero shows name in `font-almanac-serif`, quote only when `short_description` is set, pill only when `isDestacado`
- [ ] Facts row hides each fact whose data is missing and hides entirely when all are missing; "1 reseña" is singular
- [ ] A price of `850` with currency `ARS` renders as a formatted amount, and a min/max pair renders as a range (asserted exactly, not truthy)
- [ ] Verify: `npx vitest run --project unit app/p/\[slug\]/components/ProfileHero.test.tsx app/p/\[slug\]/components/ProfileFacts.test.tsx`

### Task 3: WhatsApp button restyle and floating bar on scroll

**Objective:** Show the main "Escribirle por WhatsApp" button and an Instagram shortcut under the facts row, and add a floating WhatsApp bar at the bottom that appears only after the main button has scrolled out of view. Every click keeps firing the same tracking events as today.

**Files:**

- Modify: `app/p/[slug]/components/ProfileContact.tsx`, `app/components/ContactButton.tsx` (+ its test)
- Create: `app/p/[slug]/components/ProfileStickyCta.tsx`
- Modify: `app/p/[slug]/components/ProfileContact.test.tsx`

**Key Decisions / Notes:**

- `ProfileContact` keeps `ContactButton` (`ProfileContact.tsx:60-68`) with the same props and `onBeforeNavigate` event. `ContactButton` gets one optional, backwards-compatible prop `unstyled` (drops its default look so the caller styles it without `!important`); the `/r/` cards are unaffected. The button text stays "Contactar por WhatsApp" because it is owned by `ContactButton`; changing the wording to "Escribirle por WhatsApp" is a separate decision and is listed in Open Questions.
- Instagram becomes a square `bg-surface-2` button labelled `IG` next to the main button (keeps `instagram_click` event and the `normalizeInstagram` helper). The email link stays in this component as a small line under the buttons (kept from commit `86b661b`); email and WhatsApp still render only when present (recent commit `86b661b`).
- `ProfileStickyCta` is a client component: `IntersectionObserver` on the main button wrapper (passed as a ref id), fixed at the bottom with `bg-gray-50/90 backdrop-blur`, `opacity/translate` transition, `pointer-events-none` while hidden. Uses `ContactButton` again with the same tracking props. Respects reduced motion by skipping the transition. The page bottom gets padding so the bar never covers the last section.
- Only one of the two buttons is interactive at a time.

**Definition of Done:**

- [ ] Clicking the main button calls `fireProfileEvent('whatsapp_click', slug)` exactly once; clicking IG calls `instagram_click`
- [ ] No WhatsApp button and no floating bar when `whatsapp` is empty; no IG button when `instagram` is null
- [ ] Floating bar is hidden while the main button is visible and shown after it leaves the viewport (covered by TS-002)
- [ ] Verify: `npx vitest run --project unit app/p/\[slug\]/components/ProfileContact.test.tsx`

### Task 4: Body sections restyle and page assembly

**Objective:** Restyle the rest of the page in the almanac look and re-assemble it: specialties as tiles, "Sobre mí", a rows list (service, modality, where, email), location map, reviews as quote cards, the author's notes and the review form. All data and behavior stay as they are. This is verified by TS-001 and TS-003.

**Files:**

- Modify: `app/p/[slug]/page.tsx`
- Modify: `app/p/[slug]/components/ProfileDetails.tsx` (tiles + new `ProfileDetailRows` export), `ProfileAbout.tsx`, `ProfileLocation.tsx`, `ProfileReviews.tsx`, `ProfilePosts.tsx`, `ProfileReviewForm.tsx`
- Modify: `app/p/[slug]/components/ProfileDetails.test.tsx`

**Key Decisions / Notes:**

- `page.tsx`: wrap everything in `<div className="font-almanac ...">` (the scoped font switch) and use a single centered column (`max-w-md` on phones, `md:max-w-xl` centered). Remove the two-column `lg:grid` blocks (`page.tsx:126-176`). Keep `PageBackground` removed only if it fights the flat paper color; otherwise keep it. Keep `ProfileViewTracker`, the `from` back link logic (`page.tsx:106-108`) and the privacy sentence. Back link becomes a round `bg-surface-2` button with the arrow, same `aria-label` and `href`.
- Section order: hero, facts, CTA, "PARA CUANDO LLEGAS CON" tiles, "Sobre mí" (serif heading with italic word), rows list, location (presencial only), "Quienes ya fueron" reviews, notes, review form.
- Tiles reuse `SPECIALTY_COLORS` (`lib/design-constants.ts:99-112`) for background and text, with a small inline triangle glyph (`currentColor`) in place of the design's element SVGs. Practices render as neutral tiles (`bg-surface-2`). Headings use `font-almanac-serif`; small labels use `font-almanac` with wide tracking and `text-muted`.
- Reviews: cards `bg-gray-50 rounded-3xl`, italic serif quote, name, date and stars in `text-warning-dark`. Keep `data-testid="reviews-card"` and the `ratingCount === 0` hide rule. Keep `"Anónimo"` fallback and `es-AR` date format.
- Rows list replaces `Tipo de servicio` and `Modalidad` blocks; it only shows rows with data. `ProfileDetails` props stay the same plus `location` and `email`, so `page.tsx` passes them in. Update `ProfileDetails.test.tsx` to the new markup; do not loosen assertions, add a case for the email and location rows.
- Files stay under 300 lines; no `console.log`; errors via `lib/monitoring.ts` if any are added. Spanish copy uses vos.
- `ProfileReviewForm.tsx` (140 lines) only changes classes, not logic. `ProfileExpertise.tsx` and `ProfileLogistics.tsx` are not imported by `page.tsx`; leave them alone.

**Definition of Done:**

- [ ] `/p/<slug>` renders every section above in order for a fully filled professional, and skips sections whose data is empty (no empty headings)
- [ ] Specialty tiles show the Spanish label from `SPECIALTY_MAP` with its existing color; custom (non-curated) specialties fall back to neutral
- [ ] Online-only professionals show no map section; presencial ones do
- [ ] Full unit suite passes and lint is clean
- [ ] Verify: `npm run test:unit && npm run lint && npm run build`

## E2E Test Scenarios

### TS-001: Full profile on a phone
**Priority:** Critical
**Preconditions:** Dev server running, an active professional with photo, short description, specialties, price, bio and reviews; viewport 390x844
**Mapped Tasks:** Task 2, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/p/<slug>` | Arch portrait with the dotted orbit, serif name, italic quote, facts row; fonts are Instrument Serif and Jost |
| 2 | Scroll to the end | Specialty tiles, "Sobre mí", rows, reviews as quote cards, review form, privacy sentence; no horizontal scroll |
| 3 | Open `/profesionales` | Still in Poppins/Montserrat (unchanged) |

### TS-002: Floating WhatsApp bar
**Priority:** Critical
**Preconditions:** Same professional with a WhatsApp number
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the page at the top | Only the main button is visible; no floating bar |
| 2 | Scroll until the main button leaves the screen | Floating bar fades in at the bottom and does not cover the last section |
| 3 | Click the floating bar | WhatsApp link opens in a new tab and a `contact_click` and `whatsapp_click` request is sent |

### TS-003: Sparse profile
**Priority:** High
**Preconditions:** An online-only professional with no photo, no short description, no reviews and no price
**Mapped Tasks:** Task 2, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the page | Initial on a blush arch, no quote, no facts row, no map, no reviews section; nothing looks broken or empty |

## Open Questions

- The WhatsApp button text comes from the shared `ContactButton` ("Contactar por WhatsApp"); the design says "Escribirle por WhatsApp". Changing it affects the `/r/` cards too, so it is left as is unless you say otherwise.
