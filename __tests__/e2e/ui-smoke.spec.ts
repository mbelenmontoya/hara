import { test, expect } from '@playwright/test'

test.describe('UI Smoke Test - Critical Paths', () => {
  test('root route loads with styled content', async ({ page }) => {
    // Navigate to root
    await page.goto('http://localhost:3000/')

    // Verify route exists (not 404)
    expect(page.url()).toBe('http://localhost:3000/')

    // Verify critical content renders
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toHaveText('Hará Match')

    // Verify Tailwind CSS is applied (check computed style)
    const container = page.locator('div').first()
    const backgroundColor = await container.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // bg-gray-50 should produce a non-default background color
    // Not transparent (rgba(0, 0, 0, 0)) and not pure white (rgb(255, 255, 255))
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(backgroundColor).not.toBe('rgb(255, 255, 255)')

    // Verify Admin Portal link exists
    const adminLink = page.locator('a[href="/admin/leads"]')
    await expect(adminLink).toBeVisible()
    await expect(adminLink).toHaveText(/Admin Portal/)
  })
})
