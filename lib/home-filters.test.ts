import { describe, it, expect } from 'vitest'
import {
  filterProfessionals,
  filterRows,
  orderByElement,
  practiceOptions,
  modalityCounts,
  cityOptions,
} from './home-filters'
import { DEFAULT_FILTERS } from '@/app/profesionales/components/DirectoryFilters'
import type { DirectoryProfessional } from '@/app/profesionales/components/ProfessionalsDirectory'
import type { Practice } from '@/lib/practices'
import type { HomeRow } from '@/lib/home-arrival'

const pro = (p: Partial<DirectoryProfessional> & Pick<DirectoryProfessional, 'slug' | 'full_name'>): DirectoryProfessional => ({
  specialties: null,
  practices: [],
  modality: null,
  short_description: null,
  city: null,
  country: 'AR',
  latitude: null,
  longitude: null,
  online_only: false,
  profile_image_url: null,
  price_range_min: null,
  price_range_max: null,
  currency: null,
  rating_average: null,
  rating_count: null,
  subscription_tier: null,
  tier_expires_at: null,
  ranking_score: null,
  ...p,
})

const practice = (p: Partial<Practice> & Pick<Practice, 'key' | 'label'>): Practice => ({
  slug: p.key,
  sort_order: 0,
  active: true,
  specialties: [],
  aliases: [],
  ...p,
})

const PRACTICES: Practice[] = [
  practice({ key: 'reiki', label: 'Reiki', aliases: ['energía universal'] }),
  practice({ key: 'yoga', label: 'Yoga' }),
  practice({ key: 'viejo', label: 'Viejo', active: false }),
]

const PROS: DirectoryProfessional[] = [
  pro({ slug: 'ana', full_name: 'Ana Paz', practices: ['reiki'], city: 'Mendoza', modality: ['presencial'] }),
  pro({ slug: 'beto', full_name: 'Beto Luna', practices: ['reiki', 'yoga'], city: 'Córdoba', modality: ['presencial', 'online'] }),
  pro({ slug: 'cora', full_name: 'Cora Sol', practices: ['yoga'], online_only: true, city: 'Mendoza', modality: ['online'] }),
  pro({ slug: 'dani', full_name: 'Dani Río', practices: [], city: 'cordoba', modality: ['presencial'] }),
]

const row = (slug: string, specialtyKeys: string[] = []): HomeRow => ({
  slug,
  name: slug,
  quote: null,
  photoUrl: null,
  practice: null,
  where: '',
  price: null,
  rating: null,
  ratingCount: 0,
  specialtyKeys,
  chips: [],
  score: null,
  modality: null,
  destacado: false,
})

describe('filterProfessionals', () => {
  it('matches by name, practice alias and ignores accents, in ranking order', () => {
    const slugs = (search: string) =>
      filterProfessionals(PROS, PRACTICES, { search, filters: DEFAULT_FILTERS }).map((p) => p.slug)
    expect(slugs('paz')).toEqual(['ana'])
    expect(slugs('  paz  ')).toEqual(['ana'])
    expect(slugs('ENERGIA universal')).toEqual(['ana', 'beto'])
    expect(slugs('')).toEqual(['ana', 'beto', 'cora', 'dani'])
  })

  it('combines the search with the practice, modality and city filters', () => {
    const run = (filters: Partial<typeof DEFAULT_FILTERS>, search = '') =>
      filterProfessionals(PROS, PRACTICES, { search, filters: { ...DEFAULT_FILTERS, ...filters } }).map((p) => p.slug)
    expect(run({ practices: ['yoga'] })).toEqual(['beto', 'cora'])
    expect(run({ practices: ['yoga'], modality: 'online' })).toEqual(['beto', 'cora'])
    expect(run({ practices: ['yoga'], modality: 'presencial' })).toEqual(['beto'])
    expect(run({ location: { city: 'Mendoza', country: 'AR', lat: null, lng: null } })).toEqual(['ana'])
    expect(run({ practices: ['reiki'] }, 'luna')).toEqual(['beto'])
  })
})

describe('filterRows', () => {
  it('keeps only the rows of the matched professionals, in the rows order', () => {
    const rows = [row('dani'), row('ana'), row('beto')]
    expect(filterRows(rows, [PROS[1], PROS[0]]).map((r) => r.slug)).toEqual(['ana', 'beto'])
  })
})

describe('orderByElement', () => {
  const rows = [row('a', ['x']), row('b', ['y']), row('c', ['x', 'y']), row('d', [])]

  it('moves the specialty to the front without dropping anyone or reordering within groups', () => {
    expect(orderByElement(rows, 'y').map((r) => r.slug)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('leaves the order untouched with no element', () => {
    expect(orderByElement(rows, null).map((r) => r.slug)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('panel options', () => {
  it('counts each active practice with the same rule the list uses and skips inactive ones', () => {
    expect(practiceOptions(PROS, PRACTICES)).toEqual([
      { key: 'reiki', label: 'Reiki', count: 2 },
      { key: 'yoga', label: 'Yoga', count: 2 },
    ])
  })

  it('counts modalities: online includes online-only, presencial excludes them', () => {
    expect(modalityCounts(PROS)).toEqual({ all: 4, online: 2, presencial: 3 })
  })

  it('groups cities ignoring case and accents, skips online-only people, most people first', () => {
    const extra = [
      ...PROS,
      pro({ slug: 'eli', full_name: 'Eli Mar', city: 'Bahía Blanca' }),
      pro({ slug: 'fer', full_name: 'Fer Sal', city: 'Salta', online_only: true }),
    ]
    expect(cityOptions(extra)).toEqual([
      { city: 'Córdoba', count: 2 },
      { city: 'Bahía Blanca', count: 1 },
      { city: 'Mendoza', count: 1 },
    ])
  })
})
