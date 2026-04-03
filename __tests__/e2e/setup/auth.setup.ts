// Playwright admin authentication setup
// Logs into the admin panel and saves the session cookies to storageState.
// This file runs once before admin E2E tests via the Playwright 'auth-setup' project.
//
// Required env vars in .env.local:
//   E2E_ADMIN_EMAIL — Supabase Auth admin user email
//   E2E_ADMIN_PASSWORD — Supabase Auth admin user password

import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '../.auth/admin.json')

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD

  if (!email || !password) {
    // Skip explicitly — admin tests will be skipped rather than failing with opaque errors
    setup.skip(true, 'E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD not set in .env.local — skipping admin auth setup')
    return
  }

  await page.goto('/admin/login')

  // Fill in credentials
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/contraseña|password/i).fill(password)
  await page.getByRole('button', { name: /ingresar|iniciar/i }).click()

  // Wait for redirect to admin area after successful login
  await page.waitForURL('**/admin/**')
  await expect(page).not.toHaveURL('**/admin/login**')

  // Save session cookies and localStorage
  await page.context().storageState({ path: AUTH_FILE })
})
