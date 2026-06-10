import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LocationFilter } from './LocationFilter'
import type { LocationFilterValue } from './DirectoryFilters'

// PlacesAutocomplete is a Google Maps component — mock it for unit tests
vi.mock('@/app/components/PlacesAutocomplete', () => ({
  PlacesAutocomplete: vi.fn(({ onChange, placeholder }: {
    onChange: (val: string, place?: { city: string; country: string; countryCode: string; formattedAddress: string; lat?: number; lng?: number }) => void
    placeholder?: string
  }) => (
    <input
      data-testid="places-autocomplete"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => {
        // Simulate selecting a city place
        onChange('Córdoba, Argentina', {
          city: 'Córdoba',
          country: 'Argentina',
          countryCode: 'AR',
          formattedAddress: 'Córdoba, Argentina',
          lat: -31.4135,
          lng: -64.1811,
        })
      }}
    />
  )),
}))

vi.mock('@/lib/google-maps-loader', () => ({
  loadGoogleMapsScript: vi.fn(() => Promise.resolve()),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
})

describe('LocationFilter', () => {
  it('calls onChange with location when a city is selected', async () => {
    const onChange = vi.fn()
    render(<LocationFilter value={null} onChange={onChange} />)

    const input = screen.getByTestId('places-autocomplete')
    fireEvent.focus(input)

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({
      city: 'Córdoba',
      country: 'AR',
      lat: -31.4135,
      lng: -64.1811,
    }))
  })

  it('shows active-location chip when value is set', () => {
    const loc: LocationFilterValue = { city: 'Buenos Aires', country: 'AR', lat: -34.6, lng: -58.4 }
    render(<LocationFilter value={loc} onChange={vi.fn()} />)

    expect(screen.getByText('Buenos Aires')).toBeInTheDocument()
  })

  it('calls onChange(null) when the active chip is cleared', () => {
    const onChange = vi.fn()
    const loc: LocationFilterValue = { city: 'Buenos Aires', country: 'AR', lat: -34.6, lng: -58.4 }
    render(<LocationFilter value={loc} onChange={onChange} />)

    const clearBtn = screen.getByRole('button', { name: /limpiar/i })
    fireEvent.click(clearBtn)

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows geolocation error when permission is denied', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((_success: unknown, error: (e: { code: number }) => void) => {
          error({ code: 1 }) // PERMISSION_DENIED
        }),
      },
    })

    render(<LocationFilter value={null} onChange={vi.fn()} />)

    const nearMeBtn = screen.getByRole('button', { name: /usar mi ubicación/i })
    fireEvent.click(nearMeBtn)

    await waitFor(() =>
      expect(screen.getByText(/no pudimos detectar/i)).toBeInTheDocument()
    )
  })
})
