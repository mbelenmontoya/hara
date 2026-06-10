import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { PlacesAutocomplete } from './PlacesAutocomplete'

// Mock the shared loader so it resolves immediately in tests
vi.mock('@/lib/google-maps-loader', () => ({
  loadGoogleMapsScript: vi.fn(() => Promise.resolve()),
}))

const mockAutocomplete = vi.fn()
const mockAddListener = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
  mockAutocomplete.mockReturnValue({ addListener: mockAddListener })
  Object.defineProperty(window, 'google', {
    value: { maps: { places: { Autocomplete: mockAutocomplete } } },
    writable: true,
    configurable: true,
  })
})

describe('PlacesAutocomplete', () => {
  it('defaults to cities-only types', async () => {
    render(<PlacesAutocomplete value="" onChange={vi.fn()} />)

    await waitFor(() => expect(mockAutocomplete).toHaveBeenCalled())

    expect(mockAutocomplete).toHaveBeenCalledWith(
      expect.any(HTMLInputElement),
      expect.objectContaining({ types: ['(cities)'] })
    )
  })

  it('forwards custom types prop to Autocomplete constructor', async () => {
    render(<PlacesAutocomplete value="" onChange={vi.fn()} types={['geocode']} />)

    await waitFor(() => expect(mockAutocomplete).toHaveBeenCalled())

    expect(mockAutocomplete).toHaveBeenCalledWith(
      expect.any(HTMLInputElement),
      expect.objectContaining({ types: ['geocode'] })
    )
  })
})
