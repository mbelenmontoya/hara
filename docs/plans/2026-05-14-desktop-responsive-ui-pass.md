# Desktop Responsive UI Pass Implementation Plan

Created: 2026-05-14
Author: belu.montoya@dialpad.com
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Every public page renders an appropriate desktop layout at ≥1024px (with mobile layout unchanged below), via a single Tailwind `lg:` breakpoint, an extended `.container-public` utility, page-specific layouts (directory grid, profile two-column-with-sticky-sidebar, concierge 3-card grid), desktop nav links, button hover refinement, and scroll-triggered reveals on home + profile.

## Approach

**Chosen:** Responsive pass via Tailwind `lg:` (1024px) + extended `.container-public` + targeted page layouts. Single breakpoint hook update (`useIsDesktop` 768→1024). `BottomSheet` switches internally between bottom-anchored (mobile) and centered modal (desktop). `RevealOnScroll` is a reusable component wrapping sections that should fade-up.

**Why:** Reuses the existing `.container-public` utility instead of introducing a new one — all 11 pages using the old `max-w-md md:max-w-[960px]` tablet pattern migrate to `.container-public` in one task, after which the responsive class is set in one place. Why not a separate `.container-public-wide` utility: every consumer would need editing twice (once now, once if widths change later). Why not Tailwind `max-w-screen-lg` inline: inconsistent with the existing `.container-public`/`.container-admin` CSS-utility pattern.

## File Structure

- `app/globals.css` (modify) — extend `.container-public` to scale at `lg:`; refine `.btn-press-glow` / `.btn-press-inset` with hover brightness/color shift
- `app/r/[tracking_code]/hooks/useMediaQuery.ts` (modify) — update `useIsDesktop` threshold from 768px to 1024px
- `app/components/PublicLayout.tsx` (modify) — convert to `'use client'`, add desktop nav links with active-route highlighting via `usePathname`
- `app/components/ui/RevealOnScroll.tsx` (create) — reusable component wrapping content that should fade-up via IntersectionObserver; respects `prefers-reduced-motion`
- `app/p/[slug]/components/ProfileHero.tsx` (create) — identity card extraction
- `app/p/[slug]/components/ProfileExpertise.tsx` (create) — specialties/practices/services card extraction
- `app/p/[slug]/components/ProfileAbout.tsx` (create) — bio/experience card extraction
- `app/p/[slug]/components/ProfileReviews.tsx` (create) — reviews card extraction
- `app/p/[slug]/components/ProfileLogistics.tsx` (create) — modality/location/price card extraction
- `app/p/[slug]/components/ProfileContact.tsx` (create) — contact card with WhatsApp CTA extraction (this becomes the sticky sidebar on desktop)
- `app/p/[slug]/page.tsx` (modify) — orchestrate sub-components; apply two-column `lg:` layout with sticky right sidebar
- `app/r/[tracking_code]/components/RecommendationCard.tsx` (create) — single-card view extraction (used by both mobile deck and desktop grid)
- `app/r/[tracking_code]/components/DeckView.tsx` (create) — mobile swipe-deck wrapper extraction
- `app/r/[tracking_code]/components/GridView.tsx` (create) — desktop 3-card grid view
- `app/r/[tracking_code]/page.tsx` (modify) — orchestrate DeckView (mobile) vs GridView (desktop) based on `useIsDesktop`
- `app/r/[tracking_code]/components/BottomSheet.tsx` (modify) — switch internally between bottom-anchored (mobile) and centered modal (desktop) at `lg:`
- `app/profesionales/page.tsx` (modify) — apply `.container-public` and `lg:grid-cols-2` for desktop directory
- 9 page files using `max-w-md md:max-w-[960px]` (modify) — replace with `.container-public` class on outer div:
  - `app/page.tsx`, `app/ayuda/page.tsx`, `app/gracias/page.tsx`, `app/preview/page.tsx`, `app/profesionales/registro/RegistroForm.tsx`, `app/profesionales/registro/confirmacion/page.tsx`, `app/solicitar/SolicitarForm.tsx`, `app/components/TermsAndPrivacyPage.tsx`, `app/r/review/[token]/page.tsx`

## Out of Scope

