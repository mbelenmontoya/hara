// Unit tests for ReviewSubmitForm component

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewSubmitForm } from './ReviewSubmitForm'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => { vi.clearAllMocks() })

const BASE_PROPS = { token: 'test-token', professionalName: 'Ana García' }

describe('ReviewSubmitForm', () => {
  it('submit is disabled when no rating selected', () => {
    render(<ReviewSubmitForm {...BASE_PROPS} />)
    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled()
  })

  it('enables submit after selecting a star rating', async () => {
    const user = userEvent.setup()
    render(<ReviewSubmitForm {...BASE_PROPS} />)
    await user.click(screen.getByRole('button', { name: /4 estrella/i }))
    expect(screen.getByRole('button', { name: /enviar/i })).not.toBeDisabled()
  })

  it('calls POST /api/reviews/submit with correct payload', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ review_id: 'rev-1' }) })
    const user = userEvent.setup()
    render(<ReviewSubmitForm {...BASE_PROPS} />)
    await user.click(screen.getByRole('button', { name: /5 estrella/i }))
    await user.type(screen.getByPlaceholderText(/experiencia/i), 'Muy buena sesion')
    await user.type(screen.getByPlaceholderText(/María/i), 'María')
    await user.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/reviews/submit')
    const body = JSON.parse(opts.body as string) as Record<string, unknown>
    expect(body.token).toBe('test-token')
    expect(body.rating).toBe(5)
    expect(body.text).toBe('Muy buena sesion')
    expect(body.reviewer_name).toBe('María')
  })

  it('shows thank-you message on success', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ review_id: 'rev-1' }) })
    const user = userEvent.setup()
    render(<ReviewSubmitForm {...BASE_PROPS} />)
    await user.click(screen.getByRole('button', { name: /3 estrella/i }))
    await user.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
  })

  it('shows error alert on API failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Token vencido' }) })
    const user = userEvent.setup()
    render(<ReviewSubmitForm {...BASE_PROPS} />)
    await user.click(screen.getByRole('button', { name: /2 estrella/i }))
    await user.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('does not include reviewer_name when left empty', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ review_id: 'rev-1' }) })
    const user = userEvent.setup()
    render(<ReviewSubmitForm {...BASE_PROPS} />)
    await user.click(screen.getByRole('button', { name: /5 estrella/i }))
    await user.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string) as Record<string, unknown>
    expect(body.reviewer_name).toBeNull()
  })
})
