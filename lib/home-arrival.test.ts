import { describe, it, expect } from 'vitest'
import { buildHomeData, rowsFor, splitFeatured, formatHomePrice, type HomeProfessional } from './home-arrival'
import type { Practice } from './practices'

const practice = (p: Partial<Practice> & Pick<Practice, 'key' | 'label'>): Practice => ({
  slug: p.key,
  sort_order: 0,
  active: true,
  specialties: [],
  aliases: [],
  ...p,
})

const CATALOG: Practice[] = [
  practice({ key: 'reiki', label: 'Reiki', specialties: ['estres-ansiedad', 'duelo-perdidas'] }),
  practice({ key: 'terapia-floral', label: 'Terapia floral', aliases: ['flores de bach'], specialties: ['estres-ansiedad', 'miedos-creencias'] }),
]

const pro = (p: Partial<HomeProfessional> & Pick<HomeProfessional, 'slug'>): HomeProfessional => ({
  full_name: p.slug.toUpperCase(),
  short_description: null,
  profile_image_url: null,
  city: 'Mendoza',
  country: 'AR',
  online_only: false,
  practices: [],
  specialties: [],
  price_range_min: null,
  price_range_max: null,
  currency: 'ARS',
  rating_average: null,
  rating_count: null,
  subscription_tier: null,
  tier_expires_at: null,
  modality: null,
  ranking_score: null,
  ...p,
})

const PROS = [
  pro({ slug: 'a', practices: ['reiki'], price_range_min: 850, profile_image_url: 'https://img/a.jpg' }),
  pro({ slug: 'b', specialties: ['Flores de Bach'], online_only: true }),
  pro({ slug: 'c', practices: ['reiki'], subscription_tier: 'destacado', profile_image_url: 'https://img/c.jpg' }),
  pro({ slug: 'd', specialties: ['detox'] }),
]

describe('buildHomeData', () => {
  it('returns the most common curated specialties as cards, with counts and Spanish labels', () => {
    const { cards } = buildHomeData(PROS, CATALOG)
    expect(cards).toEqual([
      { key: 'estres-ansiedad', label: 'Estrés y ansiedad', count: 3 },
      { key: 'duelo-perdidas', label: 'Duelo y pérdidas', count: 2 },
      { key: 'miedos-creencias', label: 'Miedos y creencias limitantes', count: 1 },
    ])
  })

  it('keeps at most four cards', () => {
    const wide = practice({ key: 'wide', label: 'Wide', specialties: ['estres-ansiedad', 'duelo-perdidas', 'pareja', 'autoconocimiento', 'trauma-heridas'] })
    const { cards } = buildHomeData([pro({ slug: 'x', practices: ['wide'] })], [wide])
    expect(cards).toHaveLength(4)
  })

  it('builds rows with practice, place, price and photo, never echoing free text', () => {
    const { rows } = buildHomeData(PROS, CATALOG)
    const a = rows.find((r) => r.slug === 'a')!
    expect(a).toMatchObject({ name: 'A', practice: 'Reiki', where: 'Mendoza, AR', price: '$850', photoUrl: 'https://img/a.jpg' })
    expect(rows.find((r) => r.slug === 'b')).toMatchObject({ practice: 'Terapia floral', where: 'Solo online', photoUrl: null })
    const odd = buildHomeData([pro({ slug: 'z', profile_image_url: 'javascript:alert(1)' })], CATALOG).rows[0]
    expect(odd.photoUrl).toBeNull()
    const d = rows.find((r) => r.slug === 'd')!
    expect(d.specialtyKeys).toEqual([])
    expect(d.practice).toBeNull()
  })
})

describe('card details', () => {
  const rowOf = (p: Partial<HomeProfessional>) => buildHomeData([pro({ slug: 'k', practices: ['reiki'], ...p })], CATALOG).rows[0]

  it('rounds the Índice Hara and leaves it out when there is none', () => {
    expect(rowOf({ ranking_score: 72.6 }).score).toBe(73)
    expect(rowOf({ ranking_score: 0 }).score).toBeNull()
    expect(rowOf({ ranking_score: null }).score).toBeNull()
  })

  it('names the modality: online-only people are Online, others list what they offer', () => {
    expect(rowOf({ online_only: true, modality: ['presencial'] }).modality).toBe('Online')
    expect(rowOf({ modality: ['presencial', 'online'] }).modality).toBe('Presencial · Online')
    expect(rowOf({ modality: [] }).modality).toBeNull()
    expect(rowOf({ modality: null }).modality).toBeNull()
  })

  it('turns the curated specialties into chips with their Spanish labels', () => {
    expect(rowOf({}).chips).toEqual([
      { key: 'estres-ansiedad', label: 'Estrés y ansiedad' },
      { key: 'duelo-perdidas', label: 'Duelo y pérdidas' },
    ])
  })
})

describe('rowsFor and splitFeatured', () => {
  const { rows } = buildHomeData(PROS, CATALOG)

  it('keeps only professionals with that specialty, in ranking order', () => {
    expect(rowsFor(rows, 'duelo-perdidas').map((r) => r.slug)).toEqual(['a', 'c'])
    expect(rowsFor(rows, 'miedos-creencias').map((r) => r.slug)).toEqual(['b'])
  })

  it('features the first destacado professional with a photo, and leaves them out of the rest', () => {
    const { featured, rest } = splitFeatured(rowsFor(rows, 'estres-ansiedad'))
    expect(featured?.slug).toBe('c')
    expect(rest.map((r) => r.slug)).toEqual(['a', 'b'])
  })

  it('falls back to the first professional when nobody is a destacado with a photo', () => {
    const { featured, rest } = splitFeatured(rowsFor(rows, 'miedos-creencias'))
    expect(featured?.slug).toBe('b')
    expect(rest).toEqual([])
  })

  it('returns no featured professional for an empty list', () => {
    expect(splitFeatured([])).toEqual({ featured: null, rest: [] })
  })
})

describe('formatHomePrice', () => {
  it.each([
    [null, null, 'ARS', null],
    [850, null, 'ARS', '$850'],
    [850, 850, 'ARS', '$850'],
    [850, 1200, 'ARS', 'desde $850'],
    [null, 1200, 'ARS', 'hasta $1.200'],
    [50, null, 'USD', 'US$50'],
  ])('%s to %s %s gives %s', (min, max, currency, expected) => {
    expect(formatHomePrice(min, max, currency)).toBe(expected)
  })
})