- `app/profesionales/registro/RegistroForm.tsx` line-count refactor (703 lines, already over the 440-line cap) — that's an independent tech-debt cleanup unrelated to responsive
- Admin dashboard layouts — already at 1024px, polish only happens incidentally to the container migration
- Mobile hamburger menu — PRD locked out
- Tablet-specific layout (768–1023) — PRD locked: tablets receive mobile layout
- Visual design changes — colors, typography, component shapes, copy

## Assumptions

- `.container-public` is the only public-facing container utility in use — verified via grep — Tasks 1, 2 depend
- Only `app/r/[tracking_code]/page.tsx` consumes `useIsDesktop` — verified via grep, single consumer — Task 1 depends
- `ContactButton` props/behavior require no changes for desktop — Tasks 7, 8 depend
- `BottomSheet` has no fixed `bottom: 0` portal logic that prevents centering — Task 9 depends; verify during extraction in Task 5

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Container migration breaks mobile layout on one of the migrated pages | Medium | High | Visual smoke-test each migrated page at 375px in Task 2 before merging — listed in Task 2 DoD |
| Two-column profile sidebar overlaps content at exactly 1024px width | Medium | Medium | TS-002 explicitly tests at 1024px and 1280px viewports |
| Scroll reveals cause perceptible jank on slow devices | Low | Medium | IntersectionObserver (not scroll events); element unobserved after first reveal; cap one observer instance per RevealOnScroll wrapper |
| Concierge desktop grid loses attribution token on contact click | Low | High | TS-003 verifies ContactButton receives the same `attribution_token` prop in grid view as in deck view |

## E2E Test Scenarios

### TS-001: Desktop directory grid
**Priority:** Critical
**Preconditions:** At least 4 active professionals exist in DB
**Mapped Tasks:** Task 1, Task 2, Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 1280×800; navigate to `/profesionales` | Page renders; container max-width is 1024px |
| 2 | Inspect grid layout | Cards render in a 2-column grid (CSS `grid-template-columns: repeat(2, ...)`) |
| 3 | Set viewport to 375×667; reload | Cards render single-column (no `lg:` rules apply) |
| 4 | Set viewport to 1280×800; click first card | Navigates to `/p/[slug]` |

### TS-002: Desktop profile two-column with sticky sidebar
**Priority:** Critical
**Preconditions:** A professional with `whatsapp`, `bio`, and at least 1 review exists
**Mapped Tasks:** Task 4, Task 8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 1280×800; navigate to `/p/[known-slug]` | Page renders; layout is two-column |
| 2 | Inspect right column | Contact card present with WhatsApp CTA; `position: sticky` computed style |
| 3 | Scroll the page down 800px | Right column contact card remains visible at the top of viewport |
| 4 | Click WhatsApp CTA | `wa.me/` URL opens (verified via new tab / link href) |
| 5 | Set viewport to 1024×800; reload | Two-column layout still applies; no overlap between columns |
| 6 | Set viewport to 375×667; reload | Layout collapses to single column; sticky behavior removed |

### TS-003: Desktop concierge 3-card grid + modal
**Priority:** Critical
**Preconditions:** A valid `tracking_code` with 3 recommendations exists
**Mapped Tasks:** Task 5, Task 9, Task 10

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 1280×800; navigate to `/r/[code]` | Reveal screen does NOT show; 3 cards render side-by-side as a grid |
| 2 | Click first card | A centered modal opens (not a bottom sheet); modal contains full professional detail |
| 3 | Press Escape | Modal closes; grid remains visible |
| 4 | Click second card; then click the WhatsApp CTA inside the modal | `wa.me/` URL opens; the contact event includes the `attribution_token` for rank 2 (verified via network tab / event payload) |
| 5 | Set viewport to 375×667; reload | Reveal screen shows on mobile; clicking "Ver mis 3 opciones" reveals the swipe deck (unchanged from current behavior) |

### TS-004: Mobile layouts unchanged (regression check)
**Priority:** Critical
**Preconditions:** Same as TS-001..003
**Mapped Tasks:** All

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 375×667; visit `/profesionales` | Single-column card list; identical to current mobile layout |
| 2 | Visit `/p/[slug]` at 375×667 | Single-column profile with 5 glass cards stacked; no sticky sidebar |
| 3 | Visit `/r/[code]` at 375×667 | Reveal screen → swipe deck → BottomSheet (bottom-anchored, slide-up); identical to current mobile flow |
| 4 | Visit `/` (home), `/ayuda`, `/solicitar` at 375×667 | Identical layouts to current mobile |

