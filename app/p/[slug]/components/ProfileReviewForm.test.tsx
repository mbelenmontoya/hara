import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfileReviewForm } from './ProfileReviewForm'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProfileReviewForm', () => {
  it('renders heading and form elements', () => {
    render(<ProfileReviewForm professionalSlug="silvia-ferrer" />)
    expect(screen.getByText(/sesión/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/tu nombre/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dejar comentario/i })).toBeInTheDocument()
  })

  it('submit button is disabled with no rating selected', () => {
    render(<ProfileReviewForm professionalSlug="silvia-ferrer" />)
    const button = screen.getByRole('button', { name: /dejar comentario/i })
    expect(button).toBeDisabled()
  })

  it('submit button is disabled with rating + name but no email', () => {
    render(<ProfileReviewForm professionalSlug="silvia-ferrer" />)
    fireEvent.click(screen.getByRole('button', { name: /4 estrellas/i }))
    fireEvent.change(screen.getByPlaceholderText(/tu nombre/i), { target: { value: 'Ana' } })
    const button = screen.getByRole('button', { name: /dejar comentario/i })
    expect(button).toBeDisabled()
  })

  it('submit button enabled when rating + name + email filled', () => {
    render(<ProfileReviewForm professionalSlug="silvia-ferrer" />)
    fireEvent.click(screen.getByRole('button', { name: /4 estrellas/i }))
    fireEvent.change(screen.getByPlaceholderText(/tu nombre/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), { target: { value: 'ana@example.com' } })
    expect(screen.getByRole('button', { name: /dejar comentario/i })).not.toBeDisabled()
  })

  it('shows success message after successful submission', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({ success: true }) })
    render(<ProfileReviewForm professionalSlug="silvia-ferrer" />)
    fireEvent.click(screen.getByRole('button', { name: /4 estrellas/i }))
    fireEvent.change(screen.getByPlaceholderText(/tu nombre/i), { target: { value: 'Ana García' } })
    fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), { target: { value: 'ana@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /dejar comentario/i }))
    await waitFor(() => {
      expect(screen.getByText(/gracias/i)).toBeInTheDocument()
    })
  })
})
