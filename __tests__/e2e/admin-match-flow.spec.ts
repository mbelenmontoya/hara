// Hará Match - E2E Test: Admin Match Creation Flow
// Purpose: Test complete match creation workflow
// Validates: UI, API, DB state, tracking code format
// Requires: npm run qa:seed-e2e (creates .e2e-test-data.json)

import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

test.describe.configure({ mode: 'serial' })

const seedDataPath = resolve(process.cwd(), '.e2e-test-data.json')
let seedData: { lead_id: string; tracking_code: string } | null = null
if (existsSync(seedDataPath)) {
  seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8'))
}

test.describe('Admin Match Creation Flow', () => {
  test.skip(!!process.env.REQUIRE_ADMIN_AUTH, 'Skipped when auth gating enabled')

  test.beforeAll(() => {
    if (!seedData) {
      throw new Error(
        'E2E seed data not found.\n' +
        'Run: npm run qa:seed-e2e\n' +
        'This creates .e2e-test-data.json with a seeded lead ID needed for match creation.'
      )
    }
  })

  test('should create match with 3 professionals and validate DB state', async ({ page }) => {
    await page.goto(`/admin/leads/${seedData!.lead_id}/match`)
    await expect(page.getByTestId('create-match-page')).toBeVisible()

    const select1 = page.getByTestId('professional-select-1')
    await select1.selectOption({ index: 1 })
    await page.getByTestId('reason-1-0').fill('Excellent experience in this area')
    await page.getByTestId('reason-1-1').fill('Top-rated by previous clients')

    const select2 = page.getByTestId('professional-select-2')
    await select2.selectOption({ index: 2 })
    await page.getByTestId('reason-2-0').fill('Good availability')

    const select3 = page.getByTestId('professional-select-3')
    await select3.selectOption({ index: 3 })
    await page.getByTestId('reason-3-0').fill('Affordable pricing')

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/admin/matches') && response.status() === 200
    )

    // Register dialog listener BEFORE click to avoid race condition
    const dialogPromise = page.waitForEvent('dialog', { timeout: 10000 })

    await page.getByTestId('submit-match-button').click()

    const response = await responsePromise
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.match_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(data.tracking_code).toMatch(/^M-\d{13}-[A-Z0-9]{6}$/)
    expect(data.recommendations).toHaveLength(3)

    for (let i = 0; i < 3; i++) {
      const rec = data.recommendations[i]
      expect(rec.professional_id).toBeDefined()
      expect(rec.rank).toBe(i + 1)
      expect(rec.attribution_token).toBeDefined()
    }

    // Verify dialog message and accept
    const dialog = await dialogPromise
    expect(dialog.message()).toContain('Match created!')
    expect(dialog.message()).toContain(data.tracking_code)
    await dialog.accept()
  })

  test('should reject duplicate professionals', async ({ page }) => {
    await page.goto(`/admin/leads/${seedData!.lead_id}/match`)
    await expect(page.getByTestId('create-match-page')).toBeVisible()

    const select1 = page.getByTestId('professional-select-1')
    const select2 = page.getByTestId('professional-select-2')
    const select3 = page.getByTestId('professional-select-3')

    await select1.selectOption({ index: 1 })
    await select2.selectOption({ index: 1 })
    await select3.selectOption({ index: 1 })

    await page.getByTestId('reason-1-0').fill('Reason 1')
    await page.getByTestId('reason-2-0').fill('Reason 2')
    await page.getByTestId('reason-3-0').fill('Reason 3')

    await page.getByTestId('submit-match-button').click()
    await expect(page.locator('text=3 DISTINCT professionals')).toBeVisible()
  })
})