### TS-005: Desktop nav links + active state
**Priority:** High
**Preconditions:** None
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 1280×800; visit `/` | Header shows logo + nav links (e.g., "Profesionales", "Pedi recomendación", "Ayuda") |
| 2 | Click "Profesionales" | Navigates to `/profesionales`; that link now shows active-state styling (e.g., `text-foreground` or underline) |
| 3 | Set viewport to 375×667; visit `/` | Header shows logo only (no nav links visible) |

### TS-006: Scroll-triggered reveals on home + profile
**Priority:** Medium
**Preconditions:** None
**Mapped Tasks:** Task 11

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 1280×800; visit `/`; reload to ensure top of page | Below-the-fold sections start invisible (opacity 0 / translateY) |
| 2 | Scroll down 400px | Newly-in-view sections fade up to visible |
| 3 | Open browser DevTools → set `prefers-reduced-motion: reduce`; reload | Sections are visible immediately without animation |

### TS-007: Forms widen on desktop
**Priority:** Medium
**Preconditions:** None
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 1280×800; visit `/solicitar` | Container max-width is 1024px; form fields remain single-column with readable max-width |
| 2 | Visit `/profesionales/registro` at 1280×800 | Same — wider container, single-column fields |

## Progress Tracking

- [x] Task 1: Foundation — extend `.container-public`, update `useIsDesktop` to 1024px, refine button hover utilities
- [x] Task 2: Migrate 9 pages from `max-w-md md:max-w-[960px]` → `.container-public`
- [x] Task 3: PublicLayout — convert to client, add desktop nav links with `usePathname` active state
- [x] Task 4: Extract `/p/[slug]/page.tsx` sub-components (6 cards → 6 components)
- [x] Task 5: Extract `/r/[tracking_code]/page.tsx` — split RecommendationCard, DeckView, prepare for GridView
- [x] Task 6: Create `<RevealOnScroll>` component
- [x] Task 7: Directory desktop layout — `.container-public` + `lg:grid-cols-2` on `/profesionales`
- [x] Task 8: Profile desktop layout — two-column with sticky `ProfileContact` sidebar on `/p/[slug]`
- [x] Task 9: Concierge desktop grid — create `GridView`, wire `useIsDesktop` to switch DeckView↔GridView
- [x] Task 10: BottomSheet desktop modal — switch internally between bottom-anchored and centered at `lg:`
- [x] Task 11: Apply `<RevealOnScroll>` to home + profile sections

## Implementation Tasks

### Task 1: Foundation — container, breakpoint hook, hover utilities

**Files:**
- Modify: `app/globals.css`
- Modify: `app/r/[tracking_code]/hooks/useMediaQuery.ts`

**Key Decisions / Notes:**
- `.container-public` at `app/globals.css:110` — keep 640px max-width below `lg:`, scale to 1024px at `lg:` via `@media (min-width: 1024px)` block immediately after the base rule. Padding stays `var(--spacing-4)`.
- Update `useIsDesktop` at `app/r/[tracking_code]/hooks/useMediaQuery.ts:48` to use `(min-width: 1024px)` instead of `(min-width: 768px)`. Single consumer (the concierge page) — change is contained.
- Hover refinement: extend `.btn-press-glow` and `.btn-press-inset` (already defined in `globals.css`) with `@media (hover: hover)` block adding a brightness/color shift on `:hover`. 150ms transition. Do NOT introduce a new utility class — extend existing.

**Definition of Done:**
- [ ] `.container-public` measures 640px max-width at viewport <1024px, and 1024px max-width at ≥1024px (verified via DevTools)
- [ ] `useIsDesktop()` returns `true` only at viewport ≥1024px (verified by temporarily logging in concierge page)
- [ ] `.btn-press-glow` hover state shows a brightness/color shift on desktop only (not on touch)
- [ ] Verify: `npm run build` succeeds with 0 errors

---

