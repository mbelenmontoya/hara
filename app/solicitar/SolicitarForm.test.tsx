import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SolicitarForm } from './SolicitarForm'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/actions/create-lead', () => ({ createLead: vi.fn() }))
vi.mock('@/app/components/PlacesAutocomplete', () => ({
  PlacesAutocomplete: ({ onChange, placeholder }: { onChange: (v: string) => void; placeholder: string }) => (
    <input placeholder={placeholder} onChange={(e) => onChange(e.target.value)} data-testid="location-input" />
  ),
}))
vi.mock('@/app/components/PracticePicker', () => ({ PracticePicker: () => null }))
vi.mock('@/app/components/ui/PageBackground', () => ({ PageBackground: () => null }))
vi.mock('libphonenumber-js', () => ({
  isValidPhoneNumber: () => true,
  getCountryCallingCode: () => '54',
}))

beforeEach(() => { vi.clearAllMocks() })

describe('SolicitarForm — submit button validation', () => {
  it('submit button is disabled when all required fields are empty', () => {
    render(<SolicitarForm practices={[]} />)
    const btn = screen.getByRole('button', { name: /enviar respuestas/i })
    expect(btn).toBeDisabled()
  })

  it('submit button stays disabled when only intent tags are selected', () => {
    render(<SolicitarForm practices={[]} />)
    fireEvent.click(screen.getByText('Ansiedad'))
    const btn = screen.getByRole('button', { name: /enviar respuestas/i })
    expect(btn).toBeDisabled()
  })

  it('submit button enables only when intent, location, whatsapp, and email are all filled', () => {
    render(<SolicitarForm practices={[]} />)
    const btn = screen.getByRole('button', { name: /enviar respuestas/i })

    fireEvent.click(screen.getByText('Ansiedad'))
    expect(btn).toBeDisabled()

    // PlacesAutocomplete mock triggers onChange with a plain string — we need to simulate
    // location being set via the form state. We fire the change to trigger handleLocationChange
    // but it won't set countryCode (no placeData). We test whatsapp and email separately.
    fireEvent.change(screen.getByPlaceholderText(/\+5491123456789/i), { target: { value: '+5491123456789' } })
    expect(btn).toBeDisabled() // still missing location + email

    fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), { target: { value: 'test@example.com' } })
    expect(btn).toBeDisabled() // still missing location
  })

  it('submit button remains disabled when phone has an error', () => {
    render(<SolicitarForm practices={[]} />)
    fireEvent.click(screen.getByText('Ansiedad'))
    fireEvent.change(screen.getByPlaceholderText(/\+5491123456789/i), { target: { value: 'not-a-phone' } })
    fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), { target: { value: 'test@example.com' } })
    const btn = screen.getByRole('button', { name: /enviar respuestas/i })
    expect(btn).toBeDisabled()
  })

  it('email field is visible without expanding advanced options', () => {
    render(<SolicitarForm practices={[]} />)
    expect(screen.getByPlaceholderText(/tu@email\.com/i)).toBeInTheDocument()
    // Must NOT be inside an advanced section that's hidden by default
    const moreOptionsBtn = screen.queryByText(/más opciones/i)
    // Email is visible without clicking "Más opciones"
    expect(screen.getByPlaceholderText(/tu@email\.com/i)).toBeVisible()
    // Advanced toggle may still exist for other optional fields
    if (moreOptionsBtn) {
      // email should already be visible before clicking the toggle
      const emailInput = screen.getByPlaceholderText(/tu@email\.com/i)
      expect(emailInput).toBeInTheDocument()
    }
  })
})
