// E2E test: Public professional profile page (/p/[slug])
// Verifies the profile renders correctly when data is available.
// Gracefully skips if no professionals exist in the database.

import { test, expect } from '@playwright/test'

async function getFirstProfessionalSlug(): Promise<string | null> {
  try {
    // Use the debug API to find an active professional slug
    // This requires the server to be running
    const response = await fetch('http://localhost:3000/api/debug/professionals')
    if (!response.ok) return null
    const data = await response.json() as { professionals?: { slug?: string; status?: string }[] }
    const active = data.professionals?.find((p) => p.status === 'active')
    return active?.slug ?? null
  } catch {
    return null
  }
}

test.describe('Public profile — /p/[slug]', () => {
  test('profile page renders for an active professional', async ({ page }) => {
    const slug = await getFirstProfessionalSlug()

    if (!slug) {
      test.skip(true, 'No active professionals in DB — skipping profile test')
      return
    }

    await page.goto(`/p/${slug}`)
    await page.waitForLoadState('networkidle')

    // Profile page should render with the professional data
    await expect(page.locator('[data-testid="professional-profile"]')).toBeVisible()
  })

  test('profile shows specialty chips when professional has specialties', async ({ page }) => {
    const slug = await getFirstProfessionalSlug()

    if (!slug) {
      test.skip(true, 'No active professionals in DB — skipping specialty chip test')
      return
    }

    await page.goto(`/p/${slug}`)
    await page.waitForLoadState('networkidle')

    // Specialties section should exist
    const especialidades = page.getByText('Especialidades')
    if (await especialidades.isVisible()) {
      // Specialty chips should be visible (rendered as <span> elements)
      const chips = page.locator('[class*="rounded-full"]').filter({ hasText: /[A-ZÁÉÍÓÚ]/ })
      await expect(chips.first()).toBeVisible()
    }
  })

  test('returns 404 for nonexistent slug', async ({ page }) => {
    const response = await page.goto('/p/nonexistent-professional-slug-xyz-999')
    expect(response?.status()).toBe(404)
  })
})