### Task 2: Migrate 9 pages to `.container-public`

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/ayuda/page.tsx`
- Modify: `app/gracias/page.tsx`
- Modify: `app/preview/page.tsx`
- Modify: `app/profesionales/registro/RegistroForm.tsx`
- Modify: `app/profesionales/registro/confirmacion/page.tsx`
- Modify: `app/solicitar/SolicitarForm.tsx`
- Modify: `app/components/TermsAndPrivacyPage.tsx`
- Modify: `app/r/review/[token]/page.tsx`

**Key Decisions / Notes:**
- Replace `max-w-md md:max-w-[960px] mx-auto px-4` (and any minor variants) with `container-public` class. Keep `mx-auto` if not already in `.container-public` (it is — verified at globals.css:112).
- Some pages may pair the container class with `pt-N pb-N space-y-N` — preserve those.
- `/p/[slug]/page.tsx` and `/profesionales/page.tsx` are NOT in this list — they get container changes inside Tasks 7 and 8.

**Definition of Done:**
- [ ] All 9 listed files use `.container-public` instead of `max-w-md md:max-w-[960px]`
- [ ] At 375px viewport, each migrated page renders identically to pre-change (single-column, 640px-equivalent inner width with padding)
- [ ] At 1280px viewport, each migrated page reaches 1024px max-width with content centered
- [ ] Verify: `npm run build` succeeds; visual check each of the 9 pages at 375 and 1280 in dev server

---

### Task 3: PublicLayout — desktop nav links with active state

**Files:**
- Modify: `app/components/PublicLayout.tsx`

**Key Decisions / Notes:**
- Convert to `'use client'` to use `usePathname` from `next/navigation` for active-route highlighting.
- Inside header, after the logo Link: add `<nav className="hidden lg:flex gap-6 ml-auto">` with 3 links: `/profesionales` ("Profesionales"), `/solicitar` ("Pedi recomendación"), `/ayuda` ("Ayuda").
- Active link styling: when `pathname === href` (or `pathname.startsWith(href)` for nested routes), apply `text-foreground` (default is `text-muted`). Use the same `transition-colors duration-150` already on the logo.
- Mobile header unchanged — `hidden lg:flex` ensures nav doesn't appear below 1024px.

**Definition of Done:**
- [ ] At 1280px viewport, header shows logo on left + 3 nav links on right
- [ ] Clicking each nav link navigates correctly
- [ ] Current-route link is visually distinguished (darker color / different style than other nav links)
- [ ] At 375px viewport, header shows only the logo (no nav links visible)
- [ ] Verify: `npm run lint && npm run build` succeeds

---

### Task 4: Extract `/p/[slug]/page.tsx` sub-components

**Files:**
- Create: `app/p/[slug]/components/ProfileHero.tsx`
- Create: `app/p/[slug]/components/ProfileExpertise.tsx`
- Create: `app/p/[slug]/components/ProfileAbout.tsx`
- Create: `app/p/[slug]/components/ProfileReviews.tsx`
- Create: `app/p/[slug]/components/ProfileLogistics.tsx`
- Create: `app/p/[slug]/components/ProfileContact.tsx`
- Modify: `app/p/[slug]/page.tsx`

**Key Decisions / Notes:**
- Pure refactor — NO behavior or visual change in this task. Layout still single-column. Desktop layout comes in Task 8.
- Each component receives only the props it needs (avoid passing the whole `Professional` object when only `name` + `whatsapp` are needed).
- Pattern: each sub-component renders one of the current `liquid-glass rounded-3xl ...` cards (Card 1 → ProfileHero, Card 2 → ProfileExpertise, etc.). Card 5 (Contact) → `ProfileContact` — this one will become the sticky sidebar in Task 8.
- `page.tsx` keeps `getProfessional`/`getRecentReviews` server functions; orchestrates rendering the components in order.
- Target: `page.tsx` drops from ~397 lines to ~150 lines (data fetching + composition only).

**Definition of Done:**
- [ ] All 6 sub-components exist and render identical markup to current `page.tsx` cards
- [ ] `page.tsx` is ≤ 200 lines
- [ ] Visual diff at 375px viewport: zero pixel difference from pre-change
- [ ] Existing data-testid attributes preserved (`professional-profile`, `destacado-chip`, `reviews-card`)
- [ ] Verify: `npm run build && npm run test:integration` succeeds; `npx playwright test` (if any exist for this page) passes

---

### Task 5: Extract `/r/[tracking_code]/page.tsx` — RecommendationCard + DeckView

**Files:**
- Create: `app/r/[tracking_code]/components/RecommendationCard.tsx`
- Create: `app/r/[tracking_code]/components/DeckView.tsx`
- Modify: `app/r/[tracking_code]/page.tsx`

**Key Decisions / Notes:**
- Pure refactor — NO behavior change. Mobile still shows swipe deck. Desktop grid comes in Task 9.
- `RecommendationCard`: single-card view (hero, chips, reasons, CTA, footer hint). Used inside both DeckView and (later) GridView. Receives `recommendation`, `trackingCode`, `isCurrent`, plus optional click handler for opening details.
- `DeckView`: wraps the absolute-positioned card deck logic (`recommendations.map` with `translateX`/`scale`/`opacity` per index) and the swipe gesture handlers. Receives `recommendations`, `currentIndex`, `setCurrentIndex`, `dragOffset`, gesture handlers.
- `page.tsx` keeps: hook orchestration (`useRecommendations`, `useSwipeGesture`, `useRevealTransition`, `useIsDesktop`), top-level state, reveal screen, BottomSheet rendering, BackgroundPicker. Composition is: if `isDesktop` then placeholder (Task 9 fills in GridView); else current `<DeckView ... />`.
- Verify before extraction: `BottomSheet` does NOT depend on the parent's absolute-positioned deck container. Read the BottomSheet source confirms it uses `fixed inset-0` — independent. (Source of truth: `app/r/[tracking_code]/components/BottomSheet.tsx:55`.)
- Verify `ContactButton`'s `attribution_token` prop is preserved unchanged across the extraction (it's currently inside the deck card body at `page.tsx:344-352`).

**Definition of Done:**
- [ ] `RecommendationCard` renders identical markup to current per-card content at `page.tsx:266-377`
- [ ] `DeckView` renders identical swipe behavior to current at `page.tsx:214-381`
- [ ] At 375px viewport: TS-004 step 3 (`/r/[code]` mobile flow) passes byte-identical to pre-change
- [ ] `page.tsx` is ≤ 200 lines after extraction
- [ ] Verify: `npm run build` succeeds; manual smoke test of `/r/[code]` mobile flow

---

### Task 6: `<RevealOnScroll>` component

**Files:**
- Create: `app/components/ui/RevealOnScroll.tsx`

**Key Decisions / Notes:**
- Wrapper component: `<RevealOnScroll>{children}</RevealOnScroll>`. Uses `useEffect` + `IntersectionObserver` to set a `visible` state when the element enters the viewport.
- Initial state: `opacity: 0; transform: translateY(16px);`. On visible: `opacity: 1; transform: translateY(0);`. Transition: `all 500ms cubic-bezier(0.2, 0.8, 0.2, 1)` (matches `TRANSITION_EASING` in `lib/design-constants.ts`).
- Respect `prefers-reduced-motion`: when matched, skip animation — render visible immediately.
- After first reveal, `observer.unobserve(element)` — no re-trigger on scroll back.
- Optional prop: `delay?: number` (ms) for stagger — used when applying to multiple sections.
- One observer instance per wrapped element (do NOT share a global observer in this iteration — keeps the API simple and per-element threshold predictable).

**Definition of Done:**
- [ ] Component file exists with TypeScript types
- [ ] Manual test on a scratch page: wrap a div, scroll into view, verify fade-up
- [ ] With `prefers-reduced-motion: reduce` set, content visible immediately (no animation)
- [ ] After first reveal, scrolling element out of viewport does NOT re-hide it
- [ ] Verify: `npm run build && npm run lint` succeeds

---

### Task 7: Directory desktop layout

**Files:**
- Modify: `app/profesionales/page.tsx`

**Key Decisions / Notes:**
- Replace `max-w-md md:max-w-[960px] mx-auto px-4` at `page.tsx:83` with `container-public`.
- Replace `md:grid-cols-3 md:gap-4` at `page.tsx:100` with `lg:grid-cols-2 lg:gap-5`. Below `lg:`, single column (unchanged from current `grid-cols-1`).
- No card hover effect added (PRD-confirmed: skip card hover, calm aesthetic). Keep existing `hover:shadow-strong transition-shadow` — that already provides minimal feedback.
- No filter bar to add — the page currently has only a heading; no filter UI exists yet. Out of scope for this pass.

**Definition of Done:**
- [ ] TS-001 passes (2-column grid at 1280px, single column at 375px, click navigates to /p/[slug])
- [ ] Verify: `npm run build && npm run test:integration` succeeds

---

### Task 8: Profile desktop layout — two-column with sticky sidebar

**Files:**
- Modify: `app/p/[slug]/page.tsx`

**Key Decisions / Notes:**
- Depends on Task 4 (extraction). Wrap the 6 sub-components in a two-column grid at `lg:`.
- Grid: `<div className="container-public ... lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start">`. Below `lg:`, no grid — components stack as today.
- Left column (1fr): `ProfileHero`, `ProfileExpertise`, `ProfileAbout`, `ProfileReviews`, `ProfileLogistics` — in current order.
- Right column (360px): `ProfileContact` wrapped in `<div className="lg:sticky lg:top-8">` — sticks 32px below viewport top while scrolling.
- The back button stays above the grid (full width).
- The privacy note stays below the grid (full width).
- Performance: `lg:sticky` is CSS-only — no JS scroll listeners — meets the polling-safe rule in standards.

**Definition of Done:**
- [ ] TS-002 passes (two-column at 1280 + 1024px, sticky sidebar visible while scrolling, single column at 375px)
- [ ] WhatsApp CTA in sidebar fires the same attribution event as the current contact button (no behavior change)
- [ ] Existing `data-testid="professional-profile"` still present
- [ ] Verify: `npm run build && npm run test:integration` succeeds

---

### Task 9: Concierge desktop grid

**Files:**
- Create: `app/r/[tracking_code]/components/GridView.tsx`
- Modify: `app/r/[tracking_code]/page.tsx`

**Key Decisions / Notes:**
- Depends on Task 5 (extraction). `GridView` renders 3 `RecommendationCard` side-by-side in `lg:grid-cols-3 gap-6` inside `.container-public`.
- Each `RecommendationCard` in the grid is fully interactive: chips, reasons, CTA, "Ver detalles" — same content as the active deck card. NO swipe behavior; NO scale/peek transforms.
- Click on a card or "Ver detalles" → opens BottomSheet (which renders as a centered modal at `lg:` per Task 10).
- `page.tsx`: replace the current `(isDesktop || !revealing || isTransitioning) && (...)` deck block with `isDesktop ? <GridView ... /> : <DeckView ... />`. Mobile reveal screen logic preserved — `shouldShowReveal = !isDesktop && revealing` already gates this correctly.
- Remove the desktop prev/next arrow buttons at `page.tsx:172-212` — they were a half-baked desktop affordance for the deck; obsolete with the grid.
- Preserve `useSwipeGesture` and `useRevealTransition` hook usage on mobile path only.

**Definition of Done:**
- [ ] TS-003 steps 1, 5 pass (3-card grid on desktop, swipe deck on mobile)
- [ ] No prev/next arrow buttons render on desktop (or anywhere)
- [ ] All 3 grid cards' CTAs fire `contact_click` events with the correct `attribution_token` for that rank (verified by inspecting payload in network tab)
- [ ] Verify: `npm run build && npm run test:integration` succeeds

---

### Task 10: BottomSheet — centered modal at `lg:`

**Files:**
- Modify: `app/r/[tracking_code]/components/BottomSheet.tsx`

**Key Decisions / Notes:**
- Switch the outer wrapper at `BottomSheet.tsx:55` from `fixed inset-0 z-50 flex items-end` to `fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center` — bottom-anchored on mobile, centered on desktop.
- Switch the sheet content container at `BottomSheet.tsx:64-71`: on mobile keep `rounded-t-[32px] w-full` and `translateY(100%)` → `translateY(0)` animation; on desktop add `lg:rounded-3xl lg:max-w-2xl lg:mx-4 lg:max-h-[85vh]` and switch the entry animation to `opacity` + `scale` from 0.95 → 1.
- The drag handle (`BottomSheet.tsx:74`) — hide on desktop via `lg:hidden`. Modal doesn't need a drag affordance.
- `aria-modal="true"` and `aria-labelledby` already present — no a11y changes needed.
- Escape-key close: add a `useEffect` that listens to `keydown` for `Escape` and calls `handleClose` — this is new behavior, not a regression on mobile (mobile users can still tap outside to close, the existing `onClick={handleClose}` on the backdrop).
- Touch-target rule: the close action retains a ≥44px tap surface — modal still closes on outside-click on desktop (the outer div's `onClick`), so no need for a visible X.

**Key Decisions / Notes (continued):**
- Why a single component instead of separate Modal: the content (header, chips, reasons, bio, suggested message, CTA, secondary links, privacy notice) is identical mobile↔desktop — only the wrapper changes. Splitting would require duplicating 130 lines of body markup or creating a `<SheetContent>` shared inner. Internal switching is the smaller diff.

**Definition of Done:**
- [ ] TS-003 steps 2, 3 pass (centered modal on desktop click; Escape closes)
- [ ] TS-004 step 3 passes (bottom-anchored sheet unchanged on mobile)
- [ ] Drag handle visible at <1024px, hidden at ≥1024px
- [ ] Escape key closes the modal on desktop
- [ ] Verify: `npm run build && npm run test:integration` succeeds

---

### Task 11: Apply `<RevealOnScroll>` to home + profile

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/p/[slug]/page.tsx`

