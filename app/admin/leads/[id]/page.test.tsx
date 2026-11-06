import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminLeadDetailPage from './page'
import * as monitoring from '@/lib/monitoring'

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    usePathname: () => '/admin/leads/test-lead-id',
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  }
})

// AdminLayout reads the signed-in email
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: () => Promise.resolve({ data: { user: null } }), signOut: vi.fn() } }),
}))

const sampleLead = {
  id: 'test-lead-id',
  email: 'lead@test.com',
  whatsapp: '+5491112345678',
  country: 'AR',
  city: 'Buenos Aires',
  intent_tags: ['anxiety', 'stress'],
  status: 'new',
  urgency: 'high',
  created_at: '2026-04-22T15:30:00.000Z',
  additional_context: 'Nombre: Sol\nHorario: Noche\n\nDuermo mal hace meses',
  match_count: 1,
  latest_match: {
    id: 'match-1',
    tracking_code: 'M-1234567890123-ABC123',
    created_at: '2026-04-22T16:00:00.000Z',
    professionals: [
      { rank: 1, name: 'María Pérez', slug: 'maria-perez' },
      { rank: 2, name: 'Juan López', slug: 'juan-lopez' },
    ],
  },
}

describe('AdminLeadDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})
  })

  it('renders lead details and current match context', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ lead: sampleLead }),
      })
    )

    render(<AdminLeadDetailPage params={{ id: 'test-lead-id' }} />)

    expect(screen.getByText('Cargando…')).toBeInTheDocument()

    await screen.findByRole('heading', { name: 'lead@test.com' })

    expect(screen.getAllByText('lead@test.com')).toHaveLength(2)
    expect(screen.getAllByText('Nuevo')).toHaveLength(2) // badge + Estado row
    expect(screen.getByText('Urgente')).toBeInTheDocument()
    expect(screen.getByText('M-1234567890123-ABC123')).toBeInTheDocument()
    expect(screen.getByText('María Pérez')).toBeInTheDocument()
    expect(screen.getByText('Juan López')).toBeInTheDocument()
    // With a match the design offers "Rehacer match" instead of "Crear match"
    expect(screen.getByRole('link', { name: 'Rehacer match' })).toHaveAttribute('href', '/admin/leads/test-lead-id/match')
    expect(screen.queryByRole('link', { name: 'Crear match' })).not.toBeInTheDocument()
    expect(screen.getByText(/Duermo mal hace meses/)).toHaveTextContent('Nombre: Sol Horario: Noche Duermo mal hace meses')
  })

  it('shows muted italic texts for every field the lead left empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lead: {
            ...sampleLead,
            email: null,
            whatsapp: null,
            city: null,
            intent_tags: [],
            additional_context: null,
            latest_match: null,
            match_count: 0,
          },
        }),
      })
    )

    render(<AdminLeadDetailPage params={{ id: 'test-lead-id' }} />)

    await screen.findByRole('heading', { name: 'Solicitud test-lea' })
    for (const text of ['No dejó email', 'No dejó WhatsApp', 'No indicó ubicación', 'No marcó necesidades.', 'No contó nada más.']) {
      expect(screen.getByText(text)).toHaveClass('italic')
    }
    expect(screen.getByRole('link', { name: 'Crear match' })).toHaveAttribute('href', '/admin/leads/test-lead-id/match')
  })

  it('marks the lead read when the detail opens', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ lead: sampleLead }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminLeadDetailPage params={{ id: 'test-lead-id' }} />)

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([url, init]) => url === '/api/admin/unread' && init?.method === 'POST')
      expect(post).toBeDefined()
      expect(JSON.parse(post?.[1].body)).toEqual({ kind: 'leads', id: 'test-lead-id' })
    })
  })

  it('renders the empty/error state when the lead cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Solicitud no encontrada' }),
      })
    )

    render(<AdminLeadDetailPage params={{ id: 'missing-lead' }} />)

    await screen.findByRole('heading', { name: 'Solicitud no encontrada' })

    expect(screen.getByRole('link', { name: 'Volver a solicitudes' })).toHaveAttribute('href', '/admin/leads')
  })
})
