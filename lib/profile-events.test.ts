import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireProfileEvent } from './profile-events'

describe('fireProfileEvent', () => {
  const slug = 'test-pro'
  const expectedBody = JSON.stringify({ event_type: 'profile_view', professional_slug: slug })

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls navigator.sendBeacon with correct payload when available', async () => {
    const sendBeacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { sendBeacon })

    fireProfileEvent('profile_view', slug)

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    const [url, blob] = sendBeacon.mock.calls[0] as [string, Blob]
    expect(url).toBe('/api/events')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/json')
    // Verify blob content matches expected payload
    const text = await blob.text()
    expect(text).toBe(expectedBody)
  })

  it('falls back to fetch when navigator.sendBeacon is unavailable', () => {
    vi.stubGlobal('navigator', {})

    fireProfileEvent('instagram_click', slug)

    expect(fetch).toHaveBeenCalledWith('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'instagram_click', professional_slug: slug }),
      keepalive: true,
    })
  })

  it('does not throw when navigator is undefined (SSR context)', () => {
    vi.stubGlobal('navigator', undefined)

    expect(() => fireProfileEvent('whatsapp_click', slug)).not.toThrow()
  })
})
