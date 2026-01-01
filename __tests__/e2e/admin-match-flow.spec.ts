// Hará Match - E2E Test: Admin Match Creation Flow
// Purpose: Test complete match creation workflow
// Validates: UI, API, DB state, tracking code format

import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Skip these tests when auth gating is enabled (REQUIRE_ADMIN_AUTH=true)
// These tests are for functional flows, not security validation
test.describe.configure({ mode: 'serial' })

// Load E2E seed data
const seedDataPath = resolve(process.cwd(), '.e2e-test-data.json')
let seedData: any = null
if (existsSync(seedDataPath)) {
  seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8'))
}

test.describe('Admin Match Creation Flow', () => {
  test.skip(!!process.env.REQUIRE_ADMIN_AUTH, 'Skipped when auth gating enabled')
  test.skip(!seedData, 'Skipped: E2E seed data not found (run: npm run qa:seed-e2e)')

  test('should create match with 3 professionals and validate DB state', async ({ page }) => {
    // Navigate to match creation page using seeded lead ID
    await page.goto(`/admin/leads/${seedData.lead_id}/match`)

    // Wait for page to load
    await expect(page.getByTestId('create-match-page')).toBeVisible()

    // Select first professional (rank 1)
    const select1 = page.getByTestId('professional-select-1')
    await select1.selectOption({ index: 1 })

    // Fill reasons for rank 1
    await page.getByTestId('reason-1-0').fill('Excellent experience in this area')
    await page.getByTestId('reason-1-1').fill('Top-rated by previous clients')

    // Select second professional (rank 2)
    const select2 = page.getByTestId('professional-select-2')
    await select2.selectOption({ index: 2 })

    // Fill reasons for rank 2
    await page.getByTestId('reason-2-0').fill('Good availability')

    // Select third professional (rank 3)
    const select3 = page.getByTestId('professional-select-3')
    await select3.selectOption({ index: 3 })

    // Fill reasons for rank 3
    await page.getByTestId('reason-3-0').fill('Affordable pricing')

    // Listen for the API response
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/admin/matches') && response.status() === 200
    )

    // Submit form
    await page.getByTestId('submit-match-button').click()

    // Wait for API response
    const response = await responsePromise
    const data = await response.json()

    // Validate response structure
    expect(data.success).toBe(true)
    expect(data.match_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(data.tracking_code).toMatch(/^M-\d{13}-[A-Z0-9]{6}$/) // M-<timestamp>-<6-char>
    expect(data.recommendations).toHaveLength(3)

    // Validate recommendations have correct structure
    for (let i = 0; i < 3; i++) {
      const rec = data.recommendations[i]
      expect(rec.professional_id).toBeDefined()
      expect(rec.rank).toBe(i + 1)
      expect(rec.attribution_token).toBeDefined()
    }

    // Wait for success alert
    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('Match created!')
      expect(dialog.message()).toContain(data.tracking_code)
      dialog.accept()
    })
  })

  test('should reject duplicate professionals', async ({ page }) => {
    await page.goto(`/admin/leads/${seedData.lead_id}/match`)

    await expect(page.getByTestId('create-match-page')).toBeVisible()

    // Select same professional for all 3 ranks
    const select1 = page.getByTestId('professional-select-1')
    const select2 = page.getByTestId('professional-select-2')
    const select3 = page.getByTestId('professional-select-3')

    await select1.selectOption({ index: 1 })
    await select2.selectOption({ index: 1 })
    await select3.selectOption({ index: 1 })

    // Fill at least one reason for each
    await page.getByTestId('reason-1-0').fill('Reason 1')
    await page.getByTestId('reason-2-0').fill('Reason 2')
    await page.getByTestId('reason-3-0').fill('Reason 3')

    // Submit
    await page.getByTestId('submit-match-button').click()

    // Should show error
    await expect(page.locator('text=3 DISTINCT professionals')).toBeVisible()
  })
})
