// E2E test: Professional registration full flow with image upload
// Tests the complete 4-step registration pipeline end-to-end:
//   Step 0: Datos personales (name, email, location, phone, instagram)
//   Step 1: Perfil profesional (modality, specialties, approach, service type)
//   Step 2: Tarifas y disponibilidad (pricing — optional, skipped quickly)
//   Step 3: Sobre vos (bio, experience, profile image upload)
// Verifies: form navigation, field validation, image preview, API success, confirmation page
// Cleans up: deletes test professional row + Storage image from Supabase after test

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

// ─── Buenos Aires place data (what PlacesAutocomplete would return) ────────────

const BUENOS_AIRES_PLACE = {
  city: 'Buenos Aires',
  country: 'Argentina',
  countryCode: 'AR',
  formattedAddress: 'Buenos Aires, Argentina',
}

// ─── Google Maps mock script ───────────────────────────────────────────────────
// Returned when the component tries to load the real Google Maps JS SDK.
// Defines minimal google.maps.places.Autocomplete that:
//   1. Stores the place_changed listener
//   2. Calls window.initGoogleMaps() to resolve the component's internal promise
//      using a polling interval to handle the race between script execution
//      and React assigning window.initGoogleMaps
//   3. Exposes window.__triggerPlaceChanged() for the test to fire

const GOOGLE_MAPS_MOCK_SCRIPT = `
(function() {
  var _listener = null;
  var _listenerReady = false;

  window.google = {
    maps: {
      places: {
        Autocomplete: function(inputEl, options) {
          if (inputEl.id !== 'reg-city') return { addListener: function() {}, getPlace: function() { return {}; } };
          return {
            addListener: function(event, callback) {
              if (event === 'place_changed') {
                _listener = callback;
                _listenerReady = true;
              }
            },
            getPlace: function() {
              return {
                formatted_address: '${BUENOS_AIRES_PLACE.formattedAddress}',
                address_components: [
                  {
                    long_name: '${BUENOS_AIRES_PLACE.city}',
                    short_name: '${BUENOS_AIRES_PLACE.city}',
                    types: ['locality']
                  },
                  {
                    long_name: '${BUENOS_AIRES_PLACE.country}',
                    short_name: '${BUENOS_AIRES_PLACE.countryCode}',
                    types: ['country']
                  }
                ],
                geometry: {
                  location: { lat: function() { return -34.6037; }, lng: function() { return -58.3816; } }
                }
              };
            }
          };
        }
      }
    }
  };

  // Trigger the stored place_changed listener with Buenos Aires data
  window.__triggerPlaceChanged = function() {
    if (_listener) { _listener(); }
  };

  // Returns true once addListener('place_changed') has been called — safe to trigger
  window.__isPlaceListenerReady = function() {
    return _listenerReady;
  };

  // Call initGoogleMaps to resolve the component's internal loadGoogleMapsScript promise.
  // Poll to handle the race: the script may execute before React assigns window.initGoogleMaps.
  if (typeof window.initGoogleMaps === 'function') {
    window.initGoogleMaps();
  } else {
    var _poll = setInterval(function() {
      if (typeof window.initGoogleMaps === 'function') {
        clearInterval(_poll);
        window.initGoogleMaps();
      }
    }, 10);
  }
})();
`

// ─── Minimal valid JPEG (1×1 purple pixel) ────────────────────────────────────
// Base64-encoded so no fixture file needed in the repo

const MINIMAL_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
  'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
  'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
  'MjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABAUG/8QAHBABAAICAwEAAAAAAAAAAAAAAQACAxIxQVH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8Aq7NruJbN6lJdStVFAAH/2Q=='

// ─── Screenshot helper ─────────────────────────────────────────────────────────

