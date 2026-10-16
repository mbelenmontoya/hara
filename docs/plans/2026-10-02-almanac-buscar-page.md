# Almanac Buscar Page (/profesionales) Implementation Plan

> CANCELLED (2026-10-02): the user decided `/profesionales` is not needed because the home page `/` already does the same job. `/profesionales` now redirects to `/`. The Buscar attempts are saved outside the repo in the session scratchpad (`buscar-almanac-backup/` and `buscar-stripped/`).

Created: 2026-10-02
Author: mariabmontoya@gmail.com
Agent: Claude Code
Status: PENDING
Approved: No
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** The directory `/profesionales` looks like the almanac Buscar (Claude Design 9f) on a phone: serif title, search box, "Cómo llegás" specialty cards, practice chips with a color dot, an Online/Presencial control, and result rows, while keeping today's location filter, map view, "Cargar más", Destacado mark and Índice Hara score.

## Out of Scope

- The bottom navigation bar, and the design's "Lucía" name (she is not in the app; the empty state says "el equipo").
- Changing how professionals are ranked or what the search matches (`normalize`, `buildPracticeIndex`, `matchesProfessional` stay as they are).
- Restyling `WelcomeHint` and `ContactFooterForm`: they stay as they are on the page.

## Approach

**Chosen:** Restyle in place: `app/profesionales/page.tsx`, `ProfessionalsDirectory.tsx`, `DirectoryFilters.tsx` and `ProfessionalCard.tsx`, resolving each professional's curated specialties on the server with `resolveProfileSpecialties` (`lib/profile-specialties.ts`) so the specialty filter and the card tiles use the practices mapping and never raw free text.
**Why:** Every existing behavior (search, filters, location, map, paging, ranking order) keeps working on the same state and pure functions, at the cost of updating tests that asserted the old raw-free-text chips and Tailwind class names.

## Context for Implementer

