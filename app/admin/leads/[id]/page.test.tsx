import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminLeadDetailPage from './page'
import * as monitoring from '@/lib/monitoring'

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    usePathname: () => '/admin/leads/test-lead-id',
  }
})

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

    expect(screen.getByText('Cargando...')).toBeInTheDocument()

    await screen.findByText('Detalle de solicitud')

    expect(screen.getAllByText('lead@test.com')).toHaveLength(2)
    expect(screen.getByText('Urgente')).toBeInTheDocument()
    expect(screen.getByText('M-1234567890123-ABC123')).toBeInTheDocument()
    expect(screen.getByText('María Pérez')).toBeInTheDocument()
    expect(screen.getByText('Juan López')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear match' })).toHaveAttribute('href', '/admin/leads/test-lead-id/match')
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
