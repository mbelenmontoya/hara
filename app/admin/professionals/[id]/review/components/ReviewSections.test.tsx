import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AboutCard, ContactCard, CriteriaCard, type ReviewProfessional } from './ReviewSections'
import type { ProfileScore } from '@/lib/profile-score'

const SCORE: ProfileScore = {
  total: 25,
  breakdown: [
    { key: 'profileImage', label: 'Foto de perfil', weight: 10, earned: 0, met: false },
    { key: 'whatsapp', label: 'WhatsApp', weight: 5, earned: 5, met: true },
  ],
} as ProfileScore

const EMPTY_PRO: ReviewProfessional = {
  email: 'pro@test.com',
  whatsapp: '',
  country: 'AR',
  city: null,
  online_only: false,
  modality: [],
  specialties: [],
  practices: [],
  bio: null,
  short_description: null,
  experience_description: null,
  instagram: null,
  service_type: [],
  price_range_min: null,
  price_range_max: null,
  currency: 'ARS',
  accepting_new_clients: true,
  offers_courses_online: false,
  courses_presencial_location: null,
  latitude: null,
  longitude: null,
}

function renderCriteria(overrides: Record<string, number> = {}) {
  const onSet = vi.fn()
  const onReset = vi.fn()
  render(<CriteriaCard score={SCORE} overrides={overrides} onSet={onSet} onReset={onReset} />)
  return { onSet, onReset }
}

describe('CriteriaCard', () => {
  it('opens a criterion and moves it one point up or down, never past 0 or its weight', () => {
    const { onSet } = renderCriteria()

    fireEvent.click(screen.getByRole('button', { name: /Foto de perfil/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Subir Foto de perfil' }))
    expect(onSet).toHaveBeenLastCalledWith('profileImage', 1)
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Foto de perfil' }))
    expect(onSet).toHaveBeenLastCalledWith('profileImage', 0)

    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    fireEvent.click(screen.getByRole('button', { name: /WhatsApp/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Subir WhatsApp' }))
    expect(onSet).toHaveBeenLastCalledWith('whatsapp', 5)
  })

  it('"Auto" clears the manual value and closes the editor', () => {
    const { onReset } = renderCriteria({ profileImage: 4 })
    fireEvent.click(screen.getByRole('button', { name: /Foto de perfil/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Auto' }))
    expect(onReset).toHaveBeenCalledWith('profileImage')
    expect(screen.queryByRole('button', { name: 'Listo' })).not.toBeInTheDocument()
  })

  it('tags only the criteria set by hand as "manual" and shows the total', () => {
    renderCriteria({ whatsapp: 5 })
    expect(screen.getAllByText('manual')).toHaveLength(1)
    expect(screen.getByRole('button', { name: /WhatsApp/ })).toHaveTextContent('manual')
    expect(screen.getByText('25 / 100')).toBeInTheDocument()
  })
})

describe('AboutCard and ContactCard', () => {
  it('show the muted italic empty texts for every missing field', () => {
    render(
      <>
        <AboutCard pro={EMPTY_PRO} />
        <ContactCard pro={EMPTY_PRO} />
      </>
    )
    for (const text of [
      'Sin descripción corta',
      'Sin biografía',
      'No completó su experiencia',
      'No indicó',
      'Sin WhatsApp',
      'Sin ubicación',
      'Sin dirección: usamos el centro de la ciudad',
      'Sin Instagram',
    ]) {
      expect(screen.getByText(text)).toHaveClass('italic')
    }
    expect(screen.getByText('pro@test.com')).toBeInTheDocument()
  })
})
