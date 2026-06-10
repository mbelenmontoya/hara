import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { normalize, buildPracticeIndex, matchesProfessional, matchesFilters, ProfessionalsDirectory } from './ProfessionalsDirectory'
import type { DirectoryProfessional } from './ProfessionalsDirectory'
import type { FilterState, LocationFilterValue } from './DirectoryFilters'
import type { Practice } from '@/lib/practices'

const makePro = (overrides: Partial<DirectoryProfessional>): DirectoryProfessional => ({
  slug: 'test',
  full_name: 'Test Pro',
  specialties: null,
  practices: null,
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
  ...overrides,
})

const makePros = (n: number, overrides: Partial<DirectoryProfessional> = {}): DirectoryProfessional[] =>
  Array.from({ length: n }, (_, i) => makePro({ slug: `pro-${i}`, full_name: `Pro ${i}`, ...overrides }))

const makePractice = (key: string, label: string): Practice => ({
  key, label, slug: key, sort_order: 1, active: true,
})

describe('normalize', () => {
  it('lowercases text', () => {
    expect(normalize('REIKI')).toBe('reiki')
  })

  it('strips accents', () => {
    expect(normalize('meditación')).toBe('meditacion')
    expect(normalize('constelación')).toBe('constelacion')
  })

  it('trims whitespace', () => {
    expect(normalize('  reiki  ')).toBe('reiki')
  })
})

describe('buildPracticeIndex', () => {
  it('maps practice key to normalized label and aliases', () => {
    const index = buildPracticeIndex([
      { key: 'constelaciones-familiares', label: 'Constelaciones Familiares', aliases: ['sanaciones ancestrales'], slug: 'c', sort_order: 1, active: true },
    ])
    const terms = index.get('constelaciones-familiares')
    expect(terms).toContain('constelaciones-familiares')
    expect(terms).toContain('constelaciones familiares')
    expect(terms).toContain('sanaciones ancestrales')
  })

  it('handles practices with no aliases', () => {
    const index = buildPracticeIndex([
      { key: 'reiki', label: 'Reiki', aliases: undefined, slug: 'r', sort_order: 1, active: true },
    ])
    const terms = index.get('reiki')
    expect(terms).toContain('reiki')
  })

  it('includes specialty display labels so symptom searches match via practice', () => {
    const index = buildPracticeIndex([
      { key: 'barras-de-access', label: 'Barras de Access', slug: 'b', sort_order: 1, active: true,
        specialties: ['estres-ansiedad', 'equilibrio-energetico'] },
    ])
    const terms = index.get('barras-de-access')
    // "Estrés y ansiedad" normalized → "estres y ansiedad" — must be in terms
    expect(terms?.some(t => t.includes('ansiedad'))).toBe(true)
    expect(terms?.some(t => t.includes('equilibrio'))).toBe(true)
  })
})

describe('matchesProfessional', () => {
  const practiceIndex = buildPracticeIndex([
    { key: 'reiki', label: 'Reiki', aliases: ['equilibrio chakras'], slug: 'r', sort_order: 1, active: true },
    { key: 'constelaciones-familiares', label: 'Constelaciones Familiares', aliases: ['sanaciones ancestrales'], slug: 'c', sort_order: 2, active: true },
    { key: 'meditacion-mindfulness', label: 'Meditación y Mindfulness', aliases: [], slug: 'm', sort_order: 3, active: true },
  ])

  it('matches by full_name', () => {
    const pro = makePro({ full_name: 'María García' })
    expect(matchesProfessional(pro, 'maria', practiceIndex)).toBe(true)
    expect(matchesProfessional(pro, 'garci', practiceIndex)).toBe(true)
  })

  it('matches by specialty free-text', () => {
    const pro = makePro({ specialties: ['yoga terapéutico', 'meditación guiada'] })
    expect(matchesProfessional(pro, 'yoga', practiceIndex)).toBe(true)
    expect(matchesProfessional(pro, 'meditacion', practiceIndex)).toBe(true) // sin tilde
  })

  it('matches by practice label', () => {
    const pro = makePro({ practices: ['reiki'] })
    expect(matchesProfessional(pro, 'reiki', practiceIndex)).toBe(true)
  })

  it('matches by practice alias', () => {
    const pro = makePro({ practices: ['constelaciones-familiares'] })
    expect(matchesProfessional(pro, 'sanaciones ancestrales', practiceIndex)).toBe(true)
  })

  it('matches accent-insensitive alias', () => {
    const pro = makePro({ practices: ['meditacion-mindfulness'] })
    expect(matchesProfessional(pro, 'meditacion', practiceIndex)).toBe(true)
  })

  it('returns true for empty query', () => {
    const pro = makePro({})
    expect(matchesProfessional(pro, '', practiceIndex)).toBe(true)
  })

  it('returns false when no field matches', () => {
    const pro = makePro({ full_name: 'Laura Fernández', specialties: ['yoga'], practices: ['reiki'] })
    expect(matchesProfessional(pro, 'xyzxyzxyz', practiceIndex)).toBe(false)
  })

  it('matches by practice specialty label — ansiedad finds professional with mapped practice', () => {
    const indexWithSpecialties = buildPracticeIndex([
      { key: 'barras-de-access', label: 'Barras de Access', slug: 'b', sort_order: 1, active: true,
        specialties: ['estres-ansiedad'] },
    ])
    const pro = makePro({ practices: ['barras-de-access'] })
    expect(matchesProfessional(pro, 'ansiedad', indexWithSpecialties)).toBe(true)
  })
})

