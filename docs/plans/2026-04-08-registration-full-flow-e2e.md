# Registration Full Flow E2E Test Implementation Plan

Created: 2026-04-08
Author: belu.montoya@dialpad.com
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Create a Playwright E2E test that exercises the complete 4-step professional registration form with image upload, verifies submission and DB record, captures screenshots at key moments, and cleans up after.

**Architecture:** Single test file in `__tests__/e2e/` running in the `public` Playwright project (no auth needed). Uses a lightweight Google Maps mock script via route interception to make the PlacesAutocomplete component work with fake location data. Uses Playwright's native `setInputFiles()` for image upload. Verifies DB state by intercepting the API response. Cleans up via `@supabase/supabase-js` client (DB row + Storage image).

**Tech Stack:** Playwright, `@supabase/supabase-js` (for cleanup)

## Scope

### In Scope

- Complete 4-step form walkthrough (Step 0–3)
- Google Places mock via `page.route()` + `route.fulfill()` with mock script
- Image upload via `page.setInputFiles()`
- Form submission and redirect verification
- DB record verification via API response interception
- Screenshots at key moments (each step, confirmation)
- Cleanup: delete test professional row + Storage image from Supabase after test
- Negative assertion: "Enviar solicitud" disabled before bio is filled

### Out of Scope

- Email notification verification (Resend — would require test mailbox)
- Google Places widget interaction (mocked)
- Existing `registration-flow.spec.ts` — kept as-is

## Approach

**Chosen:** Google Maps mock script via `route.fulfill()` + single test() call
**Why:** The PlacesAutocomplete component (line 76) checks `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` at render time. If set (likely in `.env.local`), it loads Google Maps via a `<script>` tag with `callback=initGoogleMaps`. We intercept this request with `route.fulfill()` and return a minimal mock script that: (1) defines `window.google.maps.places.Autocomplete`, (2) calls `window.initGoogleMaps()`, (3) fires `place_changed` with Buenos Aires data when the consumer calls `.addListener()`. This makes the real `place_changed` handler in the form run, correctly setting `city`, `country`, `countryCode`, and auto-switching `phoneCountry`. If the API key is NOT set, the component renders a plain input — in that case we fall back to direct `page.evaluate()` to set form state.
**Alternatives considered:** (1) Block script entirely + state injection (rejected — doesn't trigger the form's onChange placeData branch, leaving `country` unset). (2) Full Google Maps mock (rejected — over-engineered).

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:** Existing E2E tests at `__tests__/e2e/registration-flow.spec.ts:49-83` show Google Places bypass attempts. The new approach uses route interception instead.
- **Conventions:** Single `test()` call for sequential flows. Assertions use `expect(locator).toBeVisible()` pattern. Cleanup in `test.afterAll`.
- **Key files:**
  - `app/profesionales/registro/page.tsx` — 4-step form, `canProceed()` at line 221 controls step transitions, `handleSubmit()` at line 248 posts FormData
  - `app/components/PlacesAutocomplete.tsx` — line 76: checks env var. Line 82-121: creates Autocomplete, listens for `place_changed`. Line 148-158: fallback plain input when no API key.
  - `app/api/professionals/register/route.ts` — POST endpoint, validates fields, inserts to Supabase with `status: 'submitted'`, uploads image to Storage, returns `{ success: true, slug }`
  - `app/profesionales/registro/confirmacion/page.tsx` — static confirmation page with "¡Solicitud enviada!" heading
  - `playwright.config.ts` — `public` project matches `__tests__/e2e/*.spec.ts`. Loads `.env.local` at line 15.
