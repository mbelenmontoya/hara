import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DirectoryMap } from './DirectoryMap'
import type { DirectoryProfessional } from './ProfessionalsDirectory'

vi.mock('@/lib/google-maps-loader', () => ({
  loadGoogleMapsScript: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

// Mock useCityGeocode — return empty map by default (stored coords are used instead)
vi.mock('../hooks/useCityGeocode', () => ({
  useCityGeocode: vi.fn(() => new Map()),
}))

const mockFitBounds = vi.fn()
const mockMarker = vi.fn().mockReturnValue({ addListener: vi.fn(), setMap: vi.fn() })
const mockInfoWindow = vi.fn().mockReturnValue({ open: vi.fn() })
const mockLatLngBounds = vi.fn().mockReturnValue({ extend: vi.fn(), isEmpty: vi.fn(() => false) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
  Object.defineProperty(window, 'google', {
    value: {
      maps: {
        Map: vi.fn(() => ({ fitBounds: mockFitBounds, setCenter: vi.fn(), setZoom: vi.fn() })),
        Marker: mockMarker,
        InfoWindow: mockInfoWindow,
        LatLngBounds: mockLatLngBounds,
        event: { addListener: vi.fn() },
      },
    },
    writable: true,
    configurable: true,
  })
})

const makePro = (overrides: Partial<DirectoryProfessional> = {}): DirectoryProfessional => ({
  slug: 'pro-test',
  full_name: 'Test Pro',
  specialties: null, practices: null, modality: null, short_description: null,
  city: 'Córdoba', country: 'AR', latitude: -31.4135, longitude: -64.1811,
  online_only: false, profile_image_url: null, price_range_min: null,
  price_range_max: null, currency: null, rating_average: null, rating_count: null,
  subscription_tier: null, tier_expires_at: null, ranking_score: null,
  ...overrides,
})

describe('DirectoryMap', () => {
  it('renders a map container div', () => {
    render(<DirectoryMap professionals={[makePro()]} />)
    expect(screen.getByTestId('directory-map')).toBeInTheDocument()
  })

  it('creates one marker per professional with stored coordinates', async () => {
    const pros = [
      makePro({ slug: 'a', latitude: -31.4, longitude: -64.2 }),
      makePro({ slug: 'b', latitude: -34.6, longitude: -58.4 }),
    ]
    render(<DirectoryMap professionals={pros} />)

    // Wait for both effects to flush: map init (Effect 1) → setMapReady → markers (Effect 2)
    await waitFor(() => expect(mockMarker).toHaveBeenCalledTimes(2))
  })

  it('creates no marker for online_only pros without coordinates', async () => {
    const pro = makePro({ online_only: true, latitude: null, longitude: null, city: null })
    render(<DirectoryMap professionals={[pro]} />)

    // Allow effects to settle; markers should never be called
    await waitFor(() => expect(window.google.maps.Map).toHaveBeenCalled())
    expect(mockMarker).not.toHaveBeenCalled()
  })
})
