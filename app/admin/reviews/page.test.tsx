import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import AdminReviewsPage from './page'
import * as monitoring from '@/lib/monitoring'

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return { ...actual, usePathname: () => '/admin/reviews', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }
})

// AdminLayout reads the signed-in email
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: () => Promise.resolve({ data: { user: null } }), signOut: vi.fn() } }),
}))

const REVIEWS = [
  { id: 'r1', professional_id: 'p1', professional_name: 'Sol Luna', rating: 4, text: 'Muy buena sesión', reviewer_name: 'Ana', submitted_at: '2026-10-01T12:00:00.000Z', is_hidden: false },
  { id: 'r2', professional_id: 'p1', professional_name: 'Sol Luna', rating: 2, text: null, reviewer_name: null, submitted_at: '2026-10-02T12:00:00.000Z', is_hidden: true },
]

function stub() {
  const fetchMock = vi.fn((url: string, _init?: RequestInit) =>
    Promise.resolve({ ok: true, json: async () => (url === '/api/admin/reviews' ? { reviews: REVIEWS } : {}) })
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const patches = (m: ReturnType<typeof stub>) => m.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH')

describe('AdminReviewsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})
  })

  it('asks before hiding; Cancelar sends nothing, confirming moves the review to Ocultas', async () => {
    const fetchMock = stub()
    render(<AdminReviewsPage />)
    expect(await screen.findByText('“Muy buena sesión”')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Visibles (1)' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(patches(fetchMock)).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ocultar' }))
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1))
    expect(patches(fetchMock)[0][0]).toBe('/api/admin/reviews/r1')
    expect(JSON.parse((patches(fetchMock)[0][1] as RequestInit).body as string)).toEqual({ is_hidden: true })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ocultas (2)' })).toBeInTheDocument())
    expect(screen.getByText('Sin reseñas visibles')).toBeInTheDocument()
  })

  it('shows a hidden review again without asking', async () => {
    const fetchMock = stub()
    render(<AdminReviewsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ocultas (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1))
    expect(JSON.parse((patches(fetchMock)[0][1] as RequestInit).body as string)).toEqual({ is_hidden: false })
  })

  it('marks every review read when the page opens', async () => {
    const fetchMock = stub()
    render(<AdminReviewsPage />)
    await screen.findByText('“Muy buena sesión”')
    const post = fetchMock.mock.calls.find(([url, init]) => url === '/api/admin/unread' && (init as RequestInit | undefined)?.method === 'POST')
    expect(JSON.parse((post?.[1] as RequestInit).body as string)).toEqual({ kind: 'reviews' })
  })
})