describe('ProfessionalsDirectory component', () => {
  it('filtros section starts collapsed', () => {
    const { container } = render(<ProfessionalsDirectory professionals={[]} practices={[]} />)
    const filtrosDetails = container.querySelector('details[data-testid="filtros-section"]')
    expect(filtrosDetails).toBeInTheDocument()
    expect(filtrosDetails?.hasAttribute('open')).toBe(false)
  })

  it('has font-size >= 16px on mobile to prevent iOS auto-zoom on focus', () => {
    render(<ProfessionalsDirectory professionals={[]} practices={[]} />)
    const input = screen.getByLabelText('Buscar profesionales')
    // text-sm (14px) triggers iOS Safari auto-zoom on inputs; text-base (16px) prevents it
    expect(input.className).toContain('text-base')
  })

  it('uses type=text on search input to prevent browser native clear button', () => {
    render(<ProfessionalsDirectory professionals={[]} practices={[]} />)
    const input = screen.getByLabelText('Buscar profesionales')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('applies mb-1 to professional name when ratingCount > 0', () => {
    const pro = makePro({ rating_count: 5, rating_average: 4.5 })
    render(<ProfessionalsDirectory professionals={[pro]} practices={[]} />)
    expect(screen.getByTestId('professional-name').className).toContain('mb-1')
  })

  it('has mb-0 (not mb-1) on professional name when ratingCount === 0', () => {
    const pro = makePro({ rating_count: 0, rating_average: 0 })
    render(<ProfessionalsDirectory professionals={[pro]} practices={[]} />)
    const name = screen.getByTestId('professional-name')
    expect(name.className).not.toContain('mb-1')
    expect(name.className).toContain('mb-0')
  })

  it('shows ranking score badge when ranking_score is provided', () => {
    const pro = makePro({ ranking_score: 85 })
    render(<ProfessionalsDirectory professionals={[pro]} practices={[]} />)
    expect(screen.getByTestId('ranking-score')).toBeInTheDocument()
    expect(screen.getByTestId('ranking-score')).toHaveTextContent('85')
  })

  it('does not show ranking score badge when ranking_score is null', () => {
    const pro = makePro({ ranking_score: null })
    render(<ProfessionalsDirectory professionals={[pro]} practices={[]} />)
    expect(screen.queryByTestId('ranking-score')).not.toBeInTheDocument()
  })

  it('preserves ranking score order after filtering', () => {
    const pros = [
      makePro({ slug: 'high', full_name: 'High Score Pro', ranking_score: 90 }),
      makePro({ slug: 'low', full_name: 'Low Score Pro', ranking_score: 40 }),
    ]
    render(<ProfessionalsDirectory professionals={pros} practices={[]} />)

    fireEvent.change(screen.getByLabelText('Buscar profesionales'), { target: { value: 'Pro' } })

    const names = screen.getAllByTestId('professional-name').map(el => el.textContent)
    expect(names[0]).toBe('High Score Pro')
    expect(names[1]).toBe('Low Score Pro')
  })

  it('shows +N button and expands all chips on click when specialties exceed 3', () => {
    const pro = makePro({ specialties: ['reiki', 'yoga', 'meditacion', 'tarot', 'registros'] })
    render(<ProfessionalsDirectory professionals={[pro]} practices={[]} />)

    // Scope card-chip assertions to within the card — DirectoryFilters also renders
    // specialty chips for the same labels, so screen-level getByText would find duplicates.
    const card = screen.getByTestId('professional-card')

    // Initially only 3 chips shown + expand button
    expect(within(card).getByText('reiki')).toBeInTheDocument()
    expect(within(card).getByText('yoga')).toBeInTheDocument()
    expect(within(card).getByText('meditacion')).toBeInTheDocument()
    expect(within(card).queryByText('tarot')).not.toBeInTheDocument()
    expect(within(card).queryByText('registros')).not.toBeInTheDocument()
    const expandBtn = screen.getByRole('button', { name: /\+2/i })
    expect(expandBtn).toBeInTheDocument()

    // Click expand — all chips visible, button gone
    fireEvent.click(expandBtn)
    expect(within(card).getByText('tarot')).toBeInTheDocument()
    expect(within(card).getByText('registros')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+2/i })).not.toBeInTheDocument()
  })

  it('shows 12 professionals initially when more than 12 exist', () => {
    render(<ProfessionalsDirectory professionals={makePros(15)} practices={[]} />)
    expect(screen.getAllByTestId('professional-card')).toHaveLength(12)
  })

  it('"Cargar más" button appears and appends more cards on click', () => {
    render(<ProfessionalsDirectory professionals={makePros(15)} practices={[]} />)
    const btn = screen.getByRole('button', { name: /Cargar más/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(screen.getAllByTestId('professional-card')).toHaveLength(15)
    expect(screen.queryByRole('button', { name: /Cargar más/i })).not.toBeInTheDocument()
  })

  it('visibleCount resets to 12 when search changes after Cargar más', () => {
    render(<ProfessionalsDirectory professionals={makePros(25)} practices={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /Cargar más/i }))
    expect(screen.getAllByTestId('professional-card')).toHaveLength(24)
    fireEvent.change(screen.getByLabelText('Buscar profesionales'), { target: { value: 'Pro' } })
    expect(screen.getAllByTestId('professional-card')).toHaveLength(12)
  })

  it('shows "N de M resultados" when Modalidad filter is active', () => {
    const practices = [makePractice('reiki', 'Reiki'), makePractice('masajes', 'Masajes')]
    render(<ProfessionalsDirectory professionals={makePros(5)} practices={practices} />)
    fireEvent.click(screen.getByRole('button', { name: /Filtrar por Online/i }))
    expect(screen.getByText('0 de 5 resultados')).toBeInTheDocument()
  })

  it('"Limpiar filtros" is not visible when no filter is active', () => {
    const practices = [makePractice('reiki', 'Reiki'), makePractice('masajes', 'Masajes')]
    render(<ProfessionalsDirectory professionals={makePros(3)} practices={practices} />)
    expect(screen.queryByText('Limpiar filtros')).not.toBeInTheDocument()
  })

  it('"Limpiar filtros" appears when a filter is active and resets on click', () => {
    const practices = [makePractice('reiki', 'Reiki'), makePractice('masajes', 'Masajes')]
    render(<ProfessionalsDirectory professionals={makePros(3)} practices={practices} />)
    fireEvent.click(screen.getByRole('button', { name: /Filtrar por Online/i }))
    const clearBtn = screen.getByText('Limpiar filtros')
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)
    expect(screen.queryByText('Limpiar filtros')).not.toBeInTheDocument()
  })
})