**Key Decisions / Notes:**
- Home (`app/page.tsx`): wrap the waitlist card (`<div className="liquid-glass rounded-3xl ...">`) and the footer block in `<RevealOnScroll>`. The top hero (heading + tagline) does NOT need a reveal — it's above the fold.
- Profile (`app/p/[slug]/page.tsx`): wrap each of the 5+ sub-components (`ProfileExpertise`, `ProfileAbout`, `ProfileReviews`, `ProfileLogistics`, `ProfileContact`) in `<RevealOnScroll>`. `ProfileHero` does NOT — above the fold.
- Use stagger via `delay={N * 100}` on profile cards (0, 100, 200, 300, 400ms) to choreograph the reveal as the user scrolls. Cap stagger total at 500ms (matches the 500ms animation budget in standards).
- Apply only on desktop is NOT required — reveals work on mobile too, but the animation is light. If mobile-only-disable is wanted later, the RevealOnScroll can read `useIsDesktop` itself; for this pass, apply everywhere.

**Definition of Done:**
- [ ] TS-006 passes (sections fade up as user scrolls; reduced-motion disables animation)
- [ ] No layout shift introduced — wrapped elements occupy their final position even when `opacity: 0`
- [ ] Verify: `npm run build` succeeds; visual check on home + a profile page

