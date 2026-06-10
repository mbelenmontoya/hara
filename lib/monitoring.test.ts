import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logError, logEvent } from './monitoring'

const mockCaptureException = vi.hoisted(() => vi.fn())
const mockAddBreadcrumb = vi.hoisted(() => vi.fn())

vi.mock('@sentry/nextjs', () => ({
  captureException: mockCaptureException,
  addBreadcrumb: mockAddBreadcrumb,
}))

beforeEach(() => {
  mockCaptureException.mockReset()
  mockAddBreadcrumb.mockReset()
})

describe('logError', () => {
  it('calls Sentry.captureException with error and extra context', () => {
    const error = new Error('test error')
    logError(error, { route: '/test' })
    expect(mockCaptureException).toHaveBeenCalledWith(error, { extra: { route: '/test' } })
  })

  it('calls Sentry.captureException with unknown error from catch block', () => {
    const rawError = 'string error from catch'
    logError(rawError)
    expect(mockCaptureException).toHaveBeenCalledWith(rawError, { extra: undefined })
  })
})

describe('logEvent', () => {
  it('calls Sentry.addBreadcrumb with eventName and properties', () => {
    logEvent('contact_click', { slug: 'ana' })
    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      message: 'contact_click',
      data: { slug: 'ana' },
      level: 'info',
    })
  })

  it('calls Sentry.addBreadcrumb with no properties when omitted', () => {
    logEvent('page_view')
    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      message: 'page_view',
      data: undefined,
      level: 'info',
    })
  })
})