const noFilters: FilterState = { practices: [], specialties: [], modality: 'all', location: null }

describe('matchesFilters', () => {
  it('returns true for default empty filters', () => {
    const pro = makePro({ practices: ['reiki'], specialties: ['Ansiedad'], online_only: false })
    expect(matchesFilters(pro, noFilters)).toBe(true)
  })

  it('practice filter: returns true when pro has a selected practice', () => {
    const pro = makePro({ practices: ['reiki', 'masajes-terapeuticos'] })
    expect(matchesFilters(pro, { ...noFilters, practices: ['reiki'] })).toBe(true)
  })

  it('practice filter: returns false when pro has no matching practice', () => {
    const pro = makePro({ practices: ['masajes-terapeuticos'] })
    expect(matchesFilters(pro, { ...noFilters, practices: ['reiki'] })).toBe(false)
  })

  it('practice filter: OR within dimension — matches any of the selected practices', () => {
    const pro = makePro({ practices: ['biodanza'] })
    expect(matchesFilters(pro, { ...noFilters, practices: ['reiki', 'biodanza'] })).toBe(true)
  })

  it('practice filter: returns false when pro.practices is null and no free-text fallback', () => {
    const pro = makePro({ practices: null, specialties: null })
    expect(matchesFilters(pro, { ...noFilters, practices: ['reiki'] })).toBe(false)
  })

  it('practice filter: fallback to free-text specialties when practices is null', () => {
    // Pros registered before practices catalog: practices=null but specialties has free-text
    const pro = makePro({ practices: null, specialties: ['reiki usui', 'reiki lunar'] })
    const index = buildPracticeIndex([
      { key: 'reiki', label: 'Reiki', aliases: ['equilibrio chakras'], slug: 'reiki', sort_order: 1, active: true },
    ])
    expect(matchesFilters(pro, { ...noFilters, practices: ['reiki'] }, index)).toBe(true)
  })

  it('practice filter: fallback does not over-match unrelated specialties', () => {
    const pro = makePro({ practices: null, specialties: ['biodanza', 'yoga'] })
    const index = buildPracticeIndex([
      { key: 'reiki', label: 'Reiki', aliases: [], slug: 'reiki', sort_order: 1, active: true },
    ])
    expect(matchesFilters(pro, { ...noFilters, practices: ['reiki'] }, index)).toBe(false)
  })

  it('specialty filter: returns true when pro has a selected specialty', () => {
    const pro = makePro({ specialties: ['Ansiedad', 'Insomnio'] })
    expect(matchesFilters(pro, { ...noFilters, specialties: ['Ansiedad'] })).toBe(true)
  })

  it('specialty filter: returns false when pro has no matching specialty', () => {
    const pro = makePro({ specialties: ['Duelo'] })
    expect(matchesFilters(pro, { ...noFilters, specialties: ['Ansiedad'] })).toBe(false)
  })

  it('modality online: matches pro with online_only=true', () => {
    const pro = makePro({ online_only: true, modality: null })
    expect(matchesFilters(pro, { ...noFilters, modality: 'online' })).toBe(true)
  })

  it('modality online: matches pro with modality includes online', () => {
    const pro = makePro({ online_only: false, modality: ['online', 'presencial'] })
    expect(matchesFilters(pro, { ...noFilters, modality: 'online' })).toBe(true)
  })

  it('modality online: rejects presencial-only pro', () => {
    const pro = makePro({ online_only: false, modality: ['presencial'] })
    expect(matchesFilters(pro, { ...noFilters, modality: 'online' })).toBe(false)
  })

  it('modality presencial: matches pro with presencial in modality', () => {
    const pro = makePro({ online_only: false, modality: ['presencial'] })
    expect(matchesFilters(pro, { ...noFilters, modality: 'presencial' })).toBe(true)
  })

  it('modality presencial: matches pro with no modality set (defaults to presencial)', () => {
    const pro = makePro({ online_only: false, modality: null })
    expect(matchesFilters(pro, { ...noFilters, modality: 'presencial' })).toBe(true)
  })

  it('modality presencial: rejects online_only pro', () => {
    const pro = makePro({ online_only: true, modality: ['online'] })
    expect(matchesFilters(pro, { ...noFilters, modality: 'presencial' })).toBe(false)
  })

  it('AND across dimensions: practice AND modality must both match', () => {
    const onlineReiki = makePro({ practices: ['reiki'], online_only: true, modality: null })
    const presencialReiki = makePro({ practices: ['reiki'], online_only: false, modality: ['presencial'] })
    const onlineMasajes = makePro({ practices: ['masajes-terapeuticos'], online_only: true, modality: null })

    const filter: FilterState = { practices: ['reiki'], specialties: [], modality: 'online', location: null }
    expect(matchesFilters(onlineReiki, filter)).toBe(true)
    expect(matchesFilters(presencialReiki, filter)).toBe(false) // reiki but not online
    expect(matchesFilters(onlineMasajes, filter)).toBe(false)  // online but not reiki
  })

  it('location filter: matches presencial pro in the filtered city', () => {
    const loc: LocationFilterValue = { city: 'Córdoba', country: 'AR', lat: -31.4, lng: -64.2 }
    const pro = makePro({ city: 'Córdoba', online_only: false })
    expect(matchesFilters(pro, { ...noFilters, location: loc })).toBe(true)
  })

  it('location filter: excludes presencial pro in a different city', () => {
    const loc: LocationFilterValue = { city: 'Córdoba', country: 'AR', lat: -31.4, lng: -64.2 }
    const pro = makePro({ city: 'Buenos Aires', online_only: false })
    expect(matchesFilters(pro, { ...noFilters, location: loc })).toBe(false)
  })

  it('location filter: excludes online_only pro even if city matches', () => {
    const loc: LocationFilterValue = { city: 'Córdoba', country: 'AR', lat: -31.4, lng: -64.2 }
    const pro = makePro({ city: 'Córdoba', online_only: true })
    expect(matchesFilters(pro, { ...noFilters, location: loc })).toBe(false)
  })

  it('location filter: null location allows online_only pros through', () => {
    const pro = makePro({ city: null, online_only: true })
    expect(matchesFilters(pro, { ...noFilters, location: null })).toBe(true)
  })

  it('location filter: city match is accent-insensitive', () => {
    const loc: LocationFilterValue = { city: 'Cordoba', country: 'AR', lat: -31.4, lng: -64.2 }
    const pro = makePro({ city: 'Córdoba', online_only: false })
    expect(matchesFilters(pro, { ...noFilters, location: loc })).toBe(true)
  })
})
