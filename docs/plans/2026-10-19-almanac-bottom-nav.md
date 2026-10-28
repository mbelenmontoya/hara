# Almanac Bottom Nav and Masthead Search Implementation Plan

Created: 2026-10-19
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Visitors can reach Inicio, Buscar, Diario and Ayuda from a bottom bar on the home, the Diario list and Ayuda, and can open the home search from a circle in the home masthead, all copied from the design (screens 11a, 9e, 9g).

## Out of Scope

- The bar on an open article (`/blog/[slug]`), the profile, the concierge, the Carta and the Reseña. The design does not show it there (in 9e the bar sits inside the list view only).
- Links to the professional sign-up and login. They are not in the design.
- A separate desktop layout. The design is mobile only; the same bar is used at every width.

## Approach

**Chosen:** A shared client `HomeSearchProvider` (`app/HomeSearch.tsx`) owns "is the search field open". The masthead circle, the bar's Buscar and `HomeFilterBar` all use it. Other pages link Buscar to `/#buscar`, which opens it on arrival.
**Why:** The masthead (in the server `app/page.tsx`), the bar and the filter bar are siblings, so the open state has to live above all three. Navigating to `/?buscar` was rejected because the home is `force-dynamic`: it would reload the page and reshuffle the featured professional on every tap.

## Context for Implementer

Design values, mapped to existing tokens (no new hex colors), from the design's bottom bar markup:

