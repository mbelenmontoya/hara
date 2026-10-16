# Almanac Home Page (/) Implementation Plan

Created: 2026-10-02
Author: mariabmontoya@gmail.com
Agent: Claude Code
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Visiting `/` shows the almanac home (Claude Design 7a) on a phone: masthead, date and moon phase, "¿Cómo llegas hoy?" with four cards that re-sort the list below, a dark concierge block, a featured professional and a list of professionals, all from real data.

## Out of Scope

- The bottom navigation bar (Inicio, Buscar, Diario, Ayuda). The global `SiteHeader` is untouched and stays hidden on `/` as it is today.
- A personal greeting ("Hola, Ana."): there are no accounts, so the greeting is just "Hola."
- Other screens (9a to 9g). The directory at `/profesionales` stays as it is.
- Photo upload slots from the design: professionals use their existing `profile_image_url`, with an initial as fallback.

## Approach

**Chosen:** Replace the `redirect('/profesionales')` in `app/page.tsx` with a server page that loads active professionals like `app/profesionales/page.tsx:15-31`, resolves each one's curated specialties with `resolveProfileSpecialties` (`lib/profile-specialties.ts`), and hands plain data to one client component that owns the "which card is selected" state.
**Why:** It reuses the practice-to-specialty mapping you built, so the four cards are the four curated specialties with the most professionals (nothing invented), at the cost of the cards changing as the directory grows.

## Context for Implementer

Fonts and tokens are opt-in per page: use `font-almanac`, `font-almanac-serif` and `almanac-label` from `app/globals.css`, never new hexes. Headings (`h1..h6`) get the global Poppins rule, so any heading that needs almanac font or weight must use those unlayered classes. Specialty colors come from `SPECIALTY_COLORS` in `lib/design-constants.ts:99`. Design assets are whole-artboard SVG sheets; always view each one rendered before relying on it (the `destello` file rendered as a dot).

## File Structure

- `lib/moon-phase.ts` (create) — pure: `getMoonPhase(date)` and `formatAlmanacDate(date)` in Spanish.
- `lib/home-arrival.ts` (create) — pure: builds the four cards and the list view-models from professionals.
- `app/HomeArrival.tsx` (create) — client: card grid, selected state, list.
- `app/HomeFeatured.tsx`, `app/HomeConcierge.tsx` (create) — presentational blocks.
- The list shows at most 8 people besides the featured one (design shows a handful; "Ver todos" leads to the directory).
- `app/page.tsx` (modify) — server data loading and assembly.
- `public/assets/almanac/*.svg` (create) — orbit, three dots, moon.

## Progress Tracking

- [x] Task 1: Date line with moon phase, and the SVG assets
- [x] Task 2: Home data layer (price format, four cards, list view-models)
- [x] Task 3: Home components and page assembly
- [x] Task 4: Sync the stale home e2e test and verify in the browser

## Implementation Tasks

### Task 1: Date line with moon phase, and the SVG assets

**Objective:** Produce the almanac date line ("MARTES 2 · OCTUBRE" plus the moon phase name) from code, and bring in the four brand SVGs the home uses. Verified by TS-001.

**Files:**

- Create: `lib/moon-phase.ts`
- Test: `lib/moon-phase.test.ts`
- Create: `public/assets/almanac/orbita_punteada-cream.svg`, `tres_puntos-cream.svg`, `luna_creciente-ink.svg` (the masthead uses the existing `public/assets/logo/logoreduccion.png`, which is the same HARA wordmark, so `wordmark-ink.svg` was not needed)

**Key Decisions / Notes:**

- Moon phase: days since the known new moon of 2000-01-06 18:14 UTC modulo the synodic month (29.530588 days), mapped to the 8 phase names in Spanish (Luna nueva, Luna creciente, Cuarto creciente, Gibosa creciente, Luna llena, Gibosa menguante, Cuarto menguante, Luna menguante). Approximate within about a day, which is fine for a decorative line.
- The date comes from the server render in `America/Argentina/Buenos_Aires` time zone so it does not flip at UTC midnight; `formatAlmanacDate` returns uppercase weekday, day and month with `Intl.DateTimeFormat('es-AR')`.
- Assets: fetch each from Claude Design (`DesignSync get_file`, path `assets/<name>`), strip the embedded `<metadata>` block, save under `public/assets/almanac/`, then load each one in the browser alone. If one renders wrong (like `destello`), do not ship it: use an existing PNG in `public/assets/logo/` for the wordmark, or an inline SVG for the dots.
- The crescent icon is only shown when the phase is `Luna creciente`; for other phases the line shows the name only (the design only has the crescent artwork).

