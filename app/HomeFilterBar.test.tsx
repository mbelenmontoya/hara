import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeArrival } from './HomeArrival'
import { HomeSearchProvider } from './HomeSearch'
import { AlmanacBottomNav } from './components/AlmanacBottomNav'
import type { HomeRow } from '@/lib/home-arrival'
import type { DirectoryProfessional } from '@/app/profesionales/components/ProfessionalsDirectory'
import type { Practice } from '@/lib/practices'

// The real map needs Google; the test only cares which professionals it is given.
vi.mock('@/app/profesionales/components/DirectoryMap', () => ({
  DirectoryMap: ({ professionals }: { professionals: DirectoryProfessional[] }) => (
    <div data-testid="map">{professionals.map((p) => p.slug).join(',')}</div>
  ),
}))

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

const PROS = [
  pro({ slug: 'ana', full_name: 'Ana Paz', practices: ['reiki'], city: 'Mendoza', modality: ['presencial'] }),
  pro({ slug: 'beto', full_name: 'Beto Luna', practices: ['yoga'], city: 'Córdoba', modality: ['presencial', 'online'] }),
  pro({ slug: 'cora', full_name: 'Cora Sol', practices: ['yoga'], online_only: true, modality: ['online'] }),
]

const ROWS: HomeRow[] = PROS.map((p) => ({
  slug: p.slug,
  name: p.full_name,
  quote: null,
  photoUrl: null,
  practice: null,
  where: '',
  price: null,
  rating: null,
  ratingCount: 0,
  specialtyKeys: [],
  chips: [],
  score: null,
  modality: null,
  destacado: false,
}))

const PRACTICES: Practice[] = [
  { key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 1, active: true, specialties: [], aliases: [] },
  { key: 'yoga', label: 'Yoga', slug: 'yoga', sort_order: 2, active: true, specialties: [], aliases: [] },
]

function renderHome() {
  return render(
    <HomeSearchProvider>
      <HomeArrival cards={[]} rows={ROWS} professionals={PROS} practices={PRACTICES} featuredPicks={[]} />
    </HomeSearchProvider>
  )
}

/** Professionals the visitor sees in the list (featured card and rows). */
function listed(): string[] {
  const names = ['Ana Paz', 'Beto Luna', 'Cora Sol']
  return names.filter((n) => screen.queryByText(n))
}

const dialog = () => screen.getByRole('dialog')

