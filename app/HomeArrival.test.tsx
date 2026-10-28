import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeArrival } from './HomeArrival'
import { HomeSearchProvider } from './HomeSearch'
import type { ArrivalCard, HomeRow } from '@/lib/home-arrival'
import type { DirectoryProfessional } from '@/app/profesionales/components/ProfessionalsDirectory'

const row = (r: Partial<HomeRow> & Pick<HomeRow, 'slug' | 'name'>): HomeRow => ({
  quote: null,
  photoUrl: null,
  practice: 'Reiki',
  where: 'Mendoza, AR',
  price: '$850',
  rating: 4.9,
  ratingCount: 12,
  specialtyKeys: [],
  chips: [],
  score: null,
  modality: null,
  destacado: false,
  ...r,
})

const proOf = (r: HomeRow): DirectoryProfessional => ({
  slug: r.slug,
  full_name: r.name,
  specialties: null,
  practices: [],
  modality: null,
  short_description: null,
  city: 'Mendoza',
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
})

const CARDS: ArrivalCard[] = [
  { key: 'estres-ansiedad', label: 'Estrés y ansiedad', count: 2 },
  { key: 'duelo-perdidas', label: 'Duelo y pérdidas', count: 1 },
]

const ROWS: HomeRow[] = [
  row({ slug: 'ana', name: 'Ana Paz', specialtyKeys: ['estres-ansiedad'], destacado: true, photoUrl: 'https://img/ana.jpg', quote: 'Acompaño sin prometer.' }),
  row({ slug: 'beto', name: 'Beto Luna', specialtyKeys: ['estres-ansiedad', 'duelo-perdidas'], practice: 'Reiki', price: null, rating: null, ratingCount: 0 }),
]

function renderHome(rows: HomeRow[], cards: ArrivalCard[] = CARDS, children?: React.ReactNode, featuredPicks: string[] = []) {
  return render(
    <HomeSearchProvider>
      <HomeArrival cards={cards} rows={rows} professionals={rows.map(proOf)} practices={[]} featuredPicks={featuredPicks}>
        {children}
      </HomeArrival>
    </HomeSearchProvider>
  )
}

/** Names in the order the visitor reads them: the featured one first, then the list. */
function namesInOrder(): string[] {
  const featured = screen.queryByTestId('home-featured')
  const first = featured ? [within(featured).getByRole('heading', { level: 3 }).textContent ?? ''] : []
  const list = screen.queryByRole('list')
  const rest = list ? within(list).getAllByRole('link').map((a) => a.textContent ?? '') : []
  return [...first, ...rest]
}

