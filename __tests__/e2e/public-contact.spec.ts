// Hará Match - E2E Test: Public Contact Flow
// Purpose: Test contact button tracking + WhatsApp navigation
// Validates: Event tracking, sendBeacon call, wa.me navigation
// Requires: npm run qa:seed-e2e (creates .e2e-test-data.json)

import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const seedDataPath = resolve(process.cwd(), '.e2e-test-data.json')
let seedData: { tracking_code: string; lead_id: string } | null = null
if (existsSync(seedDataPath)) {
  seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8'))
}

test.describe('Public Contact Flow', () => {
  test.skip(!!process.env.REQUIRE_ADMIN_AUTH, 'Skipped when auth gating enabled')

  test.beforeAll(() => {
    if (!seedData) {
      throw new Error(
        'E2E seed data not found.\n' +
        'Run: npm run qa:seed-e2e\n' +
        'This creates .e2e-test-data.json with a seeded tracking code and lead ID.'
      )
    }
  })

  test('should track contact event and navigate to WhatsApp', async ({ page, context }) => {
    const eventCalls: { method: string; url: string; postData: string | null }[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/events')) {
        eventCalls.push({
          method: request.method(),
          url: request.url(),
          postData: request.postData(),
        })
      }
    })

    await page.goto(`/r/${seedData!.tracking_code}`)
    await expect(page.getByTestId('recommendations-page')).toBeVisible()

    const contactButton = page.locator('[data-testid^="contact-button-"]').first()
    await expect(contactButton).toBeVisible()

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      contactButton.click(),
    ])

    const url = newPage.url()
    expect(url.includes('wa.me/') || url.includes('whatsapp.com')).toBe(true)
    await newPage.close()

    // Poll until sendBeacon fires (avoids arbitrary sleep)
    await expect.poll(() => eventCalls.length, { timeout: 3000 }).toBeGreaterThan(0)
    expect(eventCalls[0].method).toBe('POST')
  })
})
