# Home Search and Filters Implementation Plan

Created: 2026-10-05
Author: mariabmontoya@gmail.com
Agent: Claude Code
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** On the home page `/`, a sticky bar above the list lets people search and filter everyone right there (search, Prácticas, Modalidad, Ciudad, count, Limpiar filtros, Lista/Mapa), as in the new Claude Design round 11, using only our own data and copy.

## Out of Scope

- Anything else on the home (headline, date line, cards' look, concierge block, featured card, rows) and every other page.
- The design's "Usar mi ubicación": the geolocation code lives inside `LocationFilter` and cannot be reused without refactoring a tested component, so the Ciudad panel lists our cities instead (noted in `ISSUES.md`).
- The design's stylised map: the existing Google map (`DirectoryMap`) is used.
- Card contents (Índice Hara, Destacado mark, review count, price, description, chips): not part of this change.

## Approach

**Chosen:** Keep the server page `app/page.tsx` and `HomeArrival.tsx`, add the extra professional fields the filters need, and reuse the unused directory logic (`normalize`, `buildPracticeIndex`, `matchesProfessional`, `matchesFilters`, `FilterState`, `DEFAULT_FILTERS`, `DirectoryMap`) by importing it from `app/profesionales/components`, with new pure helpers in `lib/home-filters.ts` and a new bar component.
**Why:** Search and filter behavior is exactly what the old directory already did and tested, so we only add the home layout around it; the cost is that the home bundle now also loads the map code.

## Autonomous Decisions

- Element cards become an ordering: the chosen specialty's professionals go first (ranking order kept in each group), nobody is removed, tapping again restores the order. The list heading is always "Todos los profesionales".
- Counts in the panels count all professionals (not narrowed by the other filters), using the same `matchesFilters` the list uses, so numbers agree with results.
- The list shows the featured card plus 12 rows, and "Cargar 12 más" adds 12 at a time (it shows how many remain); searching or filtering resets to 12.
- Panels are bottom sheets with a backdrop, Escape closes, focus moves into the panel and returns to its pill; no focus trap.
- The count reads "N de M resultados" always; "Limpiar filtros" shows only while a search or filter is active (element ordering is not a filter).

## Progress Tracking

- [x] Task 1: Pure helpers (filtering, ordering, panel options)
- [x] Task 2: Data from the server and the list behavior (ordering, 12 at a time, map view)
- [x] Task 3: The sticky bar and its panels
- [x] Task 4: Browser check and ISSUES.md entry

## Implementation Tasks

### Task 1: Pure helpers (filtering, ordering, panel options)

**Objective:** One module with the logic the bar needs, so the component stays thin: apply search and filters to rows, order by element, and compute the options with counts for the three panels. Verified by TS-001 and TS-002.

**Files:**

- Create: `lib/home-filters.ts`
- Test: `lib/home-filters.test.ts`

**Key Decisions / Notes:**

- `filterRows(rows, professionals, practices, { search, filters })` returns the rows whose professional (same `slug`) passes `matchesProfessional(pro, search, buildPracticeIndex(practices))` and `matchesFilters(pro, filters, index)`, keeping the incoming (ranking) order.
- `orderByElement(rows, key | null)`: stable partition, rows whose `specialtyKeys` include `key` first; `null` returns the input order.
- `practiceOptions`, `modalityCounts`, `cityOptions` compute counts by calling `matchesFilters` with a single dimension set (`practices: [key]`, `modality`, `location: { city }`), so counts always agree with the list; cities come from `professionals.city`, most people first then alphabetical, labeled with the original spelling.
- Import the existing pure functions from `@/app/profesionales/components/ProfessionalsDirectory` and the types from `.../DirectoryFilters`; do not copy their logic.

**Definition of Done:**

- [ ] Search matches name, free-text specialty and practice (including by alias) accent-insensitively, and combines with filters (AND)
- [ ] `orderByElement` puts matching rows first without dropping any and keeps ranking order inside each group; `null` leaves the order unchanged
- [ ] Practice, modality and city counts equal the number of professionals the list shows when only that option is chosen (online-only professionals do not count for a city)
- [ ] Verify: `npx vitest run --project unit home-filters`

### Task 2: Data from the server and the list behavior (ordering, 12 at a time, map view)

**Objective:** Give the client the data the filters need and change the list: element cards order instead of filter, everyone is listed 12 at a time with "Cargar 12 más", and a map view can replace the list. Verified by TS-001 and TS-003.

**Files:**

- Modify: `app/page.tsx`
- Modify: `app/HomeArrival.tsx`
- Test: `app/HomeArrival.test.tsx`

**Key Decisions / Notes:**

- `page.tsx` also selects `modality, latitude, longitude, ranking_score` and passes `professionals` (as `DirectoryProfessional[]`, with `specialty_keys` and `practice_label` omitted since rows carry them), the active `practices` and the rows to `HomeArrival`; everything serializable.
- `HomeArrival` state: `selectedKey` (ordering), `search`, `filters` (`FilterState`), `view` (`list` | `map`), `visibleCount` (12); shown rows = `orderByElement(filterRows(...), selectedKey)`; featured and rest as today (`splitFeatured`); remove `MAX_LIST_ROWS` and the `Para <specialty>` heading.
- Map view renders `<DirectoryMap professionals={...filtered professionals} />` instead of the list and featured card; tests mock `DirectoryMap` (it needs Google).
- Keep the empty message ("Todavía no hay profesionales para esto." with the concierge link) when nothing matches; concierge block stays below the list.
- Update the old tests: the card no longer filters, the heading is always "Todos los profesionales", and the 8-row cap becomes 12 at a time.

**Definition of Done:**

- [ ] Tapping a card moves its professionals to the top and removes nobody; tapping again restores the original order
- [ ] 12 rows show first, "Cargar 12 más" shows how many remain and adds 12 until everyone is listed
- [ ] The list shows everyone (no 8-row cap) and the heading stays "Todos los profesionales"
- [ ] Verify: `npx vitest run --project unit HomeArrival`

### Task 3: The sticky bar and its panels

**Objective:** The bar above the list with the dark search button, the three pills and their bottom-sheet panels, the count, "Limpiar filtros" and the Lista/Mapa toggle, all changing the list right away. Verified by TS-001, TS-002 and TS-004.

**Files:**

- Create: `app/HomeFilterBar.tsx`
- Create: `app/HomeFilterPanels.tsx`
- Test: `app/HomeFilterBar.test.tsx`

**Key Decisions / Notes:**

- Bar: `sticky top-0 z-20 bg-background/95 backdrop-blur` right above the list heading; the dark search button (`bg-foreground text-background`, round, `aria-label="Buscar"`) swaps the pills for a text field (`type="text"`, `text-base`, placeholder "Nombre, práctica o síntoma") and a "Cancelar" button that clears the search and brings the pills back.
- Pills (`aria-expanded`, show the active choice: "Prácticas · 2", "Online", the city name) open one panel at a time: Prácticas (all active practices with counts, several at once, "Limpiar"), Modalidad (Todos, Online, Presencial with counts), Ciudad (type to filter our cities with counts, "Cualquier ciudad"). Each panel ends with a button "Ver N resultados" that closes it.
- Panel behavior: bottom sheet over a backdrop, `role="dialog"`, Escape and backdrop tap close it, focus moves to the panel title and returns to the pill; tokens only, almanac classes (`font-almanac`, `font-almanac-serif`, `almanac-label`); spans instead of adjacent `<p>`.
- Count "N de M resultados" and "Limpiar filtros" (clears search and all filters, not the element ordering) sit in the bar; Lista/Mapa toggle uses `aria-pressed`.

**Definition of Done:**

- [ ] Choosing a practice, a modality or a city changes the list right away and the pill shows the choice; "Cualquier ciudad" and "Limpiar" remove it
- [ ] The search field filters as you type and "Cancelar" clears it and shows the pills again
- [ ] "Limpiar filtros" appears only while a search or filter is active and clears all of them; the count reads "N de M resultados"
- [ ] Escape closes an open panel and returns focus to its pill; only one panel is open at a time
- [ ] Verify: `npx vitest run --project unit HomeFilterBar HomeArrival`

### Task 4: Browser check and ISSUES.md entry

**Objective:** Check the real home page in Chrome and note what was left out.

**Files:**

- Modify: `ISSUES.md`

**Key Decisions / Notes:**

- Add an entry: "Usar mi ubicación" is not on the Ciudad panel because the geolocation code is inside `LocationFilter`; idea: extract it to a helper and add the button.
- Wait about a second after navigating before the first click (hydration).

**Definition of Done:**

- [ ] TS-001 to TS-004 pass in the browser with real data
- [ ] `ISSUES.md` has the new entry with no em dashes
- [ ] Verify: `npm run test:unit && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/"`

## E2E Test Scenarios

### TS-001: The bar on a phone
**Priority:** Critical
**Preconditions:** Dev server on port 3000, real data, viewport about 390px
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/` and scroll to the list | A bar with the search button, Prácticas, Modalidad, Ciudad, "N de M resultados" and Lista/Mapa; it stays at the top while scrolling the list |
| 2 | Scroll the list to the end | 12 rows and "Cargar 12 más" with the number remaining; no horizontal scroll |

### TS-002: Filters change the list right away
**Priority:** Critical
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 1, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Prácticas, choose one | The list narrows, the pill shows the choice, the count changes |
| 2 | Open Modalidad, choose Online | The list narrows further |
| 3 | Open Ciudad, choose a city | Only presencial professionals of that city remain |
| 4 | Tap "Limpiar filtros" | Everyone is back and the pills are empty again |
| 5 | Tap the search button, type a name, tap Cancelar | The list filters as you type; Cancelar clears it and shows the pills |

### TS-003: Element cards order the list
**Priority:** High
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap an element card | Its professionals come first; the total count does not change |
| 2 | Tap it again | The original order returns |

### TS-004: Map and panels from the keyboard
**Priority:** Medium
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap Mapa | The map shows the filtered professionals instead of the list; Lista brings the list back |
| 2 | Open a panel and press Escape | The panel closes and focus is back on its pill |