- **Gotchas:**
  - Step 0 `canProceed()` requires: `full_name`, `email` (valid), `whatsapp` (valid), `country` (set by PlaceData). Phone validation needs ≥6 digits and uses `isValidPhoneNumber()` with country code.
  - Step 1 requires: `modality.length > 0` AND `specialties.length > 0`. Style and service_type are optional for validation.
  - Step 3 requires: `bio.length >= 50`.
  - **Modality buttons do NOT have `aria-pressed`** — they are plain `<button>` elements styled with `bg-brand text-white` when selected. Verify via CSS class or visual state, not `aria-pressed`. Specialty buttons in SpecialtySelector DO have `aria-pressed`.
  - Image file input is hidden (`className="hidden"`) inside a `<label>` — use `page.setInputFiles('input[type="file"]', path)`.
  - Slug is auto-generated from name; may get numeric suffix if duplicate exists.
  - The form's `handleSubmit` (line 280-291) only checks `response.ok` and redirects — it does NOT parse the slug. We intercept the response to extract the slug for cleanup.
  - The Google Maps script URL pattern is: `https://maps.googleapis.com/maps/api/js?key=...&libraries=places&callback=initGoogleMaps`

## Runtime Environment

- **Start command:** `npm run dev` (port 3000)
- **Health check:** `http://localhost:3000/api/health`
- **Playwright web server:** configured in `playwright.config.ts` to auto-start

## Assumptions

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` may or may not be set in `.env.local`. The test handles both scenarios: if set, the mock script runs; if not, fallback to `page.evaluate()` to inject location state. Task 1 depends on this.
- Supabase is accessible and `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` are set in `.env.local` — needed for cleanup. Task 1 depends on this.
- The `professionals` table accepts all fields from the form. Supported by `app/api/professionals/register/route.ts:141-164`.
- `test-results/` directory is gitignored (confirmed: `.gitignore:21`).
- `profile-images` Storage bucket exists in Supabase (confirmed in plan notes).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Google Maps mock doesn't trigger place_changed correctly | Medium | High | Mock script calls `window.initGoogleMaps()` synchronously and fires `place_changed` on `.addListener()`. Fallback: use `page.evaluate()` to directly set form state if Continuar stays disabled after 3s. |
| Slug/email collision with existing test data | Low | Medium | Use unique name with timestamp + random suffix: `e2e-test-${Date.now()}-${random}@test.com`. Cleanup always runs in afterAll. |
| Flaky due to animation/transition timing | Low | Medium | Use explicit element visibility checks (`expect(heading).toBeVisible()`), not timeouts |
| Storage orphans on cleanup failure | Low | Low | Cleanup deletes both DB row and Storage image. If cleanup itself fails, test logs the slug for manual cleanup. |

## Goal Verification

### Truths

1. Running `npx playwright test registration-full-flow --project=public` passes with 0 failures
2. Screenshots are saved to `test-results/` for each step and confirmation
3. The test creates a professional in Supabase with status `submitted` and deletes it (row + image) after
4. TS-001 (full flow scenario) passes end-to-end

### Artifacts

- `__tests__/e2e/registration-full-flow.spec.ts` — the test file
- `test-results/registration-full-flow/` — screenshots (transient, gitignored)

## E2E Test Scenarios

### TS-001: Complete Registration with Image Upload
**Priority:** Critical
**Preconditions:** Dev server running, Supabase accessible
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales/registro` | "Datos personales" heading visible, "Continuar" disabled |
| 2 | Fill name, email; trigger location mock (Buenos Aires, AR); fill phone (1155667788); fill Instagram (test_prof) | All fields populated, no validation errors |
| 3 | Screenshot "step-0-filled" | Captured |
| 4 | Click "Continuar" | "Perfil profesional" heading visible |
| 5 | Click "Ambos" modality, click "Ansiedad" + "Autoestima" specialties | Modality button has `bg-brand` class; specialty buttons have `aria-pressed="true"` |
| 6 | Screenshot "step-1-filled" | Captured |
| 7 | Click "Continuar" | "Tarifas y disponibilidad" heading visible |
| 8 | Screenshot "step-2-default" | Captured |
| 9 | Click "Continuar" | "Sobre vos" heading visible |
| 10 | Verify "Enviar solicitud" is disabled (bio not yet filled) | Button has `disabled` attribute |
| 11 | Fill short_description (tagline), fill bio (≥50 chars), fill experience | Text fields populated |
| 12 | Upload test image via `setInputFiles()` on `input[type="file"]` | Image preview (`img[alt="Vista previa"]`) visible |
| 13 | Verify "Enviar solicitud" is now enabled | Button does NOT have `disabled` attribute |
| 14 | Screenshot "step-3-filled" | Captured |
| 15 | Click "Enviar solicitud" (intercept API response) | API returns 200 with `{ success: true, slug: "..." }` |
| 16 | Wait for redirect | URL is `/profesionales/registro/confirmacion` |
| 17 | Verify "¡Solicitud enviada!" heading | Heading visible |
| 18 | Screenshot "confirmation" | Captured |
| 19 | (afterAll) Delete test professional from Supabase (row + Storage image) | No test data left |

