// Tests for ProfileEditForm
// Key behaviors: pre-fill from pro row, live Hara score, read-only score panel,
// email read-only, POST on save.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EditableProfessional } from './ProfileEditForm'

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock complex sub-components to keep test focused on form behavior
vi.mock('@/app/components/PracticePicker', () => ({
  PracticePicker: ({ selected }: { selected: string[] }) => (
    <div data-testid="practice-picker">{selected.join(',')}</div>
  ),
}))

vi.mock('@/app/registro/components/SpecialtySelector', () => ({
  SpecialtySelector: ({ selected }: { selected: string[] }) => (
    <div data-testid="specialty-selector">{selected.join(',')}</div>
  ),
}))

vi.mock('@/app/components/PlacesAutocomplete', () => ({
  PlacesAutocomplete: ({ id, value, placeholder }: { id?: string; value: string; placeholder?: string }) => (
    <input id={id} data-testid="places-autocomplete" value={value} placeholder={placeholder ?? ''} readOnly />
  ),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_PRO: EditableProfessional = {
  id: 'pro-uuid-123',
  slug: 'laura-giraudo',
  email: 'laura@example.com',
  full_name: 'Laura Giraudo',
  whatsapp: '+5491112345678',
  instagram: null,
  country: 'Argentina',
  city: 'Buenos Aires',
  latitude: null,
  longitude: null,
  online_only: false,
  modality: ['presencial'],
  specialties: ['ansiedad'],
  practices: ['reiki'],
  service_type: [],
  bio: null,
  short_description: '',
  experience_description: null,
  profile_image_url: null,
  price_range_min: null,
  price_range_max: null,
  currency: 'ARS',
  accepting_new_clients: true,
}

async function renderForm(proOverrides: Partial<EditableProfessional> = {}) {
  const pro = { ...BASE_PRO, ...proOverrides }
  const { default: ProfileEditForm } = await import('./ProfileEditForm')
  return render(<ProfileEditForm professional={pro} practices={[{ key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 1, active: true, aliases: [], specialties: [] }]} />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfileEditForm', () => {
  it('pre-fills the full_name from the professional row', async () => {
    await renderForm({ full_name: 'Laura Giraudo' })

    const nameInput = screen.getByDisplayValue('Laura Giraudo')
    expect(nameInput).toBeTruthy()
  })

  it('email is visible but disabled (read-only)', async () => {
    await renderForm({ email: 'laura@example.com' })

    const emailInput = screen.getByDisplayValue('laura@example.com')
    expect(emailInput).toBeTruthy()
    expect((emailInput as HTMLInputElement).disabled).toBe(true)
  })

  it('Hara score panel increases live when short_description crosses a scoring tier', async () => {
    await renderForm({ short_description: '' })

    // The score panel should show 0 for short_description initially
    // (empty → 0 pts for the shortDescription criterion)
    const initialScore = screen.getByTestId('score-total')
    const initialTotal = parseInt(initialScore.textContent ?? '0')

    // Type a description ≥ 50 chars to cross the full-tier threshold (15 pts)
    const descInput = screen.getByPlaceholderText(/descripción/i)
    const longDesc = 'Una facilitadora de constelaciones familiares con más de diez años de experiencia.'
    await userEvent.clear(descInput)
    await userEvent.type(descInput, longDesc)

    await waitFor(() => {
      const updatedScore = parseInt(screen.getByTestId('score-total').textContent ?? '0')
      expect(updatedScore).toBeGreaterThan(initialTotal)
    })
  })

  it('score panel has no editable override input (read-only)', async () => {
    await renderForm()

    // ScoreBreakdown renders a number input only when onOverride is passed
    // and a criterion row is being edited. ReadOnlyScorePanel must NOT pass
    // onOverride, so no override inputs should exist inside the panel.
    const scorePanel = screen.getByTestId('score-panel')
    const overrideInputs = scorePanel.querySelectorAll('input[type="number"]')
    expect(overrideInputs.length).toBe(0)
  })

  it('saves the labeled profile fields without losing untouched values', async () => {
    await renderForm({ service_type: ['individual'], profile_image_url: 'https://example.com/photo.jpg' })
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: ' Laura Nueva ' } })
    fireEvent.change(screen.getByLabelText('Instagram'), { target: { value: 'https://instagram.com/laura.nueva/' } })
    fireEvent.change(screen.getByLabelText('Biografía'), { target: { value: 'Mi nueva biografía.' } })
    expect(screen.getByLabelText(/Email/)).toBeDisabled()
    for (const label of ['WhatsApp', 'Ciudad o localidad', 'Descripción corta', 'Experiencia', 'Precio mínimo', 'Precio máximo', 'Moneda']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('status')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe('/api/pro/profile')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      full_name: 'Laura Nueva', whatsapp: BASE_PRO.whatsapp, instagram: 'laura.nueva',
      country: 'Argentina', city: 'Buenos Aires', latitude: null, longitude: null,
      online_only: false, modality: ['presencial'], specialties: ['ansiedad'], practices: ['reiki'],
      service_type: ['individual'], short_description: null, bio: 'Mi nueva biografía.',
      experience_description: null, price_range_min: null, price_range_max: null,
      currency: 'ARS', accepting_new_clients: true,
    })
  })

  it('keeps edits after a failed save and allows a successful retry', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'No se pudo guardar.' }) })
    await renderForm()
    fireEvent.change(screen.getByLabelText('Descripción corta'), { target: { value: 'Este texto no se puede perder.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Descripción corta')).toHaveValue('Este texto no se puede perder.')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Cambios guardados')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('preserves zero prices and blocks another save while the request is pending', async () => {
    let finish!: (value: { ok: boolean }) => void
    mockFetch.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    await renderForm({ price_range_min: 0, price_range_max: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    const saving = screen.getByRole('button', { name: 'Guardando…' })
    expect(saving).toBeDisabled()
    fireEvent.click(saving)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({ price_range_min: 0, price_range_max: 0 })
    finish({ ok: true })
    await screen.findByRole('status')
  })
})
