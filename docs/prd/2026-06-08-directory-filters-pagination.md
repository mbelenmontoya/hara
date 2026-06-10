# Directory Filters + Pagination

Created: 2026-06-08
Author: belu.montoya@dialpad.com
Agent: Claude Code
Category: Feature
Status: Draft
Research: Quick

## Problem Statement

The `/profesionales` directory today has a single free-text search bar. As the number of professionals grows toward 50–200, users with a specific intent — "quiero alguien online", "quiero reiki", "tengo ansiedad" — have no fast way to narrow the list without typing. The result: more scrolling, less confidence, lower contact rate. This PRD adds filter chips for Práctica, Especialidad, and Modalidad, plus a "Cargar más" pagination pattern so the page doesn't dump 150 cards at once.

## Core User Flows

### Flow 1: Filter by modality (most common friction point)

1. User opens `/profesionales`
2. Sees a Modalidad row: **Online · Presencial** chips below the search bar
3. Taps "Online" — chip highlights in brand violet
4. Grid immediately shows only online professionals (those with `online_only=true` or `modality` includes 'online')
5. Result count updates: "12 de 34 resultados"
6. User taps a card → goes to `/p/[slug]`

### Flow 2: Filter by practice

1. User opens `/profesionales`
2. Sees a Práctica row with chips: Reiki · Masajes terapéuticos · Constelaciones familiares · …
3. Taps "Reiki" — chip highlights
4. Grid filters to professionals whose `practices` array includes `reiki`
5. User can also tap a second practice chip — OR logic within the same dimension (either reiki OR masajes)

### Flow 3: Combine filters + search

1. User selects "Online" modality filter AND "Reiki" practice chip
2. Then types "Buenos Aires" in the search bar
3. Grid shows only professionals matching ALL three conditions (AND across dimensions, OR within each dimension's multi-select)
4. Result count shows "3 de 34 resultados"
5. User clears filters with the "Limpiar filtros" link → search value stays, filters reset

### Flow 4: Pagination

1. Directory loads 12 professional cards
2. User scrolls to bottom — sees "Cargar más (22 restantes)" button
3. Taps → 12 more cards append, no reload, no scroll jump
4. When all cards are visible, button disappears
5. If filters change, visible count resets to 12 automatically

## Scope

### In Scope

- **Práctica filter chips** — one chip per active practice from the catalog, rendered as a horizontally scrollable row on mobile, wrapping row on desktop; multi-select (OR within practice); chips sourced from the existing `practices` catalog already passed to `ProfessionalsDirectory`
- **Especialidad filter chips** — derived from unique specialty strings across all active professionals; same multi-select pattern; OR within specialty
- **Modalidad filter chips** — two fixed options: "Online" and "Presencial"; single-select (picking one deselects the other); "Online" matches `online_only=true` OR `modality` includes `'online'`; "Presencial" matches `online_only=false` AND (`modality` includes `'presencial'` OR modality is empty)
- **Cross-dimension AND logic** — active filters across different dimensions AND together; active filters within the same dimension OR together
- **"Limpiar filtros" link** — appears whenever any chip filter is active; resets all chips but preserves the search text
- **Result count** — shown whenever search OR any filter is active; format: `"N resultados"` or `"N de M resultados"` when subset
- **"Cargar más" pagination** — initial visible count 12, increments of 12; button label: `"Cargar más (N restantes)"`; visible count resets to 12 on any filter/search change
- **Filter chip section visibility** — only render a filter row if there are ≥ 2 options to show (don't render a "Práctica" row with 0 or 1 chip)

### Explicitly Out of Scope

- Server-side filtering or pagination — architecture stays client-side (fetch all, filter in-memory) given the 50–200 professional scale target
- Location / city filter — deferred; the Online/Presencial modality toggle covers the most actionable location intent
- Price range filter — deferred; not enough pricing data populated yet to be useful
- URL-based filter state (shareable filtered links) — deferred; "Cargar más" doesn't need persistent URL state at this scale
- Filter count badges on chips (e.g., "Reiki (4)") — deferred; adds complexity without clear user value at this scale
- Practice aliases visible as chips — the chips show the practice label only; alias matching is already handled by the search bar

## Technical Context

- **Relevant architecture:** `ProfessionalsDirectory.tsx` is the sole client island for the directory. Today it holds one piece of state (`searchValue: string`) and one `useMemo` for filtering. The filter state must be extended to include: `activePractices: string[]`, `activeSpecialties: string[]`, `activeModality: 'all' | 'online' | 'presencial'`, plus `visibleCount: number` for pagination.
- **Data already available:** `DirectoryProfessional` already includes `practices: string[] | null`, `specialties: string[] | null`, `online_only: boolean`, `modality: string[] | null`. No new DB fields needed.
- **Práctica chip source:** the `practices: Practice[]` prop is already passed from `page.tsx`. Use `getActivePractices()` list as the chip source — same data, no new fetch.
- **Especialidad chip source:** derive unique specialty strings from the `professionals` array at component mount: `[...new Set(professionals.flatMap(p => p.specialties ?? []))]`. Sort alphabetically. Do NOT fetch from DB.
- **Existing filter predicate:** `matchesProfessional(pro, query, practiceIndex)` in `ProfessionalsDirectory.tsx` handles text search. The new multi-dimension filter wraps this predicate — text search AND chip filters are composed together.
- **Reset pattern:** whenever `searchValue`, `activePractices`, `activeSpecialties`, or `activeModality` changes, reset `visibleCount` to 12. Use a `useEffect` watching these deps, or compute inside the `useMemo` result.
- **File size:** `ProfessionalsDirectory.tsx` is currently 333 lines. After this feature it will likely hit 450–500 lines. If it crosses 500, extract the filter chip UI into a `DirectoryFilters.tsx` sub-component to stay within the 440-line guideline.
- **No changes to** `page.tsx`, `getProfessionals()`, or any DB query.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Client-side vs. server-side | Client-side | 50–200 professionals fits in memory; avoids extra DB complexity and keeps the architecture simple |
| Pagination pattern | "Cargar más" append | Natural on mobile, no scroll jump, easy to implement; URL pagination deferred until needed |
| Initial page size | 12 | Standard grid multiple (2-col = 6 rows, 1-col = 12 cards visible before fold) |
| Location filter | Modalidad only (Online/Presencial) | Most actionable location signal; city filter deferred until meaningful city distribution exists |
| Multi-select within dimension | OR | "Quiero reiki OR masajes" is a natural user intent; AND would over-filter |
| Cross-dimension logic | AND | "Online AND reiki" — combining dimensions should narrow, not expand |
| Especialidad source | Derived from professionals data | No new DB fetch; self-updating as professionals add specialties |
| Práctica source | Existing catalog prop | Already fetched, consistent labels, includes all active practices |
