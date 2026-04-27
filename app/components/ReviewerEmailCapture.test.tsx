// Tests for ReviewerEmailCapture component

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewerEmailCapture } from './ReviewerEmailCapture'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('ReviewerEmailCapture', () => {
  it('shows error for invalid email and does not submit', async () => {
    const user = userEvent.setup()
    render(<ReviewerEmailCapture professionalSlug="ana-garcia" />)
    await user.type(screen.getByPlaceholderText(/email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /avisa/i }))
    expect(screen.getByText(/email inv/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls /api/contact-email with email + stores in localStorage on success', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<ReviewerEmailCapture professionalSlug="ana-garcia" />)
    await user.type(screen.getByPlaceholderText(/email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /avisa/i }))
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledWith('/api/contact-email', expect.objectContaining({
      method: 'POST',
    }))
    expect(localStorage.getItem('reviewer-email:ana-garcia')).toBe('user@example.com')
  })

  it('shows error message when API returns non-ok', async () => {
    mockFetch.mockResolvedValue({ ok: false })
    const user = userEvent.setup()
    render(<ReviewerEmailCapture professionalSlug="ana-garcia" />)
    await user.type(screen.getByPlaceholderText(/email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /avisa/i }))
    await waitFor(() => expect(screen.getByText(/no pudimos guardar/i)).toBeInTheDocument())
    expect(localStorage.getItem('reviewer-email:ana-garcia')).toBeNull()
  })
})
