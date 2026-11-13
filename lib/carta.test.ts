import { describe, it, expect } from 'vitest'
import { firstNameFromContext, toCartaPick, type CartaRecommendationRow } from './carta'
import type { HomeProfessional } from './home-arrival'
import type { Practice } from './practices'

const CATALOG: Practice[] = [
  { key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 0, active: true, specialties: ['estres-ansiedad', 'duelo-perdidas'], aliases: [] },
]

const professional = (p: Partial<HomeProfessional> = {}): HomeProfessional & { whatsapp: string; show_whatsapp: boolean } => ({
  slug: 'lucia-paz',
  full_name: 'Lucía Paz',
  short_description: null,
  profile_image_url: 'https://img/lucia.jpg',
  city: 'Mendoza',
  country: 'AR',
  online_only: false,
  practices: ['reiki'],
  specialties: [],
  price_range_min: 850,
  price_range_max: null,
  currency: 'ARS',
  rating_average: 4.5,
  rating_count: 2,
  subscription_tier: null,
  tier_expires_at: null,
  modality: ['presencial'],
  ranking_score: null,
  whatsapp: '5491155550101',
  show_whatsapp: true,
  ...p,
})

const row = (p: Partial<CartaRecommendationRow> = {}): CartaRecommendationRow => ({
  id: 'rec-1',
  rank: 2,
  reasons: ['Trabaja mucho con ansiedad y sueño', 'corto', '  '],
  attribution_token: 'tok-1',
  professional: professional(),
  ...p,
})

describe('firstNameFromContext', () => {
  it('returns the first word of the Nombre line', () => {
    expect(firstNameFromContext('Nombre: Prueba Claude\nHorario: Tarde')).toBe('Prueba')
  })

  it('finds the Nombre line when it is not first', () => {
    expect(firstNameFromContext('Horario: Tarde\nNombre:   Ana\n\nTexto')).toBe('Ana')
  })

  it('returns null without a name line, for an empty note and for null', () => {
    expect(firstNameFromContext('Horario: Tarde\nMe llamo Ana')).toBeNull()
    expect(firstNameFromContext('Horario: Tarde\n\nPuse mi Nombre: Pepe en el form')).toBeNull()
    expect(firstNameFromContext('Nombre:   ')).toBeNull()
    expect(firstNameFromContext('')).toBeNull()
    expect(firstNameFromContext(null)).toBeNull()
  })
})

describe('toCartaPick', () => {
  it('builds the card view from the professional and keeps the contact fields', () => {
    expect(toCartaPick(row(), CATALOG)).toEqual({
      id: 'rec-1',
      rank: 2,
      attributionToken: 'tok-1',
      slug: 'lucia-paz',
      name: 'Lucía Paz',
      firstName: 'Lucía',
      whatsapp: '5491155550101',
      photoUrl: 'https://img/lucia.jpg',
      practice: 'Reiki',
      specialtyKey: 'estres-ansiedad',
      where: 'Mendoza, AR',
      price: '$850',
      rating: 4.5,
      reasons: ['Trabaja mucho con ansiedad y sueño'],
    })
  })

  it('omits a stored number from the response when WhatsApp is private', () => {
    const pick = toCartaPick(row({ professional: { ...professional(), show_whatsapp: false } }), CATALOG)
    expect(pick.whatsapp).toBe('')
  })

  it('has no rating without reviews, no price when unset and no specialty when nothing resolves', () => {
    const pick = toCartaPick(
      row({ professional: professional({ rating_count: 0, price_range_min: null, practices: [], online_only: true }) }),
      CATALOG
    )
    expect(pick.rating).toBeNull()
    expect(pick.price).toBeNull()
    expect(pick.practice).toBeNull()
    expect(pick.specialtyKey).toBeNull()
    expect(pick.where).toBe('Solo online')
  })

  it('returns an empty reason list when reasons are null', () => {
    expect(toCartaPick(row({ reasons: null }), CATALOG).reasons).toEqual([])
  })
})
