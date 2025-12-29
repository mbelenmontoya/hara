// Hará Match - E2E Test: Admin Auth Gating
// Purpose: Test middleware protection of admin routes
// Validates: 503 response when REQUIRE_ADMIN_AUTH=true

import { test, expect } from '@playwright/test'

// Only run these tests when REQUIRE_ADMIN_AUTH=true
test.describe('Admin Auth Gating', () => {
  test.skip(!process.env.REQUIRE_ADMIN_AUTH, 'Only runs when REQUIRE_ADMIN_AUTH=true')

  test('should return 503 for /admin routes when auth required', async ({ page }) => {
    // This test assumes REQUIRE_ADMIN_AUTH=true is set (e2e:prod script)

    // Try to access admin leads page
    const response = await page.goto('/admin/leads', { waitUntil: 'commit' })

    // Should get 503 response
    expect(response?.status()).toBe(503)

    // Check response body
    const text = await page.textContent('body')
    expect(text).toContain('Service unavailable')
    expect(text).toContain('Admin authentication required')
    expect(text).toContain('Clerk')
  })

  test('should return 503 for /api/admin routes when auth required', async ({ request }) => {
    // Try to POST to admin matches API
    const response = await request.post('/api/admin/matches', {
      data: {
        lead_id: '00000000-0000-0000-0000-000000000001',
        recommendations: [],
      },
    })

    // Should get 503 response
    expect(response.status()).toBe(503)

    // Check response body
    const body = await response.json()
    expect(body.error).toContain('Service unavailable')
    expect(body.error).toContain('Admin authentication required')
  })

  test('should return 503 for PQL adjustment API when auth required', async ({ request }) => {
    // Try to POST to PQL adjust API
    const response = await request.post('/api/admin/pqls/test-id/adjust', {
      data: {
        amount: 100,
        reason: 'Test adjustment',
      },
    })

    // Should get 503 response
    expect(response.status()).toBe(503)

    // Check response body
    const body = await response.json()
    expect(body.error).toContain('Service unavailable')
    expect(body.error).toContain('Admin authentication required')
  })
})
