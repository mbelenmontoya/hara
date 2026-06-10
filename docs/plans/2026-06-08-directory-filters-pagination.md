# Directory Filters + Pagination Implementation Plan

Created: 2026-06-08
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add Práctica, Especialidad, and Modalidad filter chips plus "Cargar más" pagination to `/profesionales` so users can narrow the directory to relevant professionals without typing.

## Out of Scope

- Server-side filtering or pagination — stays client-side (fetch all, filter in-memory)
- Location / city filter — Modalidad (Online/Presencial) covers the key location intent
- URL-based filter state — shareable filtered URLs deferred
- Filter count badges on chips (e.g., "Reiki (4)")
- Price range filter

## Approach

**Chosen:** Extend `ProfessionalsDirectory` with a new `DirectoryFilters` sub-component + `matchesFilters` predicate alongside the existing `matchesProfessional`.
**Why:** Keeps all filter logic in the same client island without touching `page.tsx` or any DB query; splitting the chip UI into `DirectoryFilters.tsx` keeps `ProfessionalsDirectory.tsx` under the 440-line threshold. The cost is one extra file.

## Context for Implementer

`specialties` in `DirectoryProfessional` stores free-text display strings (e.g. `"Yoga terapéutico"`, `"Meditación guiada"`) — not structured keys. Specialty chip options are derived at render time via `useMemo` from the professionals array. `practices` stores practice keys (e.g. `"reiki"`, `"constelaciones-familiares"`) which map to labels via the `practices: Practice[]` prop already passed from `page.tsx`. Both are already null-safe in the existing `matchesProfessional` predicate — follow the same null guards.

## File Structure

- `app/profesionales/components/DirectoryFilters.tsx` (create) — exports `FilterState` type + pure chip UI: Práctica row, Especialidad row, Modalidad row, "Limpiar filtros" link
- `app/profesionales/components/ProfessionalsDirectory.tsx` (modify) — imports `FilterState` from `DirectoryFilters`; adds `matchesFilters` export, filter + pagination state, updated `useMemo`, wiring to `DirectoryFilters` and "Cargar más"
- `app/profesionales/components/ProfessionalsDirectory.test.tsx` (modify) — extend with `matchesFilters` unit tests + component tests for chip interaction and pagination

## Assumptions

- `specialties` stored in the DB are consistent enough label strings that deriving unique chip options directly from `professionals` data produces a clean chip list — Task 2 depends on this

## E2E Test Scenarios

### TS-001: Filter by Práctica chip narrows grid
**Priority:** Critical
**Preconditions:** At least one active professional with a known `practices` key (e.g. `reiki`); dev server running
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales` | Directory loads, all professionals visible |
| 2 | Locate the Práctica filter row below the search bar | Chips visible: one per active practice |
| 3 | Click the "Reiki" chip | Chip highlights (brand violet border/bg); grid re-renders |
| 4 | Read the result count | Shows "N de M resultados" where N < M (only Reiki pros) |
| 5 | Click "Reiki" chip again | Chip deselects, full grid restores, count disappears |

### TS-002: Modalidad filter — Online
**Priority:** Critical
**Preconditions:** At least one professional with `online_only=true` or `modality` includes `"online"`
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales` | Directory loads |
| 2 | Click the "Online" Modalidad chip | Chip highlights; grid filters to online-only professionals |
| 3 | Click "Presencial" chip | "Online" deselects, "Presencial" highlights; grid shows in-person professionals |
| 4 | Click "Presencial" again | All chips deselect, full grid restores |

