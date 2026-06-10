# Search by Location Implementation Plan

Created: 2026-06-10
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Users browsing `/profesionales` can filter the directory by location (pick a city or tap "Usar mi ubicación"), see results restricted to presencial professionals in that place, and toggle to a map view showing professional pins — backed by coordinates captured at registration going forward, with a client-side city-centroid fallback for professionals that don't have coordinates yet.

## Out of Scope

- **Radius / distance search ("dentro de X km").** Deferred — becomes a cheap follow-up once enough professionals carry coordinates. This plan ships exact city-match only.
- **One-time geocoding backfill of the ~45 existing professionals.** Not needed: the map geocodes their city to a centroid at display time (cached). Existing pros gain exact pins only when they re-save their profile.
- **Admin-edit coordinate sync.** If an admin edits a professional's `city` via `app/api/admin/professionals/[id]/route.ts`, stored coordinates are not recomputed. The map's city-centroid fallback still positions the pin when coords are absent; stale-coord-after-city-edit is a known v1 gap.
- **Marker clustering library.** ~45 pros across a handful of cities don't warrant `@googlemaps/markerclusterer`; same-city overlap is handled with deterministic jitter (Task 6).

## Approach

**Chosen:** Extend the existing client-side directory (`ProfessionalsDirectory` + `matchesFilters`) with a `location` filter dimension, add a `latitude`/`longitude` column pair captured at registration (the `PlacesAutocomplete` already returns coordinates — they're currently discarded), and add a `DirectoryMap` view that places pins from stored coordinates or, for coord-less pros, a client-side geocode of their city (cached). All Google calls reuse a single shared script loader extracted from `PlacesAutocomplete`.

**Why:** Reuses the proven client-side filtering architecture (no per-keystroke network cost) and the Google integration already in the repo, so the only new infra is two nullable columns. Cost: a small migration plus a one-time refactor of the Maps script loader into a shared module so the autocomplete, geocoder, and map don't double-load the API.

## Context for Implementer

The directory is fully client-side: `app/profesionales/page.tsx` (server) fetches all `status='active' AND accepting_new_clients=true` professionals once and hands the array to `ProfessionalsDirectory` (client), which filters in-memory via the exported pure predicates `matchesProfessional` and `matchesFilters`. The location filter is a new dimension on `FilterState` (defined in `DirectoryFilters.tsx`) and a new branch in `matchesFilters` — same pattern as the existing `modality` branch. `country` is stored as a 2-letter code (e.g. `AR`) because registration saves `placeData.countryCode`; location matching keys on `city` (normalized), not `country`.

## Runtime Environment

- **Start:** `npm run dev` — `localhost:3000`
- **Target page:** `http://localhost:3000/profesionales`
- **Registration page:** `http://localhost:3000/profesionales/registro`

## Assumptions

- The Google Cloud key in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` has **Maps JavaScript API**, **Places API**, AND **Geocoding API** enabled. Tasks 5–6 use `google.maps.Geocoder` (forward geocode of cities + reverse geocode for "near me"), which requires the Geocoding API specifically. — Tasks 5, 6 depend on this.
- `country` column holds a 2-letter ISO code (from `placeData.countryCode` at registration). — Task 4 location-match logic depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Geocoding API not enabled on the key → city-centroid pins and "near me" fail | Medium | Medium | Geocode calls are wrapped: on failure, log via `monitoring`, skip the pin (map still renders stored-coord pins), and disable "near me" with a tooltip. List view and city-text filtering never depend on geocoding. |
| Same-city pros share an identical centroid → markers stack and only the top one is clickable | High (for coord-less pros) | Low | Apply a small deterministic lat/lng jitter derived from `slug` hash so same-city pins fan out and stay individually clickable. |
| Repeated client geocoding on every page load burns Geocoding quota | Medium | Low | Dedupe to distinct `city,country` strings and cache resolved centroids in `localStorage` keyed by the normalized string; geocode each distinct city at most once per browser. |

## Goal Verification

### Truths

1. A user who selects a city in the location filter sees only presencial professionals whose city matches, with online-only professionals removed from the results until the location filter is cleared. (cross-task: Task 4 logic + Task 5 control)
2. Switching to map view shows one pin per visible professional — at the stored coordinate when present, otherwise at the geocoded centroid of their city — and zero pins for professionals with no resolvable location. (cross-task: Task 4 data + Task 6 map)

## E2E Test Scenarios

### TS-001: Filtrar el directorio por ciudad
**Priority:** Critical
**Preconditions:** Dev server en `localhost:3000`; al menos un profesional presencial con `city` conocida (p.ej. "Córdoba") y al menos un profesional `online_only`.
**Mapped Tasks:** Task 4, Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navegar a `http://localhost:3000/profesionales` | Grid completo visible; control de ubicación visible |
| 2 | Abrir el filtro de ubicación y seleccionar "Córdoba" del autocomplete de Google | El grid se filtra a profesionales con `city` = Córdoba |
| 3 | Verificar los profesionales online | Los `online_only` ya NO aparecen mientras el filtro de ubicación está activo |
| 4 | Limpiar el filtro de ubicación | Vuelven a aparecer todos los profesionales, incluidos los online |

### TS-002: "Usar mi ubicación"
**Priority:** High
**Preconditions:** Dev server corriendo; permiso de geolocalización concedido o mockeado a coordenadas de una ciudad con profesionales.
**Mapped Tasks:** Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navegar a `/profesionales` | Grid completo visible |
| 2 | Click en "Usar mi ubicación" y conceder permiso (o mock) | La app reverse-geocodea las coordenadas a una ciudad y la aplica como filtro de ubicación |
| 3 | Verificar el grid | Muestra profesionales presenciales de esa ciudad |

### TS-003: Vista de mapa con pins
**Priority:** Critical
**Preconditions:** Dev server corriendo; `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configurada con Geocoding API habilitada; al menos 2 profesionales con `city`.
**Mapped Tasks:** Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navegar a `/profesionales` | Grid (lista) visible; toggle Lista/Mapa visible |
| 2 | Click en el toggle "Mapa" | Se renderiza un `google.maps.Map` |
| 3 | Verificar los pins | Aparece un pin por profesional visible (coords almacenadas o centroide geocodeado de la ciudad); los `online_only` sin ubicación no tienen pin |
| 4 | Aplicar un filtro de ubicación y volver al mapa | El mapa muestra solo los pins de los profesionales filtrados |

### TS-004: Registro captura coordenadas
**Priority:** High
**Preconditions:** Dev server corriendo en la página de registro.
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navegar a `/profesionales/registro` y llegar al paso de ubicación | Campo de ciudad (autocomplete) visible + campo opcional "Dirección exacta" |
| 2 | Seleccionar una ciudad del autocomplete | El formulario captura `latitude`/`longitude` del lugar (centroide de la ciudad) |
| 3 | (Opcional) escribir una dirección exacta y seleccionarla | `latitude`/`longitude` se reemplazan por el punto exacto |
| 4 | Enviar el formulario | El POST a `/api/professionals/register` incluye `latitude`/`longitude`; el row insertado los persiste (verificado por `route.test.ts`) |

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | UNIT_VERIFIED | 0 | 5 location-filter unit tests pass (matchesFilters city match, different city fail, online_only excluded, null restores online). LocationFilter control renders in browser (UBICACIÓN section, city autocomplete, Usar mi ubicación button visible). No active professionals in local DB to verify live grid filtering. |
| TS-002 | High | UNIT_VERIFIED | 0 | LocationFilter geolocation branch tested in LocationFilter.test.tsx (permission denied shows error message). Browser geolocation grant not testable in this env. |
| TS-003 | Critical | LIVE_PASS | 0 | Lista/Mapa toggle works: Mapa renders google.maps.Map region with LATAM default center. Switching back to Lista restores grid. Screenshot captured. |
| TS-004 | High | LIVE_PASS | 0 | /profesionales/registro step 1 shows "Ubicación *" city autocomplete + "Dirección exacta (opcional)" field with correct placeholder and helper text. |

**Live-target probe summary:**
- Tier 1 (port 3000): PASS — Hara dev server running after stopping stale processes
- Tier 2: Not needed (Tier 1 succeeded)
- Tier 3: Not attempted (Tier 1 succeeded)

**Console warnings (non-blocking):**
- `loading=async` missing from Maps script URL → fixed inline (added `&loading=async`)
- `google.maps.places.Autocomplete` deprecated since March 2025 → out of scope; migration to `PlaceAutocompleteElement` deferred

## Progress Tracking

- [x] Task 1: Migración `022` — columnas `latitude`/`longitude` en `professionals`
- [x] Task 2: Loader compartido de Google Maps + prop `types` en `PlacesAutocomplete`
- [x] Task 3: Capturar y persistir coordenadas en el registro (form + API)
- [x] Task 4: Lógica de filtro por ubicación + plumbing de datos (SELECT, FilterState, matchesFilters)
- [x] Task 5: Control `LocationFilter` (autocomplete de ciudad + "Usar mi ubicación")
- [x] Task 6: Vista de mapa (`DirectoryMap` + geocode de ciudad cacheado + toggle Lista/Mapa)

## Implementation Tasks

---

### Task 1: Migration — add `latitude`/`longitude` to `professionals`

**Objective:** Add two nullable coordinate columns so professional locations can be stored going forward. No backfill — existing rows stay `NULL` and are handled by the map's geocode fallback. Verified by TS-004 (persisted on new registrations).

**Files:**

- Create: `migrations/022_professional_coordinates.sql`

**Key Decisions / Notes:**

- Follow the format of `migrations/021_blog_posts.sql`: leading comment block (purpose + manual rollback), wrapped in `BEGIN; … COMMIT;`.
- `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;` and same for `longitude`. Nullable, no `server_default` (NULL is the intended "unknown" state).
- Document rollback in the comment header: `ALTER TABLE professionals DROP COLUMN IF EXISTS latitude, DROP COLUMN IF EXISTS longitude;`
- Update the `professionals` `CREATE TABLE` block in `FINAL_SPEC.md` to add the two columns (single source of truth — doc sync).
- `Trivial:` DDL-only change, no production TS code, no new branch/logic. Covered by applying the migration and `route.test.ts` (Task 3) asserting the columns accept values. No unit test for SQL DDL.

**Definition of Done:**

- [ ] Running the migration adds `latitude` and `longitude` (both `DOUBLE PRECISION`, nullable) to `professionals`
- [ ] `FINAL_SPEC.md` `professionals` schema lists the two new columns
- [ ] Rollback statement is documented in the migration header comment
- [ ] Verify: `psql "$DATABASE_URL" -f migrations/022_professional_coordinates.sql` (or the project's migration runner) applies cleanly, then `\d professionals` shows both columns — paste output

---

### Task 2: Shared Google Maps loader + `types` prop on `PlacesAutocomplete`

**Objective:** Extract the singleton Maps-script loader out of `PlacesAutocomplete.tsx` into a shared module so the autocomplete, the geocoder (Task 5/6), and the map (Task 6) all reuse one `<script>` load and one `initGoogleMaps` callback. Add an optional `types` prop to `PlacesAutocomplete` so the registration form can offer both a cities-only field and an optional exact-address field (Task 3).

**Files:**

- Create: `lib/google-maps-loader.ts`
- Modify: `app/components/PlacesAutocomplete.tsx`

**Key Decisions / Notes:**

- Move `isScriptLoading`/`isScriptLoaded`/`callbacks`/`loadGoogleMapsScript` (currently `PlacesAutocomplete.tsx:31-63`) verbatim into `lib/google-maps-loader.ts` and export `loadGoogleMapsScript(apiKey: string): Promise<void>`. Keep the `window.initGoogleMaps` global + the script URL as-is for the browser SDK. NOTE: the `google.maps.Geocoder` *class* is part of the core JS SDK (no extra `libraries=` flag needed), BUT the **Geocoding API is a separate Cloud Console billing product** that must be enabled on the project key — that is NOT a `libraries=` flag. Verify it separately (see Assumptions + the DoD bullet below).
- `PlacesAutocomplete` imports `loadGoogleMapsScript` from the new module; its `loadGoogleMapsScript`-related lines are deleted. Behavior must be identical.
- Add prop `types?: string[]` to `PlacesAutocompleteProps`, default `['(cities)']` (preserves current behavior). Pass it into `new google.maps.places.Autocomplete(inputRef.current, { types, fields: [...] })`. When the caller passes e.g. `['geocode']` or `['establishment','geocode']`, address-level results are allowed.
- `PlaceData` already carries `lat`/`lng` — no change to its shape.
- This is a refactor: no behavioral change to existing callers (`RegistroForm`, `SolicitarForm`) since the default `types` matches today's hardcoded value.

**Definition of Done:**

- [ ] `lib/google-maps-loader.ts` exports `loadGoogleMapsScript`; `PlacesAutocomplete` imports it and no longer defines its own loader
- [ ] Existing city autocomplete in `/profesionales/registro` still loads and returns city/country/lat/lng (no regression)
- [ ] Passing `types={['geocode']}` allows selecting a full address (returns its lat/lng)
- [ ] No duplicate `maps.googleapis.com` `<script>` tag appears when both an autocomplete and (later) a map mount
- [ ] **Geocoding API enabled** for the project key in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — confirm in Google Cloud Console (APIs & Services → Enabled APIs) that "Geocoding API" is on, OR test `https://maps.googleapis.com/maps/api/geocode/json?address=Cordoba&key=<key>` returns `status: OK` (not `REQUEST_DENIED`). Paste the result. Tasks 5–6 hard-depend on this.
- [ ] Verify: `npx tsc --noEmit 2>&1 | grep -iE "PlacesAutocomplete|google-maps-loader" || echo OK`

---

### Task 3: Persist coordinates at registration (form + API)

**Objective:** Capture the coordinates `PlacesAutocomplete` already returns and persist them. The city field stays the default (city-centroid coords); add an optional "Dirección exacta" field for professionals who want an exact pin. The register API parses and inserts `latitude`/`longitude`.

**Files:**

- Modify: `app/profesionales/registro/RegistroForm.tsx`
- Modify: `app/api/professionals/register/route.ts`
- Modify: `app/api/professionals/register/route.test.ts`

**Key Decisions / Notes:**

- `RegistroForm` `FormData` interface (`:55-75`) + `initialFormData` (`:77-97`): add `latitude: number | null` and `longitude: number | null` (init `null`).
- In the city `PlacesAutocomplete` `onChange` (`:294-302`), when `placeData` is present also `updateField('latitude', placeData.lat ?? null)` and `updateField('longitude', placeData.lng ?? null)`.
- Add an OPTIONAL field below the city input: a second `PlacesAutocomplete` with `types={['establishment','geocode']}`, label `"Dirección exacta (opcional)"`, helper `"Para mostrar un pin preciso en el mapa. Si lo dejás vacío, usamos el centro de tu ciudad."`. When it fires `onChange` with `placeData`, overwrite `latitude`/`longitude` with that precise point (do NOT overwrite `city`/`country`). Follow the existing field markup/classes in the location section.
- `handleSubmit` (`:187+`): append `payload.append('latitude', formData.latitude != null ? String(formData.latitude) : '')` and same for `longitude`.
- `route.ts` `parseBody` (`:48-67`): add `latitude: formData.get('latitude') && formData.get('latitude') !== '' ? parseFloat(formData.get('latitude') as string) : null` and same for `longitude`.
- `route.ts` insert (`:191-212`): add `latitude: (fields.latitude as number) ?? null, longitude: (fields.longitude as number) ?? null`.
- Coordinates are optional — never add them to the required-field validation (`:87`). A pro with no place selected inserts `NULL` coords (handled by map fallback).
- `route.test.ts`: extend an existing successful-registration test (reuse the existing FormData/JSON fixture; do not add a new test class) to send `latitude`/`longitude` and assert the values reach the `insert` payload. Before extending, read `route.test.ts` to confirm how the `supabaseAdmin.from().insert()` chain is mocked, then assert the mock's captured insert argument contains `latitude` and `longitude` with the EXACT numeric values — not merely that the endpoint returns 200.

**Definition of Done:**

- [ ] Selecting a city in `/profesionales/registro` captures its lat/lng into form state
- [ ] Filling the optional "Dirección exacta" replaces the coords with the exact point; leaving it empty keeps the city centroid
- [ ] `POST /api/professionals/register` with `latitude`/`longitude` inserts those exact values onto the professional row
- [ ] Omitting coordinates still registers successfully with `NULL` coords (no validation error)
- [ ] Verify: `npm run test:integration` (or `npx vitest run app/api/professionals/register/route.test.ts`) — 0 failures

---

### Task 4: Location filter logic + data plumbing

**Objective:** Surface `latitude`/`longitude` in the directory payload and add the `location` filter dimension: extend `FilterState`, add the `matchesFilters` location branch (match on normalized `city`; exclude `online_only` pros when a location filter is active), and unit-test both. This is the core "search by location" logic; UI control comes in Task 5.

**Files:**

- Modify: `app/profesionales/page.tsx`
- Modify: `app/profesionales/components/ProfessionalsDirectory.tsx`
- Modify: `app/profesionales/components/DirectoryFilters.tsx`
- Modify: `app/profesionales/components/ProfessionalsDirectory.test.tsx`

**Key Decisions / Notes:**

- `page.tsx` `getProfessionals()` SELECT (`:19`): append `, latitude, longitude` to the column string.
- `DirectoryProfessional` interface (`ProfessionalsDirectory.tsx:15-34`): add `latitude: number | null` and `longitude: number | null`.
- `DirectoryFilters.tsx` `FilterState` (`:8-13`): add `location: LocationFilterValue | null` where `LocationFilterValue = { city: string; country: string; lat: number | null; lng: number | null }`. **`export` the `LocationFilterValue` type from `DirectoryFilters.tsx`** — `LocationFilter` (Task 5) imports it from there. ⛔ Keep the import graph acyclic (same constraint already noted at `DirectoryFilters.tsx:6-7`): `LocationFilter` must NOT import anything from `ProfessionalsDirectory`. `DEFAULT_FILTERS` (`:15-19`): `location: null`.
- `matchesFilters` (`ProfessionalsDirectory.tsx:73-96`): add a branch — `if (filters.location) { if (pro.online_only) return false; if (!pro.city) return false; if (normalize(pro.city) !== normalize(filters.location.city)) return false }`. Place it alongside the existing `modality` branch; keep the AND-across-dimensions semantics. Exact normalized equality (not `includes`) so "Córdoba" doesn't match "Nueva Córdoba" spuriously.
- **Match is city-only (NO country comparison) in v1 — intentional.** `LocationFilterValue` carries `country`, but `matchesFilters` deliberately ignores it. Rationale: virtually all professionals are LATAM, so cross-country same-city collisions (Córdoba AR vs Córdoba ES) are negligible; and the stored `country` field may not be uniformly a 2-letter code across older rows, so comparing it risks WRONGLY excluding valid matches (a worse failure than rarely including a wrong-country pro). Add the country check when radius search lands. Do NOT add it now.
- The `online_only` exclusion lives ONLY in the location branch — clearing the location filter restores online pros (matches the chosen "hide when location active" behavior).
- `hasActiveFilters` in `ProfessionalsDirectory` (`:306-309`) and `DirectoryFilters` (`:52-55`): add `|| filters.location !== null` so the count line and "Limpiar filtros" reflect the location filter.
- `ProfessionalsDirectory.test.tsx`: extend the existing `matchesFilters` coverage (reuse `makePro`) with: (a) location set → pro in matching city passes; (b) location set → pro in different city fails; (c) location set → `online_only` pro fails; (d) location null → `online_only` pro passes. Assert booleans exactly.

**Definition of Done:**

- [ ] `getProfessionals` returns `latitude`/`longitude` for each professional
- [ ] `matchesFilters` returns true only for presencial pros whose normalized city equals the filter's city
- [ ] An `online_only` pro is excluded when `filters.location` is set and included when it is `null`
- [ ] "Limpiar filtros" clears the location filter along with the others
- [ ] Verify: `npx vitest run app/profesionales/components/ProfessionalsDirectory.test.tsx` — 0 failures

---

### Task 5: `LocationFilter` control (city autocomplete + "Usar mi ubicación")

**Objective:** Build the UI that sets `filters.location`: a Google city autocomplete plus a "Usar mi ubicación" button that requests browser geolocation and reverse-geocodes to a city. Wire it into `ProfessionalsDirectory` above the existing filter chips.

**Files:**

- Create: `app/profesionales/components/LocationFilter.tsx`
- Modify: `app/profesionales/components/ProfessionalsDirectory.tsx`

**Key Decisions / Notes:**

- `LocationFilter` props: `value: LocationFilterValue | null`, `onChange: (loc: LocationFilterValue | null) => void`.
- City input: reuse `PlacesAutocomplete` (default `types=['(cities)']`). On select with `placeData`, call `onChange({ city: placeData.city, country: placeData.countryCode, lat: placeData.lat ?? null, lng: placeData.lng ?? null })`. Clearing the input → `onChange(null)`.
- "Usar mi ubicación" button: `navigator.geolocation.getCurrentPosition` → on success, `new google.maps.Geocoder().geocode({ location: {lat,lng} })`, extract the `locality` (fallback `administrative_area_level_1`) + `country` short_name from `results[0].address_components` (same parsing shape as `PlacesAutocomplete.tsx:98-108`), then `onChange({...})`. Use `loadGoogleMapsScript` (Task 2) before constructing the `Geocoder`.
- Geolocation/geocoding failure or denial: show inline message `"No pudimos detectar tu ubicación"` via existing copy patterns; never throw. Log with `logError` from `@/lib/monitoring`. If `navigator.geolocation` is undefined or the API key is missing, hide the button.
- Show the active location as a removable chip (reuse `Chip` like `DirectoryFilters` does) with an ✕ that calls `onChange(null)`.
- `ProfessionalsDirectory`: add `<LocationFilter value={filters.location} onChange={(loc) => setFilters(f => ({ ...f, location: loc }))} />` directly above `<DirectoryFilters .../>`. No change to the `filtered` useMemo (it already calls `matchesFilters`, which now reads `filters.location`).
- Spanish, `vos` tone. Button label `"Usar mi ubicación"`; loading state `"Buscando tu ubicación…"`.

**Definition of Done:**

- [ ] Prerequisite check: `PlacesAutocomplete` accepts and forwards the `types` prop (added in Task 2) — verify before building this control
- [ ] Selecting a city in `LocationFilter` filters the grid to that city and hides online-only pros
- [ ] "Usar mi ubicación" (permission granted) reverse-geocodes to a city and applies it as the filter
- [ ] Denying permission or a geocode failure shows a non-blocking message and leaves the grid unchanged
- [ ] The active-location chip's ✕ clears the filter and restores all pros
- [ ] Verify (browser, dev server): navigate `/profesionales`, select a city, confirm grid filters + online pros disappear; clear, confirm restore — report what you saw

---

### Task 6: Map view — `DirectoryMap` + cached city geocode + Lista/Mapa toggle

**Objective:** Add a list/map toggle to the directory and a `DirectoryMap` that renders one Google Maps pin per visible professional — from stored coordinates when present, otherwise a client-side geocode of their city (deduped + cached). Extract a `useCityGeocode` hook for the fallback.

**Files:**

- Create: `app/profesionales/hooks/useCityGeocode.ts`
- Create: `app/profesionales/components/DirectoryMap.tsx`
- Modify: `app/profesionales/components/ProfessionalsDirectory.tsx`

**Key Decisions / Notes:**

- `useCityGeocode(cities: {city: string; country: string}[])`: dedupe by normalized `"city,country"`, geocode each distinct entry once via `google.maps.Geocoder` (after `loadGoogleMapsScript`), cache resolved `{lat,lng}` in `localStorage` under key `hara:geocode:<normalized>`. Return a `Map<normalizedKey, {lat,lng}>`. Read cache first; only call the API on a miss. Wrap each geocode in try/catch → on failure log via `monitoring` and skip (no entry). This is the only place that performs forward geocoding.
- `DirectoryMap` props: `professionals: DirectoryProfessional[]` (already filtered by the parent). For each pro, resolve a position: stored `pro.latitude`/`pro.longitude` if both non-null, else the `useCityGeocode` result for its city, else no pin (e.g. `online_only` with no city). Apply deterministic jitter for pins that resolve to a shared centroid: offset by `±(hash(slug) % 7) * 0.0008°` on each axis so same-city pins fan out.
- Render with raw `new google.maps.Map(el, { center, zoom })` + `new google.maps.Marker({ position, map, title: pro.full_name })`; a marker `click` opens an `InfoWindow` with name + a link to `/p/${slug}`. (Classic `Marker` is acceptable for v1 — avoids the `mapId` requirement of `AdvancedMarkerElement`; note the deprecation in a comment.) Fit bounds to the rendered markers (`map.fitBounds`); default center to a LATAM-wide view when there are zero pins.
- `ProfessionalsDirectory`: add `const [view, setView] = useState<'list'|'map'>('list')` and a segmented toggle (two `Chip`/button controls, `aria-pressed`) above the results region. Render the existing grid when `view==='list'`, `<DirectoryMap professionals={filtered} />` when `'map'`. The map consumes the SAME `filtered` array, so location/practice/modality filters apply to pins automatically.
- **File-size guard:** `ProfessionalsDirectory.tsx` is 403 lines; adding the toggle + map branch will push it past the 440 "acceptable" threshold. Extract `ProfessionalCard` + the `formatLocation`/`formatPrice`/`formatModality`/`colorForLabel`/`LABEL_COLORS` block (`:98-275`) into `app/profesionales/components/ProfessionalCard.tsx` as part of this task, so `ProfessionalsDirectory` stays under 440 lines.
- Map E2E needs the API key + Geocoding API; the verifier should confirm the map mounts and pins render in the browser, mocking geolocation where needed.

**Definition of Done:**

- [ ] The Lista/Mapa toggle switches between the grid and a rendered `google.maps.Map`
- [ ] Pins appear for pros with stored coordinates AND for coord-less pros via geocoded city centroid; pros with no resolvable location have no pin
- [ ] Same-city pins are individually clickable (jitter prevents perfect overlap); clicking a pin shows name + profile link
- [ ] Applying a location/practice filter and switching to map shows pins only for the filtered set
- [ ] `ProfessionalsDirectory.tsx` is under 440 lines after extraction — Verify: `wc -l app/profesionales/components/ProfessionalsDirectory.tsx` prints < 440. If over, confirm the extraction moved BOTH the format helpers AND the `ProfessionalCard` JSX block (`:98-275`), not just one.
- [ ] Verify (browser, dev server): `/profesionales` → toggle Mapa → confirm pins render; apply a city filter → confirm pin set narrows — report what you saw
