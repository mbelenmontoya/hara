import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { CartaPick } from '@/lib/carta'
import RecommendationsPage from './page'

const TRACKING_CODE = 'M-1760000000000-ABC123'

vi.mock('next/navigation', () => ({
  useParams: () => ({ tracking_code: TRACKING_CODE }),
}))

const mockSendBeacon = vi.fn()

const pick = (p: Partial<CartaPick> & Pick<CartaPick, 'rank' | 'slug' | 'name'>): CartaPick => ({
  id: `rec-${p.rank}`,
  attributionToken: `tok-${p.rank}`,
  firstName: p.name.split(' ')[0],
  whatsapp: '5491155550101',
  photoUrl: null,
  practice: 'Reiki',
  specialtyKey: 'estres-ansiedad',
  where: 'Mendoza, AR',
  price: '$850',
  rating: 4.5,
  reasons: ['Trabaja mucho con ansiedad y sueño'],
  ...p,
})

const PICKS = [
  pick({ rank: 1, slug: 'lucia-paz', name: 'Lucía Paz' }),
  pick({ rank: 2, slug: 'ana-sol', name: 'Ana Sol', rating: null, price: null, reasons: [] }),
  pick({ rank: 3, slug: 'eva-rio', name: 'Eva Río', reasons: ['Sabe acompañar duelos', 'Atiende online los sábados'] }),
]

function mockFetch(status: number, body: unknown = {}) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }))
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'sendBeacon', { value: mockSendBeacon, configurable: true, writable: true })
})

describe('Carta page', () => {
  it('greets by first name and lists the three picks in rank order with their reasons', async () => {
    mockFetch(200, { carta: { first_name: 'Prueba', sent_at: '2026-10-15T15:00:00Z' }, recommendations: PICKS })
    render(<RecommendationsPage />)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Prueba, estas son tus tres.')
    expect(screen.getByText('Para Prueba')).toBeInTheDocument()
    expect(screen.getByText('JUEVES 15 · OCTUBRE')).toBeInTheDocument()

    const names = within(screen.getByRole('list')).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(names).toEqual(['Lucía Paz', 'Ana Sol', 'Eva Río'])

    const third = screen.getByTestId('carta-pick-3')
    expect(within(third).getByText('Por qué pensé en Eva')).toBeInTheDocument()
    expect(within(third).getByText('Sabe acompañar duelos')).toBeInTheDocument()
    expect(within(third).getByText('Atiende online los sábados')).toBeInTheDocument()
    expect(within(third).getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', `/p/eva-rio?from=/r/${TRACKING_CODE}`)
  })

  it('hides rating, price and the reasons block when a pick has none', async () => {
    mockFetch(200, { carta: { first_name: 'Prueba', sent_at: '2026-10-15T15:00:00Z' }, recommendations: PICKS })
    render(<RecommendationsPage />)

    const second = await screen.findByTestId('carta-pick-2')
    expect(within(second).queryByText('★')).toBeNull()
    expect(within(second).queryByText(/\$850/)).toBeNull()
    expect(within(second).queryByText(/Por qué pensé en/)).toBeNull()
    expect(within(screen.getByTestId('carta-pick-1')).getByText(/4\.5 · \$850/)).toBeInTheDocument()
  })

  it('leaves out the WhatsApp button when the professional has no number', async () => {
    const noPhone = [pick({ rank: 1, slug: 'lucia-paz', name: 'Lucía Paz', whatsapp: '' })]
    mockFetch(200, { carta: { first_name: 'Prueba', sent_at: '2026-10-15T15:00:00Z' }, recommendations: noPhone })
    render(<RecommendationsPage />)

    const first = await screen.findByTestId('carta-pick-1')
    expect(within(first).queryByRole('link', { name: 'Escribirle por WhatsApp' })).toBeNull()
    expect(within(first).getByRole('link', { name: 'Perfil' })).toBeInTheDocument()
  })

  it('uses a neutral heading and no "Para" label without a first name', async () => {
    mockFetch(200, { carta: { first_name: null, sent_at: '2026-10-15T15:00:00Z' }, recommendations: PICKS })
    render(<RecommendationsPage />)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Estas son tus tres.')
    expect(screen.queryByText(/^Para /)).toBeNull()
  })

  it('sends the attributed contact event when WhatsApp is tapped', async () => {
    mockFetch(200, { carta: { first_name: 'Prueba', sent_at: '2026-10-15T15:00:00Z' }, recommendations: PICKS })
    render(<RecommendationsPage />)

    const first = await screen.findByTestId('carta-pick-1')
    fireEvent.click(within(first).getByRole('link', { name: 'Escribirle por WhatsApp' }))

    await waitFor(() => expect(mockSendBeacon).toHaveBeenCalledTimes(1))
    const [url, blob] = mockSendBeacon.mock.calls[0] as [string, Blob]
    expect(url).toBe('/api/events')
    const payload = JSON.parse(await blob.text()) as Record<string, unknown>
    expect(payload).toMatchObject({ attribution_token: 'tok-1', tracking_code: TRACKING_CODE, rank: 1, professional_slug: 'lucia-paz' })
  })

  it('shows the not-found state with a way to ask again for an unknown code', async () => {
    mockFetch(404, { error: 'Match not found' })
    render(<RecommendationsPage />)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('No encontramos esta carta')
    expect(screen.getByRole('link', { name: 'Pedir una recomendación' })).toHaveAttribute('href', '/solicitar')
  })
})