Decisions from the user: keep the location filter and Lista/Mapa toggle (restyled); keep both the Destacado mark and the Índice Hara number on cards; subtitle is only "Todos revisados a mano." (the design's second sentence "Nadie paga por aparecer arriba" is false because the Destacado tier adds to ranking). Almanac classes `font-almanac`, `font-almanac-serif`, `almanac-label` live in `app/globals.css`; headings and adjacent `<p>` get global rules, so use unlayered almanac classes and spans. Copy is Argentine vos. The home page already has the same card and row patterns in `app/HomeArrival.tsx` and `lib/home-arrival.ts` (specialty cards by count, `SPECIALTY_COLORS`, rows); reuse the ideas, not the components.

## File Structure

- `lib/directory-specialties.ts` (create): pure: ranked specialty options (most common first) from resolved keys.
- `app/profesionales/page.tsx` (modify): loads catalog, resolves `specialty_keys` per professional, almanac header.
- `app/profesionales/components/ProfessionalsDirectory.tsx` (modify): state, search, layout, empty state; specialty filter uses `specialty_keys`.
- `app/profesionales/components/DirectoryFilters.tsx` (modify): practice chips with dot, format control, Limpiar.
- `app/profesionales/components/SpecialtyCards.tsx` (create): "Cómo llegás" cards.
- `app/profesionales/components/DirectoryEmpty.tsx` (create): dark concierge empty state.
- `app/profesionales/components/ProfessionalCard.tsx` (modify): almanac row.
- Tests: `lib/directory-specialties.test.ts` (create); `ProfessionalsDirectory.test.tsx` (modify).

## Progress Tracking

- [x] Task 1: Resolve curated specialties for the directory and make the specialty filter use them
- [x] Task 2: Almanac result row (ProfessionalCard)
- [x] Task 3: Almanac page chrome, filters and empty state
- [x] Task 4: Browser verification and ISSUES.md notes

## Implementation Tasks

### Task 1: Resolve curated specialties for the directory and make the specialty filter use them

**Objective:** Give every directory professional a list of curated specialty keys derived from the practices mapping, offer the most common ones as filter options, and make the specialty filter match on those keys instead of raw free text. Verified by TS-002.

**Files:**

- Create: `lib/directory-specialties.ts`
- Test: `lib/directory-specialties.test.ts`
- Modify: `app/profesionales/page.tsx`
- Modify: `app/profesionales/components/ProfessionalsDirectory.tsx`
- Test: `app/profesionales/components/ProfessionalsDirectory.test.tsx`

**Key Decisions / Notes:**

- `DirectoryProfessional` (`ProfessionalsDirectory.tsx:16`) gets `specialty_keys?: string[]` (optional so existing fixtures still compile); `page.tsx` fills it with `resolveProfileSpecialties({ practiceKeys, specialties }, catalog).specialtyKeys`, using `getAllPractices()` (it returns aliases since the profile work) in the same `Promise.all` as today.
- `matchesFilters` specialty branch (`ProfessionalsDirectory.tsx:89`) checks `pro.specialty_keys`; the tests "specialty filter: returns true / false when pro has a selected specialty" are updated to the new field, because the old comment says the free-text field was "kept for future use" for exactly this.
- `rankSpecialtyOptions(pros)` returns `{ key, label, count }[]` sorted by count then `SPECIALTY_MAP` order, like `buildHomeData` (`lib/home-arrival.ts`); the cards show the first 4 and a "Ver todas" toggle shows all 12.
- `specialtyOptions` (free text, `ProfessionalsDirectory.tsx:122`) is removed along with the `specialtyOptions` prop that `DirectoryFilters` accepts but ignores.

**Definition of Done:**

- [ ] `rankSpecialtyOptions` returns options with the right counts, most common first, with Spanish labels, and ignores professionals with no resolved specialties
- [ ] A professional matches a selected specialty only through `specialty_keys`; one whose free text says "estres-ansiedad" but has no resolved key does not match
- [ ] Search, practice, modality and location behavior is unchanged (existing tests for those pass untouched)
- [ ] Verify: `npx vitest run --project unit directory-specialties ProfessionalsDirectory`

### Task 2: Almanac result row (ProfessionalCard)

**Objective:** Replace the glass card with the design's row: round photo or initial, serif name, rating, practice and price, place, small glyph tiles for the curated specialties (with the name as tooltip and accessible label), an "Abierta" status, plus the existing Destacado mark and Índice Hara number. Verified by TS-001.

**Files:**

- Modify: `app/profesionales/components/ProfessionalCard.tsx`
- Test: `app/profesionales/components/ProfessionalsDirectory.test.tsx`

**Key Decisions / Notes:**

- Layout follows `app/HomeArrival.tsx` `Row` (`HomeArrival.tsx:28-60`): 66px avatar, `font-almanac-serif` 23px name in a `<h3>` (keep `data-testid="professional-name"`), `★ 4.9` when `rating_count > 0`, `practice · price` line, place line, tiles row.
- Practice label comes from the first practice resolved for that professional; pass it from the server as `practice_label` next to `specialty_keys` (resolved in `page.tsx`), so the card does no catalog work.
- Tiles: one per `specialty_keys` entry (max 6), 26px rounded square with the triangle glyph in the specialty color from `SPECIALTY_COLORS` (`lib/design-constants.ts:99`), `title` and `aria-label` set to the Spanish label.
- Kept: `data-testid="destacado-chip"` (small "Destacada" mark like the profile), `data-testid="ranking-score"` with "Índice Hara" and its color rule. Dropped because the design replaces them: the 📍 and 💰 emoji lines, the clamped short description, the modality text, and the raw free-text chips with their "+N" expand button.
- The tests that assert Tailwind classes `mb-1` / `mb-0` on the name and the "+N expands chips" test describe the old card; replace them with behavior checks (rating shown only when there are reviews, singular "reseña", tiles show curated labels and never raw free text, score badge present only with a score).

**Definition of Done:**

- [ ] A card shows name, practice and price, place, rating only when `rating_count > 0`, and one tile per curated specialty with its label as accessible name
- [ ] Free-text specialties never render on the card
- [ ] Destacado mark appears only for an effectively destacado professional; the Índice Hara number appears only when `ranking_score` is positive
- [ ] The whole row links to `/p/<slug>`
- [ ] Verify: `npx vitest run --project unit ProfessionalsDirectory`

### Task 3: Almanac page chrome, filters and empty state

**Objective:** Restyle the page around the cards: serif "Buscar" title with the subtitle, the search box, "Cómo llegás" cards, practice chips with a dot and horizontal scroll, the Online/Presencial control, the count line with "Limpiar", the collapsible location filter with the Lista/Mapa toggle, "Cargar más", and a dark concierge block when nothing matches. Verified by TS-001 to TS-005.

**Files:**

- Modify: `app/profesionales/page.tsx`
- Modify: `app/profesionales/components/ProfessionalsDirectory.tsx`
- Modify: `app/profesionales/components/DirectoryFilters.tsx`
- Create: `app/profesionales/components/SpecialtyCards.tsx`, `app/profesionales/components/DirectoryEmpty.tsx`
- Test: `app/profesionales/components/ProfessionalsDirectory.test.tsx`

**Key Decisions / Notes:**

- `page.tsx`: wrapper `font-almanac`, column `max-w-md md:max-w-2xl`, `<h1 className="font-almanac-serif text-[44px] leading-none">Buscar</h1>` and the subtitle "Todos revisados a mano." in a `<span>`/`<p>` without a neighbouring `<p>` (global `p + p` rule); remove `PageBackground`; keep `WelcomeHint` and `ContactFooterForm`.
- Search input keeps `type="text"`, `aria-label="Buscar profesionales"`, `text-base` on mobile and the clear button (existing tests check these); placeholder "Nombre, práctica o síntoma". Rounded `bg-gray-50` look from the design.
- `SpecialtyCards` (client): 2x2 buttons with `aria-pressed`, colors from `SPECIALTY_COLORS`, "Ver todas / Ver menos" toggle; tapping toggles the key in `filters.specialties` (multi-select, OR within the dimension, as `matchesFilters` already does).
- `DirectoryFilters`: practice chips become one horizontally scrollable row of all practices (the "+N más" collapse goes away since scrolling replaces it), each with a dot colored from the practice's first specialty (`SPECIALTY_COLORS[...].text`) or `text-brand` when it has none; the Online/Presencial buttons become a 3-segment control (Todos, Online, Presencial) writing `filters.modality`; "Limpiar" (accessible name "Limpiar filtros") sits on the count line and shows only when a filter or search is active.
- Keep the `<details data-testid="filtros-section">` (starts collapsed) with `LocationFilter` inside, and the Lista/Mapa toggle; restyle with token classes only. Count line reads "N PROFESIONALES" with `almanac-label`, or "N de M resultados" while searching or filtering (existing test).
- `DirectoryEmpty`: dark block like `app/HomeConcierge.tsx` with "Nadie con eso, todavía." (italic "todavía"), "Contanos qué buscás. El equipo conoce a gente que todavía no está en el directorio." and a "Contanos →" link to `/solicitar`; shown instead of the old `EmptyState` when a search or filter returns nothing. With no professionals at all, keep "Todavía no hay profesionales disponibles."
- Split to stay under the size limit: `ProfessionalsDirectory.tsx` is 315 lines now, so the new pieces go in their own files and the file must end below 300 lines.

**Definition of Done:**

- [ ] Tapping a "Cómo llegás" card filters the list to professionals with that curated specialty and marks it pressed; tapping again removes it; "Limpiar" clears search and all filters and "Cargar más" resets to 12
- [ ] The segmented control sets Todos / Online / Presencial and filters like the old buttons
- [ ] Location filter and Lista/Mapa toggle still work; the Filtros section starts collapsed
- [ ] A search with no results shows the concierge block with a link to `/solicitar`
- [ ] All existing tests for search, `matchesFilters`, paging and counts pass, with only the intentional test changes listed in Tasks 1 and 2
- [ ] Verify: `npm run test:unit && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/"`

### Task 4: Browser verification and ISSUES.md notes

**Objective:** Check the real page in Chrome against TS-001 to TS-005, and record anything found in `ISSUES.md`.

**Files:**

- Modify: `ISSUES.md`

**Key Decisions / Notes:**

- Dev server on port 3000 with the real `.env.local`; wait about a second after navigating before the first click (hydration).
- Add `ISSUES.md` entries for anything found (for example practices with no specialties leaving some rows without tiles).

**Definition of Done:**

- [ ] TS-001 to TS-005 pass in the browser with real data
- [ ] Verify: `npm run test:unit` (full suite, 0 failures)

## E2E Test Scenarios

### TS-001: Directory on a phone
**Priority:** Critical
**Preconditions:** Dev server on port 3000, real data, viewport about 390px
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/profesionales` | Serif "Buscar" title, subtitle "Todos revisados a mano.", search box, "Cómo llegás" cards, practice chips, Todos/Online/Presencial control; no horizontal scroll |
| 2 | Scroll the list | Rows with photo or initial, serif name, practice and price, place, specialty tiles, Abierta; Destacado mark and Índice Hara where they apply |
| 3 | Tap a row | Lands on `/p/<slug>` |

### TS-002: Filter by how you arrive and by practice
**Priority:** Critical
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 1, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap the "Duelo y pérdidas" card | It shows pressed; count line reads "N de M resultados"; every row's profile lists that specialty |
| 2 | Tap a practice chip | Rows narrow to that practice (AND with the card) |
| 3 | Tap "Limpiar" | All filters clear and the full list returns |

### TS-003: Nothing matches
**Priority:** High
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type a nonsense word in the search | Dark block "Nadie con eso, todavía." with a "Contanos →" link |
| 2 | Tap the link | Lands on `/solicitar` |

### TS-004: Location, map and format
**Priority:** High
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open "Filtros" | Location filter is inside; the section starts collapsed |
| 2 | Choose Online in the control | List narrows to online professionals |
| 3 | Tap "Mapa" then "Lista" | The map shows the filtered professionals; the list comes back |

### TS-005: Cargar más
**Priority:** Medium
**Preconditions:** Same as TS-001, more than 12 professionals
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scroll to the bottom | 12 rows and "Cargar más (N restantes)" |
| 2 | Tap it | 12 more rows appear; changing the search resets to 12 |

## Open Questions

- Practices with no specialties set (5 of 35) leave their professionals with no tiles; tracked in `ISSUES.md` entry 2.
