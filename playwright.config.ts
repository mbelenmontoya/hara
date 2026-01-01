// Hará Match - Playwright E2E Configuration
// Purpose: E2E testing with auto-starting dev server
// Security: Tests must validate gating and tracking

import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local for Playwright tests
config({ path: resolve(process.cwd(), '.env.local') })

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
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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
