// Pure utility for firing analytics events from /p/[slug] profile pages.
// No React dependency — safe to import in both client components and SSR contexts.
// The navigator guard prevents ReferenceError in server/middleware environments.

export function fireProfileEvent(eventType: string, slug: string): void {
  const body = JSON.stringify({ event_type: eventType, professional_slug: slug })

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))
  } else {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never block or surface errors to the user
    })
  }
}
