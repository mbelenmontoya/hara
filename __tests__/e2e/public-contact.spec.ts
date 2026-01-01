// Hará Match - E2E Test: Public Contact Flow
// Purpose: Test contact button tracking + WhatsApp navigation
// Validates: Event tracking, sendBeacon call, wa.me navigation

import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Load E2E seed data
const seedDataPath = resolve(process.cwd(), '.e2e-test-data.json')
let seedData: any = null
if (existsSync(seedDataPath)) {
  seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8'))
}

test.describe('Public Contact Flow', () => {
  test.skip(!!process.env.REQUIRE_ADMIN_AUTH, 'Skipped when auth gating enabled')
  test.skip(!seedData, 'Skipped: E2E seed data not found (run: npm run qa:seed-e2e)')

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

    // Go to recommendations page using seeded tracking code
    await page.goto(`/r/${seedData.tracking_code}`)

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

    // Verify navigation to WhatsApp (wa.me or api.whatsapp.com redirect)
    const url = newPage.url()
    expect(url.includes('wa.me/') || url.includes('whatsapp.com')).toBe(true)

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
