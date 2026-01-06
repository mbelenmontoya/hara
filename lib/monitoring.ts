// Error Monitoring Utilities
// Centralized logging and error tracking

/**
 * Log error to monitoring service (Sentry)
 * Currently logs to console - ready for Sentry integration
 *
 * @param error - Error object to log
 * @param context - Additional context (route, user action, etc.)
 *
 * @example
 * logError(new Error('Failed to load'), { route: '/r/ABC123' })
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  // Log to console for development
  console.error('Error logged:', error.message, context)

  // TODO: Send to Sentry when configured
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     extra: context,
  //   })
  // }

  // For server-side errors
  // if (typeof window === 'undefined' && process.env.SENTRY_DSN) {
  //   const Sentry = require('@sentry/nextjs')
  //   Sentry.captureException(error, {
  //     extra: context,
  //   })
  // }
}

/**
 * Log custom event for analytics/monitoring
 * Use for tracking non-error events (user actions, performance metrics)
 *
 * @param eventName - Name of the event
 * @param properties - Event properties
 */
export function logEvent(eventName: string, properties?: Record<string, unknown>): void {
  // Log to console for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Event: ${eventName}`, properties)
  }

  // TODO: Send to analytics service
  // if (typeof window !== 'undefined' && window.analytics) {
  //   window.analytics.track(eventName, properties)
  // }
}