describe('home filter bar', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
    vi.restoreAllMocks()
  })

  it('filters by practice, showing each practice with its count and the live result count', async () => {
    const user = userEvent.setup()
    renderHome()
    expect(screen.getByText('3 de 3 resultados')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^prácticas/i }))
    expect(within(dialog()).getByRole('button', { name: /reiki.*1/i })).toBeInTheDocument()
    await user.click(within(dialog()).getByRole('button', { name: /yoga.*2/i }))

    expect(listed()).toEqual(['Beto Luna', 'Cora Sol'])
    expect(screen.getByText('2 de 3 resultados')).toBeInTheDocument()
    await user.click(within(dialog()).getByRole('button', { name: 'Ver 2 resultados' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yoga' })).toBeInTheDocument()
  })

  it('lets several practices be chosen at once', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(screen.getByRole('button', { name: /^prácticas/i }))
    await user.click(within(dialog()).getByRole('button', { name: /yoga/i }))
    await user.click(within(dialog()).getByRole('button', { name: /reiki/i }))
    expect(listed()).toEqual(['Ana Paz', 'Beto Luna', 'Cora Sol'])
    expect(screen.getByRole('button', { name: 'Yoga +1' })).toBeInTheDocument()

    await user.click(within(dialog()).getByRole('button', { name: /yoga/i }))
    expect(listed()).toEqual(['Ana Paz'])

    await user.click(within(dialog()).getByRole('button', { name: 'Limpiar' }))
    expect(listed()).toEqual(['Ana Paz', 'Beto Luna', 'Cora Sol'])
    expect(screen.getByRole('button', { name: 'Prácticas' })).toBeInTheDocument()
  })

  it('filters by modality with counts', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(screen.getByRole('button', { name: /^modalidad/i }))
    expect(within(dialog()).getByRole('radio', { name: /online.*2/i })).toBeInTheDocument()

    expect(within(dialog()).getByRole('radio', { name: /todos/i })).toBeChecked()
    await user.click(within(dialog()).getByRole('radio', { name: /online/i }))
    expect(within(dialog()).getByRole('radio', { name: /online/i })).toBeChecked()
    expect(within(dialog()).getByRole('radio', { name: /todos/i })).not.toBeChecked()
    expect(listed()).toEqual(['Beto Luna', 'Cora Sol'])

    await user.click(within(dialog()).getByRole('radio', { name: /presencial/i }))
    expect(listed()).toEqual(['Ana Paz', 'Beto Luna'])
    expect(screen.getByRole('button', { name: 'Presencial' })).toBeInTheDocument()
  })

  it('filters by a city that exists in the data, narrowing the list of cities as you type', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(screen.getByRole('button', { name: /^ciudad/i }))
    expect(within(dialog()).getByRole('button', { name: /mendoza.*1/i })).toBeInTheDocument()
    expect(within(dialog()).getByRole('button', { name: /córdoba.*1/i })).toBeInTheDocument()

    await user.type(within(dialog()).getByRole('textbox'), 'cordo')
    expect(within(dialog()).queryByRole('button', { name: /mendoza/i })).not.toBeInTheDocument()

    await user.click(within(dialog()).getByRole('button', { name: /córdoba/i }))
    expect(listed()).toEqual(['Beto Luna'])
    expect(within(dialog()).getByRole('button', { name: 'Ver 1 resultado' })).toBeInTheDocument()

    await user.click(within(dialog()).getByRole('button', { name: /cualquier ciudad/i }))
    expect(listed()).toEqual(['Ana Paz', 'Beto Luna', 'Cora Sol'])
  })

  it('turns the search button into a field with the pills below it, and Cancelar clears it and brings the button back', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByRole('button', { name: /^prácticas/i })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /buscar/i }), 'luna')
    expect(listed()).toEqual(['Beto Luna'])
    expect(screen.getByText('1 de 3 resultados')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Borrar búsqueda' }))
    expect(screen.getByRole('textbox', { name: /buscar/i })).toHaveValue('')
    expect(listed()).toEqual(['Ana Paz', 'Beto Luna', 'Cora Sol'])

    await user.type(screen.getByRole('textbox', { name: /buscar/i }), 'luna')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(listed()).toEqual(['Ana Paz', 'Beto Luna', 'Cora Sol'])
    expect(screen.queryByRole('textbox', { name: /buscar/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument()
  })

  it('keeps search in the home filter bar without duplicating it in the bottom menu', async () => {
    const user = userEvent.setup()
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(
      <HomeSearchProvider>
        <HomeArrival cards={[]} rows={ROWS} professionals={PROS} practices={PRACTICES} featuredPicks={[]} />
        <AlmanacBottomNav active="inicio" />
      </HomeSearchProvider>
    )
    expect(screen.queryByRole('textbox', { name: /buscar/i })).not.toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).queryByRole('button', { name: 'Buscar' })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Buscar' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByRole('textbox', { name: /buscar/i })).toHaveFocus()
    expect(screen.getByRole('button', { name: /^prácticas/i })).toBeInTheDocument()
    expect(scrolled).toHaveBeenCalledTimes(1)
    expect(scrolled.mock.instances[0]).toBe(document.getElementById('buscar'))

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('textbox', { name: /buscar/i })).not.toBeInTheDocument()
  })

  it('arrives with the search open from a #buscar link, and drops the #buscar from the address', () => {
    window.history.replaceState(null, '', '/#buscar')
    renderHome()
    expect(screen.getByRole('textbox', { name: /buscar/i })).toBeInTheDocument()
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/')
  })

  it('shows Limpiar filtros only while something is applied, and clears everything', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(screen.getByRole('button', { name: /^modalidad/i }))
    await user.click(within(dialog()).getByRole('radio', { name: /presencial/i }))
    await user.click(within(dialog()).getByRole('button', { name: /ver \d+ resultados/i }))

    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }))
    expect(listed()).toEqual(['Ana Paz', 'Beto Luna', 'Cora Sol'])
    expect(screen.getByText('3 de 3 resultados')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument()
  })

  it('also offers Limpiar filtros for a search alone, and it clears the search', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.type(screen.getByRole('textbox', { name: /buscar/i }), 'luna')

    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }))
    expect(listed()).toEqual(['Ana Paz', 'Beto Luna', 'Cora Sol'])
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument()
  })

  it('goes back to the first 12 people when the search changes', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 30 }, (_, i) => pro({ slug: `p${i}`, full_name: `Persona ${i}` }))
    const manyRows: HomeRow[] = many.map((p) => ({ ...ROWS[0], slug: p.slug, name: p.full_name }))
    render(
      <HomeSearchProvider>
        <HomeArrival cards={[]} rows={manyRows} professionals={many} practices={PRACTICES} featuredPicks={['p0']} />
      </HomeSearchProvider>
    )
    const links = () => within(screen.getByRole('list')).getAllByRole('link')

    await user.click(screen.getByRole('button', { name: /cargar 12 más/i }))
    expect(links()).toHaveLength(24)

    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.type(screen.getByRole('textbox', { name: /buscar/i }), 'persona')
    expect(links()).toHaveLength(12)
  })

  it('keeps the concierge offer when nobody matches', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.type(screen.getByRole('textbox', { name: /buscar/i }), 'zzzz')
    expect(screen.getByText('0 de 3 resultados')).toBeInTheDocument()
    expect(screen.getByText(/nadie con eso/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contanos/i })).toHaveAttribute('href', '/solicitar')
  })

  it('opens one panel at a time, and Escape closes it and returns focus to its pill', async () => {
    const user = userEvent.setup()
    renderHome()
    const pill = screen.getByRole('button', { name: /^prácticas/i })
    expect(pill).toHaveAttribute('aria-expanded', 'false')

    await user.click(pill)
    expect(pill).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(pill).toHaveAttribute('aria-expanded', 'false')
    expect(pill).toHaveFocus()
  })

  it('shows the filtered professionals on the map instead of the list, and Lista brings the list back', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(screen.getByRole('button', { name: /^modalidad/i }))
    await user.click(within(dialog()).getByRole('radio', { name: /presencial/i }))
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: 'Mapa' }))
    expect(screen.getByTestId('map').textContent).toBe('ana,beto')
    expect(screen.queryByText('Ana Paz')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Lista' }))
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
    expect(listed()).toEqual(['Ana Paz', 'Beto Luna'])
  })
})
