import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminLeadsPage from './page'
import * as monitoring from '@/lib/monitoring'

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    usePathname: () => '/admin/leads',
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  }
})

// AdminLayout reads the signed-in email
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: () => Promise.resolve({ data: { user: null } }), signOut: vi.fn() } }),
}))

const lead = (over: Record<string, unknown>) => ({
  id: 'aaaaaaaa-1',
  email: null,
  whatsapp: null,
  country: 'AR',
  city: 'Rosario',
  intent_tags: ['insomnio'],
  status: 'new',
  urgency: 'high',
  created_at: '2026-10-02T15:30:00.000Z',
  latest_match: null,
  match_count: 0,
  ...over,
})

const LEADS = [
  lead({ id: 'aaaaaaaa-1', email: 'sol@test.com', intent_tags: ['insomnio', 'duelo'] }),
  lead({
    id: 'bbbbbbbb-2',
    status: 'matched',
    intent_tags: ['ansiedad'],
    urgency: 'low',
    latest_match: {
      id: 'm1',
      tracking_code: 'HV-AB12',
      created_at: '2026-10-03T10:00:00.000Z',
      professionals: [
        { rank: 1, name: 'Ana', slug: 'ana' },
        { rank: 2, name: 'Bea', slug: 'bea' },
      ],
    },
    match_count: 1,
  }),
  // A new lead that already has a match must not offer "Crear match" again
  lead({
    id: 'cccccccc-3',
    email: 'luz@test.com',
    intent_tags: ['duelo'],
    urgency: 'medium',
    latest_match: { id: 'm2', tracking_code: 'HV-CD34', created_at: '2026-10-04T10:00:00.000Z', professionals: [] },
    match_count: 1,
  }),
]

function stubLeads(leads: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (url === '/api/admin/leads' ? { leads } : { leads: 0, professionals: 0, blog: 0, reviews: 0 }),
      })
    )
  )
}

describe('AdminLeadsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})
  })

  it('shows each lead with its need, Spanish status and match line', async () => {
    stubLeads(LEADS)
    render(<AdminLeadsPage />)

    expect(screen.getByText('Cargando…')).toBeInTheDocument()
    await screen.findByText('sol@test.com')

    expect(screen.getByText('3 solicitudes')).toBeInTheDocument()
    expect(screen.getByText('Solicitud bbbbbbbb')).toBeInTheDocument()
    expect(screen.getByText('insomnio')).toBeInTheDocument()
    expect(screen.getByText('Urgente')).toBeInTheDocument()
    expect(screen.getByText('Sin prisa')).toBeInTheDocument()
    expect(screen.getByText('HV-AB12')).toBeInTheDocument()
    expect(screen.getByText('Ana · Bea')).toBeInTheDocument()
    // Only the lead without a match offers "Crear match"
    const create = screen.getAllByRole('link', { name: 'Crear match' })
    expect(create).toHaveLength(1)
    expect(create[0]).toHaveAttribute('href', '/admin/leads/aaaaaaaa-1/match')
  })

  it('filters by status pill and by search, and "Limpiar búsqueda" brings the list back', async () => {
    stubLeads(LEADS)
    render(<AdminLeadsPage />)
    await screen.findByText('sol@test.com')

    fireEvent.click(screen.getByRole('button', { name: 'Matcheado' }))
    expect(screen.queryByText('sol@test.com')).not.toBeInTheDocument()
    expect(screen.getByText('Solicitud bbbbbbbb')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Buscar por email o necesidad...'), { target: { value: 'nada que coincida' } })
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(screen.getByText('sol@test.com')).toBeInTheDocument()
    expect(screen.getByText('Solicitud bbbbbbbb')).toBeInTheDocument()
  })

  it('says there are no requests yet when the list is empty', async () => {
    stubLeads([])
    render(<AdminLeadsPage />)
    expect(await screen.findByText('Sin solicitudes')).toBeInTheDocument()
    expect(screen.queryByText('Sin resultados')).not.toBeInTheDocument()
  })
})
