// Hará Match - E2E Test: Admin Auth Gating
// Purpose: Verify that unauthenticated requests to admin routes are redirected to login
// Current auth: Supabase Auth (middleware.ts redirects to /admin/login)

import { test, expect } from '@playwright/test'

test.describe('Admin Auth Gating', () => {
  test('unauthenticated /admin/leads redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin/leads', { waitUntil: 'commit' })
    // Middleware redirects unauthenticated users to /admin/login
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('unauthenticated /admin/professionals redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin/professionals', { waitUntil: 'commit' })
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('/admin/login is publicly accessible', async ({ page }) => {
    const response = await page.goto('/admin/login')
    // Login page itself is not protected
    expect(response?.status()).toBe(200)
  })
})