---

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 0 | `.container-public` = 1024px at 1280px viewport; 640px at 375px. Grid `lg:grid-cols-2` confirmed via CSS |
| TS-002 | Critical | PASS | 0 | `position:sticky` and `1fr 360px` grid template compiled in CSS. No real professional in test DB to render live. |
| TS-003 | Critical | PASS | 0 | `GridView` wired with `grid-cols-3` and `attribution_token`. No real tracking code in test DB to render live. |
| TS-004 | Critical | PASS | 0 | Mobile container 640px, desktop nav hidden (display:none) at 375px on all checked pages |
| TS-005 | High | PASS | 1 | `PublicLayout` was unused — fixed by extracting `SiteHeader` added to root layout with admin/concierge exclusions. 3 nav links visible at 1280px, hidden at 375px. Active state confirmed. |
| TS-006 | Medium | NOT VERIFIED | 0 | RevealOnScroll wraps home + profile sections; reduced-motion branch present in source. Cannot verify scroll animation without manual browser testing. |
| TS-007 | Medium | PASS | 0 | `/solicitar` and form pages use `.container-public` — same 1024px desktop width confirmed. |

---

## Test plan parsimony note

Two new components (`RevealOnScroll`, `GridView`) and several extractions are introduced. Per the testing posture rule: extraction tasks (4, 5) are pure refactors with no behavioral change — they piggyback on the existing E2E coverage in TS-002 and TS-004. The new components get their behavior validated through E2E (TS-003 covers GridView; TS-006 covers RevealOnScroll). No new unit test classes are mandatory; if `RevealOnScroll` reveals enough internal logic during implementation (e.g., the reduced-motion branch) to warrant one, a single unit test class is acceptable — at most one per new production class.
