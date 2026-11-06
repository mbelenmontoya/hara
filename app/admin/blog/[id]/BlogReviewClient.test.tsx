import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { BlogReviewClient } from './BlogReviewClient'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }) }))

const mockFetch = vi.fn()
beforeEach(() => {
  mockRefresh.mockReset()
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
  vi.stubGlobal('fetch', mockFetch)
})

const PROS = [{ id: 'pro-1', full_name: 'Sol Luna', slug: 'sol-luna' }]
const POST = {
  id: 'post-1',
  status: 'submitted' as const,
  professional_id: 'pro-1',
  professional_link_confirmed: false,
  rejection_reason: null,
  author_name: 'Sol',
}

const bodyOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string)

describe('BlogReviewClient', () => {
  it('flags the unconfirmed auto-link and confirms it on approve', async () => {
    render(<BlogReviewClient post={POST} professionals={PROS} />)
    expect(screen.getByText('Se vinculó solo por email a Sol Luna. Confirmá o quitá el vínculo antes de publicar.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/blog/post-1')
    expect(bodyOf(mockFetch.mock.calls[0])).toEqual({ action: 'approve', professional_id: 'pro-1' })
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
  })

  it('will not reject without a reason, then sends the trimmed reason and the cleared link', async () => {
    render(<BlogReviewClient post={POST} professionals={PROS} />)
    fireEvent.change(screen.getByLabelText('Vínculo con Hara'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))

    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rechazar' }))
    expect(within(dialog).getByText('Escribí el motivo antes de rechazar.')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Motivo del rechazo'), { target: { value: '  Muy corta  ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rechazar' }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(bodyOf(mockFetch.mock.calls[0])).toEqual({ action: 'reject', rejection_reason: 'Muy corta', professional_id: null })
  })

  it('shows the outcome instead of the actions once the note is final', () => {
    render(<BlogReviewClient post={{ ...POST, status: 'rejected', rejection_reason: 'Duplicada' }} professionals={PROS} />)
    expect(screen.getByText('Rechazada. Motivo: Duplicada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument()
  })
})