describe('HomeArrival', () => {
  it('starts with nothing selected, listing everyone under a general heading', () => {
    renderHome(ROWS, CARDS, <p>bloque concierge</p>)
    expect(screen.getByRole('button', { name: /estrés y ansiedad/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /duelo y pérdidas/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { name: /todos los profesionales/i })).toBeInTheDocument()
    expect(screen.getByText('Ana Paz')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /beto luna/i })).toHaveAttribute('href', '/p/beto')
    expect(screen.getByText('bloque concierge')).toBeInTheDocument()
  })

  it('a card shows only its professionals and the matching count, and tapping it again shows everyone', async () => {
    const user = userEvent.setup()
    const rows = [
      row({ slug: 'a', name: 'Ana', specialtyKeys: ['estres-ansiedad'] }),
      row({ slug: 'b', name: 'Beto', specialtyKeys: ['duelo-perdidas'] }),
      row({ slug: 'c', name: 'Cora', specialtyKeys: ['estres-ansiedad', 'duelo-perdidas'] }),
    ]
    renderHome(rows)
    expect(namesInOrder()).toEqual(['Ana', 'Beto', 'Cora'])
    expect(screen.getByText('3 de 3 resultados')).toBeInTheDocument()

    const card = screen.getByRole('button', { name: /duelo y pérdidas/i })
    await user.click(card)
    expect(card).toHaveAttribute('aria-pressed', 'true')
    expect(namesInOrder()).toEqual(['Beto', 'Cora'])
    expect(screen.getByText('2 de 3 resultados')).toBeInTheDocument()

    await user.click(card)
    expect(card).toHaveAttribute('aria-pressed', 'false')
    expect(namesInOrder()).toEqual(['Ana', 'Beto', 'Cora'])
    expect(screen.getByText('3 de 3 resultados')).toBeInTheDocument()
  })

  it('features the first pick still shown, and no one when every pick is filtered out', async () => {
    const user = userEvent.setup()
    const rows = [
      row({ slug: 'a', name: 'Ana', specialtyKeys: ['estres-ansiedad'] }),
      row({ slug: 'b', name: 'Beto', specialtyKeys: ['duelo-perdidas'] }),
      row({ slug: 'c', name: 'Cora', specialtyKeys: ['estres-ansiedad'] }),
    ]
    renderHome(rows, CARDS, undefined, ['c', 'a'])
    expect(within(screen.getByTestId('home-featured')).getByText('Cora')).toBeInTheDocument()
    expect(namesInOrder()).toEqual(['Cora', 'Ana', 'Beto'])

    await user.click(screen.getByRole('button', { name: /duelo y pérdidas/i }))
    expect(screen.queryByTestId('home-featured')).not.toBeInTheDocument()
    expect(namesInOrder()).toEqual(['Beto'])
  })

  it('features a destacado professional with their quote and a link to their profile', () => {
    renderHome(ROWS, CARDS, undefined, ['ana'])
    const featured = screen.getByTestId('home-featured')
    expect(within(featured).getByText('Ana Paz')).toBeInTheDocument()
    expect(within(featured).getByText(/Acompaño sin prometer/)).toBeInTheDocument()
    expect(within(featured).getByTestId('destacado-chip')).toBeInTheDocument()
    expect(within(featured).getByRole('link', { name: /escribirle/i })).toHaveAttribute('href', '/p/ana')
    expect(within(featured).getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/p/ana')
  })

  it('shows each professional as a card: Índice Hara, rating, specialties, modality, price and Ver perfil', () => {
    const chips = ['a', 'b', 'c', 'd'].map((k) => ({ key: k, label: `Tema ${k}` }))
    renderHome([
      row({ slug: 'top', name: 'Primera', destacado: true, photoUrl: 'https://img/p.jpg' }),
      row({ slug: 'x', name: 'Ximena', destacado: true, score: 73, chips, modality: 'Online', price: '$850', rating: 4.5, ratingCount: 1, quote: 'Mi descripción' }),
    ])
    const card = screen.getByRole('link', { name: 'Ximena' }).closest('li')!
    expect(within(card).getByTestId('ranking-score')).toHaveTextContent('73')
    expect(within(card).getByTestId('ranking-score').firstElementChild?.getAttribute('style')).toContain('73%')
    expect(within(card).getByTestId('destacado-chip')).toBeInTheDocument()
    expect(within(card).getByText('4.5')).toBeInTheDocument()
    expect(within(card).getByText('· 1 reseña')).toBeInTheDocument()
    expect(within(card).getByText('Mi descripción')).toBeInTheDocument()
    expect(within(card).getByText('Online')).toBeInTheDocument()
    expect(within(card).getByText('$850')).toBeInTheDocument()
    expect(within(card).getByText('Ver perfil →')).toBeInTheDocument()
    expect(screen.getByText(/^Índice Hara:/)).toBeInTheDocument()
  })

  it('shows three specialties and a +N button that reveals the rest and hides them again', async () => {
    const user = userEvent.setup()
    const chips = ['a', 'b', 'c', 'd', 'e'].map((k) => ({ key: k, label: `Tema ${k}` }))
    renderHome([row({ slug: 'top', name: 'Primera' }), row({ slug: 'x', name: 'Ximena', chips })])
    const card = screen.getByRole('link', { name: 'Ximena' }).closest('li')!
    expect(within(card).getAllByText(/^Tema /)).toHaveLength(3)

    await user.click(within(card).getByRole('button', { name: '+2' }))
    expect(within(card).getAllByText(/^Tema /)).toHaveLength(5)

    await user.click(within(card).getByRole('button', { name: 'Menos' }))
    expect(within(card).getAllByText(/^Tema /)).toHaveLength(3)
  })

  it('draws nothing for what a professional does not have: no ring, rating, modality or price', () => {
    renderHome([row({ slug: 'top', name: 'Primera' }), row({ slug: 'x', name: 'Ximena', rating: null, ratingCount: 0, price: null })])
    const card = screen.getByRole('link', { name: 'Ximena' }).closest('li')!
    expect(within(card).queryByTestId('ranking-score')).not.toBeInTheDocument()
    expect(within(card).queryByText('★')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Índice Hara:/)).not.toBeInTheDocument()
  })

  it('lists everyone, 12 at a time, with a button that says how many remain', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 30 }, (_, i) => row({ slug: `p${i}`, name: `Persona ${i}` }))
    renderHome(many, CARDS, undefined, ['p0'])
    const links = () => within(screen.getByRole('list')).getAllByRole('link')
    expect(links()).toHaveLength(12)
    expect(screen.getByText('MOSTRANDO 13 DE 30')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cargar 12 más (17 restantes)' }))
    expect(links()).toHaveLength(24)
    expect(screen.getByText('MOSTRANDO 25 DE 30')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cargar 5 más (5 restantes)' }))
    expect(links()).toHaveLength(29)
    expect(screen.getByText('MOSTRANDO 30 DE 30')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cargar/i })).not.toBeInTheDocument()
  })

  it('offers the concierge instead of an empty list when there is nobody', () => {
    renderHome([])
    expect(screen.getByText(/nadie con eso/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contanos/i })).toHaveAttribute('href', '/solicitar')
  })

  it('lists everyone under a plain heading when there are no cards', () => {
    renderHome(ROWS, [])
    expect(screen.getByRole('heading', { name: /profesionales/i })).toBeInTheDocument()
    expect(screen.getByText('Beto Luna')).toBeInTheDocument()
  })
})
