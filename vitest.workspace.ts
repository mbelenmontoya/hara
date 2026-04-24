// Hará Match — Vitest Workspace
// Two projects: unit (jsdom for component tests) and integration (node for API tests)

import { defineWorkspace } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineWorkspace([
  {
    // Component tests — run in jsdom browser-like environment
    plugins: [react()],
    test: {
      name: 'unit',
      environment: 'jsdom',
      include: ['app/**/*.test.{ts,tsx}', 'lib/**/*.test.ts'],
      setupFiles: ['__tests__/setup/component-setup.ts'],
      globals: true,
      env: {
        SKIP_ENV_VALIDATION: 'true',
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './'),
      },
    },
  },
  {
    // Integration tests — run in Node.js, spin up real dev server
    test: {
      name: 'integration',
      environment: 'node',
      include: ['__tests__/integration/**/*.test.ts'],
      globalSetup: ['__tests__/setup/global-setup.ts'],
      testTimeout: 30000,
      globals: true,
      env: {
        SKIP_ENV_VALIDATION: 'true',
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './'),
      },
    },
  },
])