function screenshotDir(): string {
  // Use an absolute path to avoid cwd ambiguity in different runner contexts
  const dir = resolve('test-results/registration-full-flow')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

// ─── Supabase cleanup client ───────────────────────────────────────────────────

function getCleanupClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── Test ─────────────────────────────────────────────────────────────────────

test.describe('Professional Registration — Full Flow', () => {
  let createdSlug: string | null = null
  let createdId: string | null = null
  let tempImagePath: string | null = null
  // Generate unique test data in beforeAll so retries get a fresh email (no 409 conflict)
  let TEST_NAME: string
  let TEST_EMAIL: string
  const TEST_INSTAGRAM = 'test_prof_hara'
  const TEST_PHONE = '1155667788'
  const TEST_BIO = 'Mi enfoque integra técnicas humanistas y cognitivo-conductuales para ayudarte a desarrollar herramientas prácticas de bienestar emocional.'
  const TEST_SHORT_DESC = 'Psicóloga especializada en ansiedad y autoestima'
  const TEST_EXPERIENCE = '10 años de experiencia clínica. UBA. Posgrado en TCC.'

  test.beforeAll(() => {
    expect(getCleanupClient(), 'Supabase credentials are required for account cleanup').not.toBeNull()
    // Fresh timestamp + random suffix per test session (safe against retries)
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 6)
    TEST_NAME = `E2E Test Prof ${ts}`
    TEST_EMAIL = `hara-registro-${ts}-${rand}@example.com`

    // Write temp image file for upload
    tempImagePath = join(tmpdir(), `hara-e2e-profile-${ts}.jpg`)
    writeFileSync(tempImagePath, Buffer.from(MINIMAL_JPEG_BASE64, 'base64'))
  })

  test.afterAll(async () => {
    // Remove temp image
    if (tempImagePath) {
      try { unlinkSync(tempImagePath) } catch { /* ignore */ }
    }

    // Clean up Supabase: delete professional row + Storage image
    const supabase = getCleanupClient()
    if (!supabase) {
      console.warn('[cleanup] Supabase env vars not set — skipping DB cleanup')
      return
    }

    const { data: pro, error: lookupError } = await supabase.from('professionals')
      .select('id, user_id').eq('email', TEST_EMAIL).maybeSingle()
    expect(lookupError).toBeNull()
    if (pro) {
      const { error: storageError } = await supabase.storage.from('profile-images').remove([`${pro.id}.jpg`])
      expect(storageError).toBeNull()
      const { error: deleteError } = await supabase.from('professionals').delete().eq('id', pro.id)
      expect(deleteError).toBeNull()
      if (pro.user_id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(pro.user_id)
        expect(authError).toBeNull()
        const { data: deletedUser } = await supabase.auth.admin.getUserById(pro.user_id)
        expect(deletedUser.user).toBeNull()
      }
      const { data: remaining, error: verifyError } = await supabase.from('professionals')
        .select('id').eq('email', TEST_EMAIL)
      expect(verifyError).toBeNull()
      expect(remaining).toEqual([])
    }
  })

  test('TS-001: complete 4-step registration with image upload', async ({ page }) => {
    // ── Set up Google Maps mock ─────────────────────────────────────────────
    // Intercept the Google Maps SDK script request and return our minimal mock.
    // If the API key is not set, PlacesAutocomplete renders a plain input and
    // never loads the script — the mock is not called. See fallback below.
    await page.route('**/maps.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: GOOGLE_MAPS_MOCK_SCRIPT,
      })
    })

    // ── Step 1: Navigate to registration ────────────────────────────────────
    await page.goto('/registro')
    // 'load' waits for the full page including React hydration, which is needed
    // before the form heading becomes visible. 'networkidle' is avoided (flaky with HMR).
    await page.waitForLoadState('load')

    await expect(page.getByRole('heading', { name: 'Datos personales' })).toBeVisible()
    const continuarBtn = page.getByRole('button', { name: 'Continuar' })
    await expect(continuarBtn).toBeDisabled()

    // ── Step 0: Fill personal data ──────────────────────────────────────────
    await page.getByPlaceholder('Ej: María García López').fill(TEST_NAME)
    await page.getByPlaceholder('tu@email.com').fill(TEST_EMAIL)
    await page.getByLabel(/^Contraseña/).fill('Hara-e2e-registro-2026!')

    // Fill location input (types the city name; PlacesAutocomplete onChange sets raw city string)
    const locationInput = page.getByPlaceholder('Buscar ciudad...')
    await locationInput.fill('Buenos Aires')

    // Wait until the Google Maps mock has fully initialized and addListener has been called.
    // We detect this by polling __isPlaceListenerReady() which the mock sets to true
    // only after new Autocomplete(...).addListener('place_changed', cb) is called.
    await page.waitForFunction(
      () => !!(window as Window & { __isPlaceListenerReady?: () => boolean }).__isPlaceListenerReady?.(),
      undefined,
      { timeout: 8000, polling: 100 }
    )

    // Trigger the place_changed handler — sets city, country, countryCode on form state
    await page.evaluate(
      () => (window as Window & { __triggerPlaceChanged?: () => void }).__triggerPlaceChanged?.()
    )

    await expect(locationInput).toHaveValue(/^Buenos Aires(?:, Argentina)?$/)

    // Fill phone (Argentina +54 is auto-set by the location mock setting countryCode='AR')
    await page.getByPlaceholder('1123456789').fill(TEST_PHONE)

    // Fill Instagram
    await page.getByPlaceholder('tuusuario').fill(TEST_INSTAGRAM)

    // Screenshot: Step 0 filled
    await page.screenshot({
      path: `${screenshotDir()}/01-step-0-filled.png`,
      fullPage: true,
    })

    // Continuar should now be enabled — country was set by PlacesAutocomplete onChange
    await expect(continuarBtn).toBeEnabled()
    await continuarBtn.click()

    // ── Step 1: Professional profile ────────────────────────────────────────
    await expect(page.getByRole('heading', { name: 'Perfil profesional' })).toBeVisible()

    // Select modality: Ambos (verify via CSS class since no aria-pressed on modality buttons)
    const ambosBtn = page.getByRole('button', { name: 'Ambos' })
    await ambosBtn.click()
    await expect(ambosBtn).toHaveAttribute('aria-pressed', 'true')

    // Select specialties (aria-pressed toggles)
    const ansiedadBtn = page.getByRole('button', { name: 'Estrés y ansiedad' })
    const autoestimaBtn = page.getByRole('button', { name: 'Autoconocimiento' })
    await ansiedadBtn.click()
    await autoestimaBtn.click()
    await expect(ansiedadBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(autoestimaBtn).toHaveAttribute('aria-pressed', 'true')

    // TS-001 step 3: Select practice chips (catalog-driven)
    // Practice picker chips render from the practices DB table — requires migration 010 applied.
    const reikiChip = page.getByRole('button', { name: 'Reiki' })
    const meditacionChip = page.getByRole('button', { name: 'Meditación y mindfulness' })
    await reikiChip.click()
    await meditacionChip.click()
    await expect(reikiChip).toHaveAttribute('aria-pressed', 'true')
    await expect(meditacionChip).toHaveAttribute('aria-pressed', 'true')

    // Screenshot: Step 1 filled
    await page.screenshot({
      path: `${screenshotDir()}/02-step-1-filled.png`,
      fullPage: true,
    })

    const continuarStep1 = page.getByRole('button', { name: 'Continuar' })
    await expect(continuarStep1).toBeEnabled()
    await continuarStep1.click()

    // ── Step 2: Pricing (optional — advance immediately) ────────────────────
    await expect(page.getByRole('heading', { name: 'Tarifas y disponibilidad' })).toBeVisible()

    // Screenshot: Step 2
    await page.screenshot({
      path: `${screenshotDir()}/03-step-2-pricing.png`,
      fullPage: true,
    })

    await page.getByRole('button', { name: 'Continuar' }).click()

    // ── Step 3: Bio and image upload ─────────────────────────────────────────
    await expect(page.getByRole('heading', { name: 'Sobre vos' })).toBeVisible()

    // Negative assertion: submit button must be disabled before bio is filled
    const submitBtn = page.getByRole('button', { name: 'Enviar solicitud' })
    await expect(submitBtn).toBeDisabled()

    // Fill short description
    await page.getByLabel('Frase corta sobre vos').fill(TEST_SHORT_DESC)

    // Fill bio (must be ≥50 chars for canProceed() to return true)
    const bioTextarea = page.getByLabel(/^Sobre vos/)
    await bioTextarea.fill(TEST_BIO)
    expect(TEST_BIO.length).toBeGreaterThanOrEqual(50)

    // Fill experience
    await page.getByPlaceholder(/Formación, años de experiencia/).fill(TEST_EXPERIENCE)

    // Upload profile image via native file input (hidden inside label)
    await page.setInputFiles('input[type="file"]', tempImagePath!)

    // Image preview should appear
    await expect(page.locator('img[alt="Vista previa"]')).toBeVisible()

    // Submit button should now be enabled (bio ≥50 chars)
    await expect(submitBtn).toBeEnabled()

    // Screenshot: Step 3 filled
    await page.screenshot({
      path: `${screenshotDir()}/04-step-3-filled.png`,
      fullPage: true,
    })

    // ── Submit — intercept API response to capture slug ──────────────────────
    // Catch any response from the register endpoint (not just 200) for clear error messages
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/professionals/register')
    )

    await submitBtn.click()

    const apiResponse = await responsePromise
    // Assert 200 here so a non-200 produces a clear failure, not a timeout
    expect(apiResponse.status()).toBe(200)
    const apiData = await apiResponse.json() as { success: boolean; slug: string }

    expect(apiData.success).toBe(true)
    expect(typeof apiData.slug).toBe('string')
    expect(apiData.slug.length).toBeGreaterThan(0)

    // Store slug for cleanup
    createdSlug = apiData.slug

    // Fetch the professional id for Storage cleanup, with null guard
    const supabase = getCleanupClient()
    if (supabase && createdSlug) {
      const { data, error: fetchErr } = await supabase
        .from('professionals')
        .select('id, status')
        .eq('slug', createdSlug)
        .single()
      if (fetchErr || !data) {
        console.warn(`[verify] Could not fetch professional by slug "${createdSlug}":`, fetchErr?.message)
        console.warn(`[verify] Manual cleanup may be needed for email: ${TEST_EMAIL}`)
      } else {
        createdId = data.id
        expect(data.status).toBe('submitted')
      }

      // TS-001 step 5: Verify selected practices landed in the DB row
      const { data: practicesRow } = await supabase
        .from('professionals')
        .select('practices')
        .eq('slug', createdSlug)
        .single()
      expect(practicesRow).not.toBeNull()
      expect(practicesRow!.practices).toEqual(
        expect.arrayContaining(['reiki', 'meditacion-mindfulness'])
      )
    }

    // ── Confirmation page ────────────────────────────────────────────────────
    await expect(page).toHaveURL(/\/registro$/)
    await expect(page.getByRole('heading', { name: '¡Solicitud enviada!' })).toBeVisible()
    await expect(page.getByText(/Recibimos tu información/)).toBeVisible()

    await page.getByRole('link', { name: 'Entrar a mi perfil' }).click()
    await expect(page.getByRole('heading', { name: 'Entrá a tu perfil' })).toBeVisible()
    await page.screenshot({ path: `${screenshotDir()}/05-login.png`, fullPage: true })
    await page.getByPlaceholder('tu@email.com').fill(TEST_EMAIL)
    await page.locator('input[type="password"]').fill('Hara-e2e-registro-2026!')
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
    await expect(page).toHaveURL(/\/pro\/perfil$/)
    await expect(page.getByText('Tu perfil está en revisión. Te avisamos por email cuando esté publicado.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Guardar/ })).toHaveCount(0)
    const forbidden = await page.request.post('/api/pro/profile', { data: { full_name: 'Should not save' } })
    expect(forbidden.status()).toBe(403)

    // Screenshot: review notice
    await page.screenshot({
      path: `${screenshotDir()}/05-review-notice.png`,
      fullPage: true,
    })
  })
})
