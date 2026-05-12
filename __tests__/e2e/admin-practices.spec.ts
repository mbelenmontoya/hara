// Hara Vital — E2E: Admin Practices Catalog Management
// TS-001: Create flow → new practice appears in admin list.
// TS-002: Edit flow → label change reflected in admin list.
// TS-003: Deactivate flow → confirm modal shows usage count, toggle state flips.
//
// Auth: relies on dev mode where /admin/* is reachable without Supabase Auth
// gate (matches existing admin E2E pattern in admin-match-flow.spec.ts).

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_PREFIX = `e2e-test-${Date.now()}`
const TS001_KEY = `${TEST_PREFIX}-create`
const TS002_KEY = `${TEST_PREFIX}-edit`
const TS003_KEY = `${TEST_PREFIX}-deactivate`

test.describe.configure({ mode: 'serial' })

test.describe('Admin Practices Catalog Management', () => {
  // Admin pages are gated by Supabase Auth middleware. These tests need
  // E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD set in .env.local to run via the
  // 'admin' Playwright project (which runs auth-setup first to populate
  // storageState). Without credentials, skip gracefully — unit + integration
  // tests already cover the data layer and UI behavior.
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    'E2E_ADMIN_EMAIL/PASSWORD not set — skipping admin E2E. Set them in .env.local and run via --project=admin to enable.'
  )

  test.afterAll(async () => {
    // Clean up any test rows.
    await supabase.from('professionals').delete().like('slug', `${TEST_PREFIX}%`)
    await supabase.from('practices').delete().like('key', `${TEST_PREFIX}%`)
  })

  test('TS-001: admin creates a new practice and it appears in the list', async ({ page }) => {
    await page.goto('/admin/practices')
    await expect(page.getByRole('heading', { name: 'Prácticas' })).toBeVisible()

    await page.getByRole('link', { name: /nueva práctica/i }).first().click()
    await expect(page).toHaveURL(/\/admin\/practices\/new$/)

    await page.getByLabel(/clave/i).fill(TS001_KEY)
    await page.getByLabel(/etiqueta/i).fill('E2E Create Practice')
    // slug auto-derives from key — we don't override it
    await page.getByLabel(/orden/i).fill('9100')

    await page.getByRole('button', { name: /^crear$/i }).click()

    await expect(page).toHaveURL(/\/admin\/practices$/)
    await expect(page.getByText('E2E Create Practice')).toBeVisible()
  })

  test('TS-002: admin edits a practice and the label updates in the list', async ({ page }) => {
    // Setup: create a practice via direct DB insert
    await supabase.from('practices').insert({
      key: TS002_KEY,
      label: 'E2E Edit Original',
      slug: TS002_KEY,
      sort_order: 9200,
      active: true,
    })

    await page.goto('/admin/practices')
    await expect(page.getByText('E2E Edit Original')).toBeVisible()

    // Find the row containing the test practice and click its Edit link
    const row = page.getByTestId(`practice-row-${TS002_KEY}`)
    await row.getByRole('link', { name: /editar/i }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/practices/${TS002_KEY}/edit$`))

    // Edit label
    const labelInput = page.getByLabel(/etiqueta/i)
    await labelInput.fill('E2E Edit Updated')

    await page.getByRole('button', { name: /guardar/i }).click()

    await expect(page).toHaveURL(/\/admin\/practices$/)
    await expect(page.getByText('E2E Edit Updated')).toBeVisible()
  })

  test('TS-003: admin deactivates a practice and confirm modal shows usage count', async ({ page }) => {
    // Setup: create a practice + a pro using it
    await supabase.from('practices').insert({
      key: TS003_KEY,
      label: 'E2E Deactivate Practice',
      slug: TS003_KEY,
      sort_order: 9300,
      active: true,
    })
    await supabase.from('professionals').insert({
      slug: `${TEST_PREFIX}-deactivate-pro`,
      status: 'active',
      full_name: 'E2E Deactivate Pro',
      email: `${TEST_PREFIX}-deactivate@test.com`,
      whatsapp: '+5491100000000',
      country: 'AR',
      modality: ['online'],
      specialties: ['ansiedad'],
      practices: [TS003_KEY],
    })

    await page.goto('/admin/practices')
    const row = page.getByTestId(`practice-row-${TS003_KEY}`)
    await row.getByRole('button', { name: /^desactivar$/i }).click()

    // Confirm modal shows the usage count
    await expect(page.getByText(/us[ao]n? esta práctica/i)).toBeVisible()
    await expect(page.getByText(/1 profesional/i)).toBeVisible()

    await page.getByRole('button', { name: /confirmar desactivación/i }).click()

    // Modal closes; row updates to show "Inactiva" + "Activar" button
    await expect(page.getByText(/us[ao]n? esta práctica/i)).not.toBeVisible()
    await expect(page.getByText(/^Inactiva$/)).toBeVisible()
  })
})