### TS-003: "Limpiar filtros" resets chips, preserves search text
**Priority:** High
**Preconditions:** Directory loaded with multiple professionals
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales` | Directory loads |
| 2 | Type "a" in the search bar | Search input shows "a" |
| 3 | Click any practice chip | Chip highlights, "Limpiar filtros" link appears |
| 4 | Click "Limpiar filtros" | All chips deselect; search text "a" remains; grid shows search-only results |

### TS-004: "Cargar más" appends next 12 results without reload
**Priority:** High
**Preconditions:** More than 12 active professionals in the directory
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales` | First 12 professional cards visible |
| 2 | Verify "Cargar más (N restantes)" button is present at the bottom | Button shows remaining count |
| 3 | Click "Cargar más" | 12 more cards append below existing cards; no scroll jump |
| 4 | If no more remaining after next load | "Cargar más" button disappears |

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 (Práctica chip: Reiki) | Critical | PASS | 0 | 3 de 45 resultados; Limpiar filtros visible |
| TS-002 (Modalidad: Online) | Critical | PASS | 0 | 38 de 45 resultados; Cargar más (26 restantes) |
| TS-003 (Limpiar filtros) | High | PASS | 0 | Chips reset, search text "a" preserved, count 45/45 |
| TS-004 (Cargar más) | High | PASS | 0 | Cards 12→24, button shows 21 restantes |

Tested on: localhost:3002 (Next.js dev, `npm run dev -- --port 3002`). Agent-browser click interaction was unreliable with React — playwright-cli (`page.getByRole('button', { name: 'Filtrar por Online' }).click()`) confirmed all scenarios.

## Progress Tracking

- [x] Task 1: `FilterState` type + `matchesFilters` predicate + unit tests
- [x] Task 2: `DirectoryFilters` chip UI sub-component
- [x] Task 3: Wire into `ProfessionalsDirectory` + pagination + component tests

## Implementation Tasks

---

### Task 1: `FilterState` type (in `DirectoryFilters`) + `matchesFilters` predicate (in `ProfessionalsDirectory`)

**Objective:** Define `FilterState` in the new `DirectoryFilters.tsx` file (avoids a circular import — see below) and `matchesFilters` as an exported pure predicate in `ProfessionalsDirectory.tsx`. Both are the logic core for chip filtering — Task 2 and Task 3 consume them.

**Files:**

- Create: `app/profesionales/components/DirectoryFilters.tsx` (stub — full implementation in Task 2; define and export `FilterState` here)
- Modify: `app/profesionales/components/ProfessionalsDirectory.tsx`
- Modify: `app/profesionales/components/ProfessionalsDirectory.test.tsx`

**Key Decisions / Notes:**

- **Import direction to avoid circular dep:** `ProfessionalsDirectory.tsx` imports `DirectoryFilters` component AND `FilterState` type FROM `DirectoryFilters.tsx`. `DirectoryFilters.tsx` does NOT import from `ProfessionalsDirectory.tsx`. This is a clean one-way dependency graph.
- `FilterState` lives in `DirectoryFilters.tsx` because it describes the filter component's state shape. Export it from there; import it everywhere else.
- `matchesFilters` in `ProfessionalsDirectory.tsx` imports `FilterState` from `DirectoryFilters.tsx`.
- `matchesFilters` is a pure predicate like `matchesProfessional` at `ProfessionalsDirectory.tsx:55` — no side effects, fully unit-testable.
- Práctica filter: OR within dimension — pro must have at least one key in `filters.practices` inside its own `practices[]`; empty array = no filter applied.
- Especialidad filter: OR within dimension — same pattern with `filters.specialties`.
- Modalidad `'online'`: `pro.online_only === true` OR `pro.modality?.includes('online')`.
- Modalidad `'presencial'`: `pro.online_only === false` AND (modality empty/null OR `pro.modality?.includes('presencial')`). A professional with only `['online']` does NOT match presencial.
- Modalidad `'all'`: always passes.
- **Pre-check line count before any new code:** `wc -l app/profesionales/components/ProfessionalsDirectory.tsx`. If it is already above 370 lines, extract `ProfessionalCard` (lines 119–245) to `app/profesionales/components/ProfessionalCard.tsx` before adding anything. Current count is 333 — this pre-check prevents a mid-task refactor interruption if the estimate drifts.
- TDD: write the failing tests before adding `matchesFilters` to the source file.