**Definition of Done:**

- [ ] `getMoonPhase` returns the right phase for known dates: 2000-01-06 18:14 UTC is Luna nueva, 2024-01-25 17:54 UTC is Luna llena, 2024-01-18 03:53 UTC is Cuarto creciente, and a date 3 days after a new moon is Luna creciente
- [ ] `formatAlmanacDate` returns e.g. `JUEVES 2 · OCTUBRE` for 2025-10-02 and uses Argentina time (23:30 on Oct 1 in Buenos Aires is still Oct 1, even though UTC is Oct 2)
- [ ] Each shipped SVG renders as the intended shape when opened alone in the browser
- [ ] Verify: `npx vitest run --project unit moon-phase`

### Task 2: Home data layer (price format, four cards, list view-models)

**Objective:** Turn the active professionals into what the home needs: the four most common curated specialties as cards with counts, and for each professional a ready-to-render row (name, practice, place, price, rating, photo, specialty keys). Verified by TS-001 and TS-002.

**Files:**

- Create: `lib/home-arrival.ts`
- Test: `lib/home-arrival.test.ts`

**Key Decisions / Notes:**

- `formatHomePrice` lives in `lib/home-arrival.ts` and prints `$850`, `desde $850` for a range, `hasta $1.200`, `US$` for non-ARS. `ProfessionalCard` is left untouched (it has its own range format).
- `buildHomeData(pros, catalog)` calls `resolveProfileSpecialties` per professional (`lib/profile-specialties.ts`), counts specialty keys across professionals, and returns the 4 keys with the highest count (ties broken by `SPECIALTY_MAP` order) plus `{ key, label, count }` each.
- Row fields come from the same query as the directory (`app/profesionales/page.tsx:18-24`); practice label is the first resolved practice from the catalog; "where" is city and country or "Solo online".
- Featured professional: the first one that is `isEffectivelyDestacado` (`lib/ranking.ts:76`) and has a photo; otherwise the first by ranking. Everyone else goes to the list, so the featured one never appears twice.
- Selecting a card filters the rows to professionals whose resolved specialties include that key, keeping ranking order. If fewer than 2 match, show whatever matches (no padding with unrelated people).

**Definition of Done:**

- [ ] With professionals whose resolved specialties are known, `buildHomeData` returns exactly the 4 most common keys, with the right counts and labels, and in descending count order
- [ ] Filtering by a card returns only professionals that have that specialty, in the original ranking order, and the featured professional is excluded from the list
- [ ] A professional with free-text specialties that match no practice contributes to no card and is never shown a raw free-text label
- [ ] Verify: `npx vitest run --project unit home-arrival`

### Task 3: Home components and page assembly

