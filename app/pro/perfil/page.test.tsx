import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProPerfilPage from './page'

const { lookup, practices } = vi.hoisted(() => ({ lookup: vi.fn(), practices: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) } }),
}))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: lookup }) }) }) },
}))
vi.mock('@/lib/practices', () => ({ getActivePractices: practices }))
vi.mock('./ProfileEditForm', () => ({ default: () => <form aria-label="Editar perfil" /> }))

beforeEach(() => {
  vi.clearAllMocks()
  practices.mockResolvedValue([])
})

describe('professional profile status', () => {
  it.each([
    ['submitted', 'Tu perfil está en revisión. Te avisamos por email cuando esté publicado.'],
    ['rejected', 'Tu solicitud no fue aprobada.'],
  ])('shows the %s notice without the editor', async (status, notice) => {
    lookup.mockResolvedValue({ data: { id: 'pro-1', status, rejection_reason: 'Falta información.' } })
    render(await ProPerfilPage())
    expect(screen.getByText(notice)).toBeInTheDocument()
    if (status === 'rejected') expect(screen.getByText('Falta información.')).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.queryByText(/se publican de inmediato/)).not.toBeInTheDocument()
    expect(practices).not.toHaveBeenCalled()
  })

  it('keeps the editor for active professionals', async () => {
    lookup.mockResolvedValue({ data: { id: 'pro-1', status: 'active' } })
    render(await ProPerfilPage())
    expect(screen.getByRole('form', { name: 'Editar perfil' })).toBeInTheDocument()
    expect(screen.getByText(/se publican de inmediato/)).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1, name: 'Tu perfil' }))
    expect(screen.getByRole('link', { name: /volver/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('img', { name: 'Hara' })).toBeInTheDocument()
  })

  it('keeps the contact notice when no profile is linked', async () => {
    lookup.mockResolvedValue({ data: null })
    render(await ProPerfilPage())
    expect(screen.getByText('No encontramos un perfil asociado a tu cuenta.')).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })
})