```ts
// In DirectoryFilters.tsx — define and export:
export interface FilterState {
  practices: string[]
  specialties: string[]
  modality: 'all' | 'online' | 'presencial'
}

// In ProfessionalsDirectory.tsx — import FilterState from DirectoryFilters and add:
export function matchesFilters(pro: DirectoryProfessional, filters: FilterState): boolean {
  if (filters.practices.length > 0) {
    if (!pro.practices?.some(k => filters.practices.includes(k))) return false
  }
  if (filters.specialties.length > 0) {
    if (!pro.specialties?.some(s => filters.specialties.includes(s))) return false
  }
  if (filters.modality === 'online') {
    if (!pro.online_only && !pro.modality?.includes('online')) return false
  } else if (filters.modality === 'presencial') {
    if (pro.online_only) return false
    if (pro.modality && pro.modality.length > 0 && !pro.modality.includes('presencial')) return false
  }
  return true
}
```

**Definition of Done:**

- [ ] `FilterState` exported from `DirectoryFilters.tsx`; no circular import between the two files
- [ ] `matchesFilters` exported from `ProfessionalsDirectory.tsx` and passes: practice OR within dimension, specialty OR within dimension, modality online/presencial/all, AND across dimensions (practice + modality together)
- [ ] Verify: `npm test -- --reporter=dot 2>&1 | tail -5`

---

### Task 2: `DirectoryFilters` chip UI sub-component

**Objective:** Create `DirectoryFilters.tsx` — a pure presentational component that renders three filter rows (Práctica, Especialidad, Modalidad) and a "Limpiar filtros" link. It receives `filters: FilterState` and an `onChange` callback; it has no internal state.

**Files:**

- Create: `app/profesionales/components/DirectoryFilters.tsx`

**Key Decisions / Notes:**

- Pure presentational — no `useState`. Parent owns `FilterState`.
- Props interface:
  ```ts
  interface DirectoryFiltersProps {
    filters: FilterState
    onChange: (filters: FilterState) => void
    practiceOptions: Array<{ key: string; label: string }>
    specialtyOptions: string[]
  }
  ```
- Only render a row if there are ≥ 2 options (PRD rule). If `practiceOptions.length < 2`, skip the Práctica row entirely.
- **Reuse the existing `Chip` component** (`app/components/ui/Chip.tsx`) — do NOT write raw `<span>` chip markup. `Chip` already handles the visual token classes. Wrap each chip in a `<button>` that handles the click and pass `variant="brand"` (active) or `variant="neutral"` (inactive) + `className="cursor-pointer transition-colors"`. Example:
  ```tsx
  <button type="button" onClick={...} aria-pressed={isActive}>
    <Chip variant={isActive ? 'brand' : 'neutral'} label={label} className="cursor-pointer" />
  </button>
  ```
- Add `aria-pressed={isActive}` on the `<button>` wrapper for screen-reader active state.
- Práctica + Especialidad: clicking an active chip removes it from the array; clicking inactive adds it. Multi-select.
- Modalidad: single-select toggle — clicking active chip resets to `'all'`; clicking the other chip sets it.
- "Limpiar filtros" link: show only when `filters.practices.length > 0 || filters.specialties.length > 0 || filters.modality !== 'all'`. On click: `onChange({ practices: [], specialties: [], modality: 'all' })`.
- Rows layout: `<div className="flex flex-wrap gap-2">` — chips wrap naturally on all screen sizes.
- Row label: small muted uppercase label above chips (e.g., "PRÁCTICA", "ESPECIALIDAD", "MODALIDAD").
- No separate unit test — chip interaction is tested via the component integration test in Task 3.

**Definition of Done:**

- [ ] Component renders Práctica row only when `practiceOptions.length >= 2`
- [ ] Component renders Especialidad row only when `specialtyOptions.length >= 2`
- [ ] Modalidad row always renders (fixed 2 options: "Online", "Presencial")
- [ ] "Limpiar filtros" visible only when any filter active; calls `onChange` with all-reset state
- [ ] TypeScript compiles clean: `npx tsc --noEmit`
- [ ] Verify: `npx tsc --noEmit 2>&1 | grep -c error || echo 0 errors`

---

### Task 3: Wire into `ProfessionalsDirectory` + pagination + component tests

