import * as Sentry from '@sentry/nextjs'

export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', error, context)
  }
  Sentry.captureException(error, { extra: context })
}

export function logEvent(eventName: string, properties?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    message: eventName,
    data: properties,
    level: 'info',
  })
}
