// E2E test: Public professional profile page (/p/[slug])
// Verifies the profile renders correctly for a seeded professional.
// Requires: npm run qa:seed-e2e (creates .e2e-test-data.json with professional slugs)

import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const seedDataPath = resolve(process.cwd(), '.e2e-test-data.json')
let seedData: { professionals?: { slug: string }[] } | null = null
if (existsSync(seedDataPath)) {
  seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8'))
}

test.describe('Public profile — seeded data', () => {
  test.beforeAll(() => {
    if (!seedData?.professionals?.[0]?.slug) {
      throw new Error(
        'E2E seed data not found or missing professional slugs.\n' +
        'Run: npm run qa:seed-e2e\n' +
        'This creates .e2e-test-data.json with seeded professional slugs needed for profile tests.'
      )
    }
  })

  test('profile page renders for a seeded professional', async ({ page }) => {
    const slug = seedData!.professionals![0].slug
    await page.goto(`/p/${slug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="professional-profile"]')).toBeVisible()
  })
})

test.describe('Public profile — 404 behavior', () => {
  test('returns 404 for nonexistent slug', async ({ page }) => {
    const response = await page.goto('/p/nonexistent-professional-slug-xyz-999')
    expect(response?.status()).toBe(404)
  })
})
