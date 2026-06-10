import { vi, describe, it, expect } from 'vitest'
import type { Metadata } from 'next'

vi.mock('./globals.css', () => ({}))
vi.mock('next/font/google', () => ({
  Poppins: () => ({ variable: '--font-display', className: '' }),
  Montserrat: () => ({ variable: '--font-body', className: '' }),
}))
vi.mock('next/script', () => ({ default: () => null }))
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }))
vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }))
vi.mock('@/app/components/SiteHeader', () => ({ SiteHeader: () => null }))
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  withSentryConfig: (c: unknown) => c,
}))

import { metadata } from './layout'

describe('layout metadata icons', () => {
  it('should include icons.icon pointing to isotipo so the browser tab displays the brand mark', () => {
    const icons = (metadata as Metadata).icons as Record<string, string>
    expect(icons).toBeDefined()
    expect(icons.icon).toBe('/assets/logo/isotipo.png')
  })
})
