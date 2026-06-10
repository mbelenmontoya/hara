import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCityGeocode } from './useCityGeocode'

vi.mock('@/lib/google-maps-loader', () => ({
  loadGoogleMapsScript: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/monitoring', () => ({
  logError: vi.fn(),
}))

const mockGeocode = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
  Object.defineProperty(window, 'google', {
    value: { maps: { Geocoder: vi.fn(() => ({ geocode: mockGeocode })) } },
    writable: true,
    configurable: true,
  })
})

describe('useCityGeocode', () => {
  it('returns geocoded coords for a city', async () => {
    mockGeocode.mockImplementation((_opts: unknown, cb: (r: { address_components: { types: string[]; short_name: string; long_name: string }[]; geometry: { location: { lat: () => number; lng: () => number } } }[], s: string) => void) => {
      cb([{
        address_components: [
          { types: ['locality'], long_name: 'Córdoba', short_name: 'Córdoba' },
          { types: ['country'], long_name: 'Argentina', short_name: 'AR' },
        ],
        geometry: { location: { lat: () => -31.4135, lng: () => -64.1811 } },
      }], 'OK')
    })

    const { result } = renderHook(() =>
      useCityGeocode([{ city: 'Córdoba', country: 'AR' }])
    )

    await waitFor(() => expect(result.current.size).toBeGreaterThan(0))

    const entry = result.current.get('cordoba,ar')
    expect(entry).toEqual({ lat: -31.4135, lng: -64.1811 })
  })

  it('deduplicates cities with the same normalized key', async () => {
    mockGeocode.mockImplementation((_opts: unknown, cb: (r: { geometry: { location: { lat: () => number; lng: () => number } } }[], s: string) => void) => {
      cb([{ geometry: { location: { lat: () => -31.4, lng: () => -64.2 } } }], 'OK')
    })

    const { result } = renderHook(() =>
      useCityGeocode([
        { city: 'Córdoba', country: 'AR' },
        { city: 'Cordoba', country: 'AR' }, // same after normalize
      ])
    )

    await waitFor(() => expect(result.current.size).toBeGreaterThan(0))

    // Geocoder called only once despite two entries
    expect(mockGeocode).toHaveBeenCalledTimes(1)
  })

  it('uses localStorage cache on second render', async () => {
    // Pre-populate cache
    localStorage.setItem('hara:geocode:buenos aires,ar', JSON.stringify({ lat: -34.6, lng: -58.4 }))

    const { result } = renderHook(() =>
      useCityGeocode([{ city: 'Buenos Aires', country: 'AR' }])
    )

    // Should resolve from cache without calling Geocoder
    await waitFor(() => expect(result.current.size).toBeGreaterThan(0))
    expect(mockGeocode).not.toHaveBeenCalled()

    expect(result.current.get('buenos aires,ar')).toEqual({ lat: -34.6, lng: -58.4 })
  })
})
