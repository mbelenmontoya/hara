import { describe, it, expect, beforeEach, vi } from 'vitest'

// Module uses singleton state — reset between tests with fresh dynamic imports
beforeEach(() => {
  vi.resetModules()
  // Clean any script tags added to head
  document.head.querySelectorAll('script[src*="googleapis"]').forEach(el => el.remove())
})

describe('loadGoogleMapsScript', () => {
  it('appends a maps script tag to document.head', async () => {
    const { loadGoogleMapsScript } = await import('./google-maps-loader')

    const promise = loadGoogleMapsScript('test-key')
    window.initGoogleMaps()
    await promise

    const scripts = document.head.querySelectorAll('script[src*="googleapis"]')
    expect(scripts).toHaveLength(1)
    expect((scripts[0] as HTMLScriptElement).src).toContain('key=test-key')
    expect((scripts[0] as HTMLScriptElement).src).toContain('libraries=places')
    expect((scripts[0] as HTMLScriptElement).src).toContain('loading=async')
  })

  it('resolves immediately when called after script is loaded', async () => {
    const { loadGoogleMapsScript } = await import('./google-maps-loader')

    const first = loadGoogleMapsScript('test-key')
    window.initGoogleMaps()
    await first

    // Second call — should resolve synchronously (no new script)
    await loadGoogleMapsScript('test-key')

    const scripts = document.head.querySelectorAll('script[src*="googleapis"]')
    expect(scripts).toHaveLength(1)
  })

  it('queues concurrent calls and resolves all when initGoogleMaps fires', async () => {
    const { loadGoogleMapsScript } = await import('./google-maps-loader')

    const results: string[] = []
    const p1 = loadGoogleMapsScript('test-key').then(() => results.push('p1'))
    const p2 = loadGoogleMapsScript('test-key').then(() => results.push('p2'))
    const p3 = loadGoogleMapsScript('test-key').then(() => results.push('p3'))

    // Still pending — fire the callback
    window.initGoogleMaps()
    await Promise.all([p1, p2, p3])

    expect(results).toContain('p1')
    expect(results).toContain('p2')
    expect(results).toContain('p3')
    // Only one script element despite three concurrent calls
    const scripts = document.head.querySelectorAll('script[src*="googleapis"]')
    expect(scripts).toHaveLength(1)
  })
})