- Container: `position: sticky; bottom: 0` in the phone frame. On the web use `fixed inset-x-0 bottom-0 z-30`, `bg-background/95 backdrop-blur-[16px] border-t border-foreground/10`, padding `12px 26px 30px`, `flex justify-between`. Center the four items in the same width as the page column (`max-w-md md:max-w-xl`, `mx-auto`).
- Each item: column, `items-center`, `gap-1.5` (6px), `min-w-[56px]`. On top is a 6px dot: filled with `bg-brand` (#B57261) when active, transparent otherwise. Below is the label: `font-almanac`, `text-[11.5px]`, `tracking-[0.6px]`, `font-medium text-foreground` when active, `font-normal text-muted` (#7B706B) otherwise.
- Labels, in order: Inicio, Buscar, Diario, Ayuda. The active one is Inicio on the home, Diario on `/blog` and Ayuda on `/que-es-hara`.
- Masthead circle (11a): 40px, `rounded-full bg-surface-2` (#EBE4D9), with the 15px magnifier in `text-foreground`, placed right of the logo. A 40px empty box on the left keeps the logo centered.
- `globals.css` has a global `p + p` margin and an unlayered `h1..h6` rule. Use spans and buttons in the bar, not paragraphs or headings.

## Progress Tracking

- [x] Task 1: Shared home search state, the masthead circle and `#buscar`
- [x] Task 2: Bottom nav bar on the home, the Diario and Ayuda

## Implementation Tasks

### Task 1: Shared home search state, the masthead circle and `#buscar`

**Objective:** Move "is the search field open" out of `HomeFilterBar` into a `HomeSearchProvider`, so the masthead circle (and, in Task 2, the bar's Buscar) can open the same field the dark search button opens. Opening scrolls the sticky filter bar into view. Landing on `/#buscar` opens it too. Verified by TS-001 and TS-003.

**Files:**

- Create: `app/HomeSearch.tsx`
- Modify: `app/HomeFilterBar.tsx`, `app/HomeArrival.tsx`, `app/page.tsx`
- Test: `app/HomeFilterBar.test.tsx`, `app/HomeArrival.test.tsx`

**Key Decisions / Notes:**

- `app/HomeSearch.tsx` (client) exports `HomeSearchProvider`, `useHomeSearch()` returning `{ searching, openSearch, closeSearch }`, and `HomeSearchButton` (the masthead circle, `aria-label="Buscar"`). `useHomeSearch` throws outside the provider, so a missing wrapper fails loudly.
- `openSearch()` sets `searching` and scrolls the element with id `buscar` into view (`behavior: 'smooth'`, or `'auto'` under `prefers-reduced-motion`). The id goes on a zero-height anchor right before the sticky bar, like the design's `data-tbs` marker. On mount, the provider opens the search when `location.hash === '#buscar'`, then clears the hash with `history.replaceState`.
- `HomeFilterBar` drops its own `searching` state (`app/HomeFilterBar.tsx:45`) and reads `useHomeSearch()`. The dark button calls `openSearch`. Cancelar and Limpiar filtros call `closeSearch`, keeping today's behavior.
- `app/page.tsx` wraps the column in `HomeSearchProvider`. The logo row becomes `flex items-center justify-between`, with a 40px spacer, the logo and `HomeSearchButton`.
- The test helpers in both test files wrap renders in `HomeSearchProvider`. Add tests for these: the masthead button opens the field (input focused, pills still below it); `#buscar` on mount opens it and clears the hash; Cancelar closes it.

**Definition of Done:**

- [ ] Clicking the masthead circle on `/` shows the "Nombre, práctica o síntoma" field focused, with the filter bar scrolled into view.
- [ ] Loading `/#buscar` shows the field open, and the address bar ends up as `/`.
- [ ] The dark search button and Cancelar behave as before. The existing HomeFilterBar tests pass unchanged apart from the provider wrapper.
- [ ] Verify: `npx vitest run --project unit app/HomeFilterBar app/HomeArrival`

### Task 2: Bottom nav bar on the home, the Diario and Ayuda

**Objective:** Add an `AlmanacBottomNav` component copied from the design and render it on `/`, `/blog` and `/que-es-hara` with the right tab active. Pages get enough bottom padding that the bar never hides content. Verified by TS-001, TS-002 and TS-003.

**Files:**

- Create: `app/components/AlmanacBottomNav.tsx`
- Modify: `app/page.tsx`, `app/blog/DiarioList.tsx`, `app/que-es-hara/page.tsx`
- Test: `app/components/AlmanacBottomNav.test.tsx`

**Key Decisions / Notes:**

- Props: `{ active: 'inicio' | 'diario' | 'ayuda'; onSearch?: () => void }`. It renders `<nav aria-label="Principal">`. Inicio, Diario and Ayuda are `next/link` to `/`, `/blog` and `/que-es-hara`, with `aria-current="page"` on the active one. Buscar is a `<button>` calling `onSearch` when given, otherwise a link to `/#buscar`.
- On the home, a small client wrapper inside the provider passes `onSearch={openSearch}`. It is exported from `app/HomeSearch.tsx` as `HomeBottomNav`, so `page.tsx` stays a server component.
- Bottom padding: raise `pb-16` to `pb-[110px]` (the design's value for Ayuda) on the three pages' column wrappers: `app/page.tsx` (column div), `app/blog/DiarioList.tsx:87`, `app/que-es-hara/page.tsx:179`.
- Tests (one class): the active tab has `aria-current="page"` and the others do not; each link points to its route; Buscar calls `onSearch` when given and is a link to `/#buscar` when not.
- Update the `app/components/` line in `CLAUDE.md` (the Project Structure list) to include `AlmanacBottomNav`.

**Definition of Done:**

- [ ] `/`, `/blog` and `/que-es-hara` each show the four tabs fixed at the bottom, with the dot and dark label on Inicio, Diario and Ayuda respectively.
- [ ] Tapping Diario from `/` opens `/blog`, Ayuda opens `/que-es-hara`, and Inicio from either returns to `/`.
- [ ] Buscar on `/` opens the search field without reloading (the featured professional stays the same). From `/blog` it lands on `/` with the field open.
- [ ] The last item on each page (the concierge block, the last article, the emergency card) can be scrolled fully above the bar.
- [ ] Verify: `npx vitest run --project unit app/components/AlmanacBottomNav app/HomeArrival app/blog app/que-es-hara`

## E2E Test Scenarios

### TS-001: Masthead circle and Buscar open the home search
**Priority:** Critical
**Preconditions:** Dev server on localhost:3000, home loaded
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Note the featured professional's name, click the circle right of the logo | The filter bar is in view with the "Nombre, práctica o síntoma" field focused |
| 2 | Click Cancelar | The dark search button and pills return |
| 3 | Scroll to the top, click Buscar in the bottom bar | The field opens again, and the featured name is unchanged (no reload) |

### TS-002: Moving between pages with the bar
**Priority:** Critical
**Preconditions:** Home loaded
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check the bar on `/` | Four tabs; Inicio has the dot and dark label |
| 2 | Click Diario | `/blog` loads; Diario is the active tab |
| 3 | Click Ayuda | `/que-es-hara` loads; Ayuda is the active tab |
| 4 | Click Inicio | `/` loads; Inicio is active |

### TS-003: Buscar from another page
**Priority:** High
**Preconditions:** `/blog` loaded
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click Buscar | `/` loads with the search field open, and the URL has no `#buscar` left |

### TS-004: Nothing hidden behind the bar
**Priority:** Medium
**Preconditions:** None
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On `/`, `/blog` and `/que-es-hara`, scroll to the bottom | The last block on each page is fully visible above the bar |

## E2E Results

Run on 2026-10-19 in Chrome against the local dev server (localhost:3000), after the review fixes and a fresh `.next`.

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 1 | Masthead circle and bar Buscar open the field focused, with the bar at the top (0px). The featured professional is unchanged. First run from another page landed 60px too far, because focusing the field scrolls the page; fixed by scrolling in an effect after the field renders. |
| TS-002 | Critical | PASS | 0 | Real clicks: Inicio, then Diario (`/blog`), then Ayuda (`/que-es-hara`), then Inicio. The active tab is correct on each page. |
| TS-003 | High | PASS | 0 | Buscar from `/blog` lands on `/` with the field open and focused, and the URL has no `#buscar` left. |
| TS-004 | Medium | PASS | 0 | Last item ends above the bar on all three pages (home "Contanos →" 608px, Diario 628px, Ayuda 628px, bar top 665px). |

## Code Review

`code-reviewer` agent found no must_fix items. Fixed:
- should_fix: the tabs were about 28px tall. Each tab now has `py-2` (46px tall), and the bar's padding is reduced by the same 8px, so the layout still matches the design (12px top, 30px bottom).
- suggestion: `HOME_SEARCH_ANCHOR` moved to `lib/home-search.ts`, so the filter bar no longer imports the nav.
- suggestion: the `scrollIntoView` spy is restored after each test (`vi.spyOn` plus `vi.restoreAllMocks`).
- suggestion: page JSX re-indented, and the `<nav>` moved outside `<main>` on all three pages.

Automated checks: unit suite 102 files / 718 tests passing, `tsc --noEmit` clean, `npm run build` exit 0. `npm run lint` has no ESLint config (known, ISSUES.md).

## Not Verified

| Not Verified | Reason |
|-------------|--------|
| Real phone (iOS safe area under the bar) | No device here. The bar uses the design's fixed 30px bottom padding, not `env(safe-area-inset-bottom)`. |
| Production (Vercel) | Nothing is pushed yet, by the user's choice. Checked locally only. |

## Changes After User Review (2026-10-19)

- Removed the masthead search circle (`HomeSearchButton`). The user said it was not wanted. The home logo is centered again, and the bar's Buscar is the only extra way to open the search. The scroll-into-view test now clicks Buscar in the bar.
- `/que-es-hara` column narrowed from `md:max-w-2xl` to `md:max-w-xl`, matching the home, the Diario and the concierge.
- The missing sign-up and login links are logged as ISSUES.md entry 17, waiting for a design.