## Progress Tracking

- [x] Task 1: Create registration full-flow E2E test
      **Total Tasks:** 1 | **Completed:** 1 | **Remaining:** 0

## Implementation Tasks

### Task 1: Create registration full-flow E2E test

**Objective:** Write `__tests__/e2e/registration-full-flow.spec.ts` implementing TS-001 — full 4-step registration with image upload, screenshots, API verification, and cleanup.

**Dependencies:** None

**Mapped Scenarios:** TS-001

**Files:**

- Create: `__tests__/e2e/registration-full-flow.spec.ts`

**Key Decisions / Notes:**

- **Google Maps mock strategy:** Intercept `**/maps.googleapis.com/**` with `route.fulfill()` returning a mock script:
  ```javascript
  // Mock script defines minimal google.maps.places.Autocomplete
  // that stores the place_changed listener and fires it with Buenos Aires data
  // Also calls window.initGoogleMaps() to resolve the loadGoogleMapsScript promise
  ```
  The mock Autocomplete's `.addListener('place_changed', callback)` stores the callback, then the test triggers it by calling `window.__triggerPlaceChanged()` after the user types in the location field. This gives the form component its `placeData` with `{ city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR' }`.

- **Fallback if API key is NOT set:** PlacesAutocomplete renders plain input (no script loaded). In this case, type "Buenos Aires" in the input, then use `page.evaluate()` to directly set form state:
  ```javascript
  // Find the React fiber on the form container and update formData.city and formData.country
  ```
  Detect which path: after navigation, check if `window.google` is defined. If not, use the fallback.

- **Test image:** Generate a minimal valid JPEG programmatically in the test using `Buffer.from()` with a base64-encoded 1x1 purple pixel. Write to a temp file, pass to `setInputFiles()`, delete after. No committed fixture needed.

- **Test data uniqueness:** Name: `E2E Test Prof ${Date.now()}`, Email: `e2e-${Date.now()}-${random4}@test.hara.com`. Eliminates collision risk.

- **API response interception:** `page.waitForResponse(r => r.url().includes('/api/professionals/register') && r.status() === 200)` → parse JSON to get `slug`.

- **Cleanup (test.afterAll):** Use `@supabase/supabase-js` `createClient` with `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY` (available because `playwright.config.ts` loads `.env.local`). Delete: (1) professional row by slug, (2) Storage image from `profile-images` bucket by `{id}.jpg`.

- **Single test() call:** The entire TS-001 flow runs as one `test()`. No `serial` mode needed. Screenshots captured inline with `page.screenshot()`.

- **Modality verification:** Check via `toHaveClass(/bg-brand/)` not `aria-pressed`. Specialty buttons use `aria-pressed="true"`.

- **Negative assertion:** Before filling bio at Step 3, verify "Enviar solicitud" has `disabled` attribute. After filling ≥50 chars, verify it's enabled.

**Definition of Done:**

- [ ] Test passes: `npx playwright test registration-full-flow --project=public`
- [ ] No diagnostics errors in the test file
- [ ] Screenshots saved for steps 0, 1, 2, 3, and confirmation
- [ ] Test professional is created in Supabase (verified via API response)
- [ ] Test professional + Storage image cleaned up after test run
- [ ] Image upload triggers the preview in the form (`img[alt="Vista previa"]` visible)
- [ ] Negative assertion: submit button disabled before bio, enabled after
- [ ] Existing `registration-flow.spec.ts` still passes

**Verify:**

- `npx playwright test registration-full-flow --project=public`
- `npx playwright test registration-flow --project=public` (existing tests unaffected)