**Objective:** Connect `DirectoryFilters` into `ProfessionalsDirectory`, add `visibleCount` pagination (12 initial, +12 on "Cargar más"), update the `filtered` useMemo to combine text search with chip filters, and derive `specialtyOptions` from the professionals data. Extend the existing test file with chip interaction and pagination behavior tests.

**Files:**

- Modify: `app/profesionales/components/ProfessionalsDirectory.tsx`
- Modify: `app/profesionales/components/ProfessionalsDirectory.test.tsx`

**Key Decisions / Notes:**

- New state in `ProfessionalsDirectory`:
  ```ts
  const [filters, setFilters] = useState<FilterState>({ practices: [], specialties: [], modality: 'all' })
  const [visibleCount, setVisibleCount] = useState(12)
  ```
- Derive specialty options once:
  ```ts
  const specialtyOptions = useMemo(() =>
    [...new Set(professionals.flatMap(p => p.specialties ?? []))].sort()
  , [professionals])
  ```
- Updated `filtered` useMemo — compose both predicates:
  ```ts
  const filtered = useMemo(() => {
    const q = searchValue.trim()
    return professionals.filter(pro =>
      matchesProfessional(pro, q, practiceIndex) && matchesFilters(pro, filters)
    )
  }, [professionals, searchValue, practiceIndex, filters])
  ```
- Reset visibleCount when any filter/search changes — add `useEffect`:
  ```ts
  useEffect(() => { setVisibleCount(12) }, [searchValue, filters])
  ```
- Visible slice and "Cargar más":
  ```ts
  const visiblePros = filtered.slice(0, visibleCount)
  const remaining = filtered.length - visibleCount
  ```
- "Cargar más" button: `remaining > 0`. Label: `"Cargar más (${remaining} restantes)"`. On click: `setVisibleCount(c => c + 12)`.
- **Unified result count** — replace the existing `{isSearching && ...}` block with a single expression. `const showCount = isSearching || hasActiveFilters`. When `showCount` is true, always render `"{filtered.length} de {professionals.length} resultados"`. This format works for search-only, filter-only, and combined cases. Remove the existing `{resultCount === 1 ? '1 resultado' : ...}` singular path — one format, no branching.
- `hasActiveFilters` helper: `filters.practices.length > 0 || filters.specialties.length > 0 || filters.modality !== 'all'`
- Wire `DirectoryFilters` between the search input and the `aria-live` results region:
  ```tsx
  <DirectoryFilters
    filters={filters}
    onChange={setFilters}
    practiceOptions={practices.map(p => ({ key: p.key, label: p.label }))}
    specialtyOptions={specialtyOptions}
  />
  ```
- File size check: after edits, verify `ProfessionalsDirectory.tsx` stays under 440 lines. If it exceeds, extract `ProfessionalCard` to its own file first.
- Import `useEffect` from React (currently only `useState` and `useMemo` are imported).
- TDD: write failing tests for `matchesFilters` scenarios (in Task 1's test additions) and failing tests for pagination + filter behaviors before wiring.

**Component tests to add (extend existing `describe('ProfessionalsDirectory component')`):**

```ts
it('shows 12 professionals initially when more than 12 exist')
it('"Cargar más" appends 12 more and hides when all shown')
it('visibleCount resets to 12 when a filter chip is applied')
it('shows "N de M resultados" when any chip filter is active')
it('"Limpiar filtros" is not visible when no filter is active')
```

**Definition of Done:**

- [ ] Directory renders max 12 cards on load; "Cargar más (N restantes)" appears when total > 12
- [ ] Clicking "Cargar más" appends 12 more cards without re-fetching or scroll jump
- [ ] Active practice chip filters grid to matching professionals (OR within dimension)
- [ ] Active modalidad chip (Online or Presencial) filters correctly
- [ ] "Limpiar filtros" resets all chip filters, preserves search text, restores full grid
- [ ] visibleCount resets to 12 when search or any chip filter changes
- [ ] All existing 22 tests still pass (no regressions)
- [ ] Verify: `npm test -- --reporter=dot 2>&1 | tail -5`
