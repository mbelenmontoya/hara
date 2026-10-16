import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/google-maps-loader', () => ({ loadGoogleMapsScript: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

import { locateNearMe } from './near-me'

function stubBrowser(components: Array<{ long_name: string; short_name: string; types: string[] }>, status = 'OK') {
  vi.stubGlobal('navigator', {
    geolocation: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: -32.9, longitude: -68.8 } }) },
  })
  vi.stubGlobal('google', {
    maps: {
      Geocoder: class {
        geocode(_req: unknown, cb: (r: unknown, s: string) => void) {
          cb(status === 'OK' ? [{ address_components: components }] : null, status)
        }
      },
    },
  })
}

describe('locateNearMe', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('turns the browser position into the city, country code and coordinates', async () => {
    stubBrowser([
      { long_name: 'Mendoza', short_name: 'Mendoza', types: ['locality'] },
      { long_name: 'Argentina', short_name: 'AR', types: ['country'] },
    ])
    await expect(locateNearMe('key')).resolves.toEqual({ city: 'Mendoza', country: 'AR', lat: -32.9, lng: -68.8 })
  })

  it('falls back to the province when there is no locality', async () => {
    stubBrowser([{ long_name: 'Mendoza Province', short_name: 'Mendoza', types: ['administrative_area_level_1'] }])
    await expect(locateNearMe('key')).resolves.toMatchObject({ city: 'Mendoza Province' })
  })

  it('rejects when the geocoder fails or finds no city', async () => {
    stubBrowser([], 'ZERO_RESULTS')
    await expect(locateNearMe('key')).rejects.toThrow()
    stubBrowser([{ long_name: 'Argentina', short_name: 'AR', types: ['country'] }])
    await expect(locateNearMe('key')).rejects.toThrow()
  })
})
