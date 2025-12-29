// Hará Match - E2E Test: Public Contact Flow
// Purpose: Test contact button tracking + WhatsApp navigation
// Validates: Event tracking, sendBeacon call, wa.me navigation

import { test, expect } from '@playwright/test'

test.describe('Public Contact Flow', () => {
  test.skip(!!process.env.REQUIRE_ADMIN_AUTH, 'Requires seed data setup')

  test('should track contact event and navigate to WhatsApp', async ({ page, context }) => {
    // Track API calls
    const eventCalls: any[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/events')) {
        eventCalls.push({
          method: request.method(),
          url: request.url(),
          postData: request.postData(),
        })
      }
    })

    // Go to recommendations page (using a test tracking code)
    // Note: This test assumes you have seeded data with a known tracking code
    // For now, we'll test with a mock or skip if no seed data
    await page.goto('/r/TESTCODE123')

    // If the page doesn't exist, skip (this test needs seed data)
    const pageContent = await page.textContent('body')
    if (pageContent?.includes('404') || pageContent?.includes('not found')) {
      test.skip()
      return
    }

    // Assume the page loaded successfully with recommendations
    await expect(page.getByTestId('recommendations-page')).toBeVisible()

    // Get first contact button
    const contactButton = page.locator('[data-testid^="contact-button-"]').first()
    await expect(contactButton).toBeVisible()

    // Listen for navigation
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      contactButton.click(),
    ])

    // Verify navigation to WhatsApp
    expect(newPage.url()).toContain('wa.me/')

    // Close the new page
    await newPage.close()

    // Verify event was tracked
    await page.waitForTimeout(500) // Give sendBeacon time to fire
    expect(eventCalls.length).toBeGreaterThan(0)

    // Verify event structure
    const eventCall = eventCalls[0]
    expect(eventCall.method).toBe('POST')
  })
})
