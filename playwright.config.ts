// Hará Match - Playwright E2E Configuration
// Projects: auth-setup, public, admin, visual
//
// Scripts:
//   npm run test:e2e         → public project (no auth)
//   npm run test:visual      → visual project (screenshots)
//   npm run test:visual:update → update baselines
//   npm run e2e:dev          → all projects

import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local for Playwright tests (Supabase keys, admin credentials, etc.)
config({ path: resolve(process.cwd(), '.env.local') })

const ADMIN_AUTH_FILE = './__tests__/e2e/.auth/admin.json'

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    // Setup project — runs once to authenticate as admin
    {
      name: 'auth-setup',
      testMatch: '**/__tests__/e2e/setup/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Public project — tests that don't require auth
    // Matches: all .spec.ts files EXCEPT visual/ and setup/
    {
      name: 'public',
      testMatch: '**/__tests__/e2e/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Admin project — tests that require auth (Supabase session)
    {
      name: 'admin',
      testMatch: '**/__tests__/e2e/admin-*.spec.ts',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_AUTH_FILE,
      },
    },

    // Visual regression project — screenshot comparison
    {
      name: 'visual',
      testMatch: '**/__tests__/e2e/visual/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: {
    command: `REQUIRE_ADMIN_AUTH=${process.env.REQUIRE_ADMIN_AUTH || 'false'} npm run dev -- --port 3000`,
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
