import { test, expect } from '@playwright/test'

test.describe('UI Smoke Test - Critical Paths', () => {
  test('root route loads with styled content', async ({ page }) => {
    await page.goto('/')

    // Verify route loaded (not a redirect loop or error page)
    expect(page.url()).toMatch(/localhost/)

    // Verify at least one heading renders (content-agnostic — survives redesigns)
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()

    // Verify Tailwind CSS is applied (checks computed style — tests build infrastructure)
    const container = page.locator('div').first()
    const backgroundColor = await container.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('registration page is publicly accessible', async ({ page }) => {
    const response = await page.goto('/profesionales/registro')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
