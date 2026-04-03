// Visual regression tests — page screenshots
// Captures baseline screenshots on first run, compares on subsequent runs.
//
// Run:
//   npm run test:visual          → compare against baselines (fail on diff)
//   npm run test:visual:update   → update baselines (after intentional design changes)
//
// Baselines are stored in: __tests__/e2e/visual/pages.spec.ts-snapshots/
// They ARE committed to git — they are the visual reference.

import { test, expect } from '@playwright/test'

// Consistent viewport is set in playwright.config.ts visual project (1280x720)

test.describe('Visual regression — key pages', () => {
  test('home page', async ({ page }) => {
    await page.goto('/')
    // Wait for fonts and background images to load
    await page.waitForLoadState('networkidle')
    // Small buffer for any CSS animations to complete
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('home.png', {
      maxDiffPixelRatio: 0.02,
      // Mask dynamic elements that change between runs
      mask: [
        page.locator('time'), // any timestamps
      ],
    })
  })

  test('registration form — step 0', async ({ page }) => {
    await page.goto('/profesionales/registro')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('registro-step0.png', {
      maxDiffPixelRatio: 0.02,
    })
  })

  test('admin login page', async ({ page }) => {
    await page.goto('/admin/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot('admin-login.png', {
      maxDiffPixelRatio: 0.02,
    })
  })

  test('registration confirmation page', async ({ page }) => {
    await page.goto('/profesionales/registro/confirmacion')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot('registro-confirmacion.png', {
      maxDiffPixelRatio: 0.02,
    })
  })
})
