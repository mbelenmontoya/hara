import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { normalize, buildPracticeIndex, matchesProfessional, ProfessionalsDirectory } from './ProfessionalsDirectory'
import type { DirectoryProfessional } from './ProfessionalsDirectory'

const makePro = (overrides: Partial<DirectoryProfessional>): DirectoryProfessional => ({
  slug: 'test',
  full_name: 'Test Pro',
  specialties: null,
  practices: null,
  modality: null,
  short_description: null,
  city: null,
  country: 'AR',
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

    // Initially only 3 chips shown + expand button
    expect(screen.getByText('reiki')).toBeInTheDocument()
    expect(screen.getByText('yoga')).toBeInTheDocument()
    expect(screen.getByText('meditacion')).toBeInTheDocument()
    expect(screen.queryByText('tarot')).not.toBeInTheDocument()
    expect(screen.queryByText('registros')).not.toBeInTheDocument()
    const expandBtn = screen.getByRole('button', { name: /\+2/i })
    expect(expandBtn).toBeInTheDocument()

    // Click expand — all chips visible, button gone
    fireEvent.click(expandBtn)
    expect(screen.getByText('tarot')).toBeInTheDocument()
    expect(screen.getByText('registros')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+/i })).not.toBeInTheDocument()
  })
})