**Objective:** Build the visible home: masthead with wordmark, date and moon line, the headline with the italic "llegas", the 2x2 cards that re-sort the list, the list, then the dark concierge block (moved below the list at the user's request) linking to `/solicitar`, the featured card with a tracked "Escribirle" button, and the list of rows linking to each profile. Verified by TS-001, TS-002 and TS-003.

**Files:**

- Modify: `app/page.tsx`
- Create: `app/HomeArrival.tsx`, `app/HomeFeatured.tsx`, `app/HomeConcierge.tsx`
- Test: `app/HomeArrival.test.tsx`

**Key Decisions / Notes:**

- `app/page.tsx` is a server component with `export const dynamic = 'force-dynamic'`, same data pattern and error logging as `app/profesionales/page.tsx` (`logError` from `lib/monitoring`, return empty on failure). It selects the WhatsApp number only for the featured professional, not for the whole list.
- `HomeArrival` (client) holds `selectedKey` (default: none, so everyone is listed under "Todos los profesionales"; tapping the selected card again clears it) and renders cards plus the list; cards are `<button>`s with `aria-pressed`. Selected card gets `ring-2 ring-brand-dark` and `shadow-elevated`; unselected cards use the specialty `bg-*-weak` from `SPECIALTY_COLORS`.
- Featured block: "Escribirle" links to `/p/<slug>` (where the tracked WhatsApp button lives) instead of opening WhatsApp directly, so the home page never ships every professional's phone number to the browser; the second element shows the price. Deviation from the design noted for the user. Rows link to `/p/<slug>` and show initial-on-blush when there is no photo.
- Empty states: no professionals at all, hide the featured block and list and show a short Spanish line plus the concierge block; selected card with no match shows "Todavía no hay profesionales para esto. Probá el concierge." with a link to `/solicitar`.
- Page is mobile first: one column `max-w-md`, widening to `md:max-w-xl` centered; no horizontal scroll at 360px. All copy in Argentine Spanish (vos). Copy uses Argentine vos per `CLAUDE.md`, so the design's tuteo became "¿Cómo estás hoy?" (the user chose "estás" over "llegás"), "¿No sabés qué necesitás?" and "Contanos".
- No `console.log`; component files under 300 lines.

**Definition of Done:**

- [ ] `/` renders (no redirect) with the masthead, date line, headline, four cards, concierge block and list from real data
- [ ] Tapping a card marks it pressed and changes the list heading ("Para <label>") and rows to that specialty's professionals; tapping the selected card again clears it and lists everyone
- [ ] "Cuéntanos →" goes to `/solicitar`, "Ver todos" to `/profesionales`, each row to its `/p/<slug>`
- [ ] The featured "Escribirle" button goes to that professional's profile page, and no WhatsApp number appears anywhere in the home page HTML
- [ ] Verify: `npx vitest run --project unit HomeArrival && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/"`

### Task 4: Sync the stale home e2e test and verify in the browser

**Objective:** The existing e2e test TS-004 in `__tests__/e2e/directory.spec.ts:176` expects a "Ver profesionales" link on `/`, written for when `/` redirected; update it to the new "Ver todos" link, then check the real page in the browser.

**Files:**

- Modify: `__tests__/e2e/directory.spec.ts`

**Key Decisions / Notes:**

- One-line change of the link name regex to `/ver todos/i`; the click still lands on `/profesionales`. The Playwright suite needs a DB and server, so it is not run here; verification is the browser pass below.

**Definition of Done:**

- [ ] The e2e test targets the "Ver todos" link on `/`
- [ ] Browser check on `http://localhost:3000/` with real data covers TS-001 to TS-003
- [ ] Verify: `npm run test:unit` (full suite, 0 failures)

## E2E Test Scenarios

### TS-001: Home on a phone
**Priority:** Critical
**Preconditions:** Dev server on port 3000 with the real `.env.local`; viewport about 390px wide
**Mapped Tasks:** Task 1, Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/` | No redirect; wordmark, today's date line with a moon phase name, "Hola." and "¿Cómo llegas hoy?" with an italic terracotta "llegas" |
| 2 | Look at the cards | Four cards labeled with curated specialty names and counts like "N profesionales" |
| 3 | Scroll to the end | Concierge block, featured professional, list; no horizontal scroll |

### TS-002: Cards re-sort the list
**Priority:** Critical
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap the second card | It shows as pressed; the list heading becomes "Para <that label>"; tapping it again clears it back to "Todos los profesionales" |
| 2 | Compare rows | Every row's profile page lists that specialty in "Para cuando llegas con" |
| 3 | Tap "Ver todos" | Lands on `/profesionales` |

### TS-003: Concierge and links
**Priority:** High
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap "Cuéntanos →" | Lands on `/solicitar` |
| 2 | Back, tap a list row | Lands on that professional's `/p/<slug>` page in the almanac style |
| 3 | Back, tap the featured "Escribirle" | Lands on that professional's profile, where the WhatsApp button is |

## Open Questions

- The design's featured block shows the professional's own sentence as a quote. We use `short_description`, which for some professionals is a list of practices (Deborah's is). Left as is unless you want a length or format rule.
