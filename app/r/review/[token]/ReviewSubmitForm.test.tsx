// Unit tests for the review link form (design 9d): stars, tags, words, name, anonymous switch,
// sending, the thank-you preview and editing the same review.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewSubmitForm } from './ReviewSubmitForm'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => { vi.clearAllMocks() })

const PROFESSIONAL = { name: 'Lucía Paz', photoUrl: null, practice: 'Reiki', specialtyKey: 'estres-ansiedad' }
const BASE_PROPS = { token: 'test-token', professional: PROFESSIONAL, savedReview: null }
const publish = () => screen.getByRole('button', { name: 'Publicar reseña' })
const sentBody = () => JSON.parse((mockFetch.mock.calls.at(-1) as [string, RequestInit])[1].body as string) as Record<string, unknown>

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '4 estrellas' }))
  await user.click(screen.getByRole('button', { name: 'Puntual' }))
  await user.click(screen.getByRole('button', { name: 'Volvería' }))
  await user.type(screen.getByLabelText('En tus palabras'), 'Salí más tranquila')
  await user.type(screen.getByLabelText('Tu nombre'), 'prueba claude')
}

describe('ReviewSubmitForm', () => {
  it('shows the professional and keeps Publicar disabled until a star is picked', async () => {
    const user = userEvent.setup()
    render(<ReviewSubmitForm {...BASE_PROPS} />)

    expect(screen.getByText('Lucía Paz')).toBeInTheDocument()
    expect(screen.getByText('Reiki')).toBeInTheDocument()
    expect(screen.getByText('Tocá para calificar')).toBeInTheDocument()
    expect(publish()).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '4 estrellas' }))
    expect(screen.getByText('Muy bien')).toBeInTheDocument()
    expect(publish()).not.toBeDisabled()
  })

  it('sends the stars, tags, words and name, then shows the preview', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ review_id: 'rev-1' }) })
    const user = userEvent.setup()
    render(<ReviewSubmitForm {...BASE_PROPS} />)

    await fillForm(user)
    expect(screen.getByText('Se mostrará como “Prueba C.”')).toBeInTheDocument()
    await user.click(publish())

    expect(mockFetch).toHaveBeenCalledWith('/api/reviews/submit', expect.objectContaining({ method: 'POST' }))
    expect(sentBody()).toEqual({
      token: 'test-token', rating: 4, text: 'Salí más tranquila', reviewer_name: 'prueba claude', tags: ['puntual', 'volveria'],
    })
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Gracias, Prueba.')
    expect(screen.getByLabelText('4 de 5 estrellas')).toHaveTextContent('★★★★')
    expect(screen.getByText('“Salí más tranquila”')).toBeInTheDocument()
    expect(screen.getByText('Prueba C. · Puntual · Volvería')).toBeInTheDocument()
  })

  it('sends no name when published anonymously and shows "Anónimo"', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ review_id: 'rev-1' }) })
    const user = userEvent.setup()
    render(<ReviewSubmitForm {...BASE_PROPS} />)

    await fillForm(user)
    await user.click(screen.getByRole('switch', { name: 'Publicar sin mi nombre' }))
    expect(screen.getByText('Se mostrará como “Anónimo”')).toBeInTheDocument()
    await user.click(publish())

    expect(sentBody().reviewer_name).toBeNull()
    expect(await screen.findByText('Anónimo · Puntual · Volvería')).toBeInTheDocument()
  })

  it('goes back to the filled form with "Editar mi reseña" and sends the change', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ review_id: 'rev-1' }) })
    const user = userEvent.setup()
    render(<ReviewSubmitForm {...BASE_PROPS} />)

    await fillForm(user)
    await user.click(publish())
    await user.click(await screen.findByRole('button', { name: 'Editar mi reseña' }))

    expect(screen.getByLabelText('En tus palabras')).toHaveValue('Salí más tranquila')
    expect(screen.getByRole('button', { name: 'Puntual' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '5 estrellas' }))
    await user.click(publish())

    expect(sentBody()).toMatchObject({ rating: 5, tags: ['puntual', 'volveria'] })
    expect(await screen.findByLabelText('5 de 5 estrellas')).toHaveTextContent('★★★★★')
  })

  it('opens on the preview of an already saved review', () => {
    render(
      <ReviewSubmitForm
        {...BASE_PROPS}
        savedReview={{ rating: 3, text: null, reviewerName: null, tags: ['precio-justo'] }}
      />
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Gracias.')
    expect(screen.getByLabelText('3 de 5 estrellas')).toHaveTextContent('★★★')
    expect(screen.getByText('Anónimo · Precio justo')).toBeInTheDocument()
    expect(screen.queryByText(/“/)).toBeNull()
  })

  it('shows the error and keeps the form filled when sending fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'El enlace de reseña venció.' }) })
    const user = userEvent.setup()
    render(<ReviewSubmitForm {...BASE_PROPS} />)

    await fillForm(user)
    await user.click(publish())

    expect(await screen.findByText('El enlace de reseña venció.')).toBeInTheDocument()
    expect(screen.getByLabelText('En tus palabras')).toHaveValue('Salí más tranquila')
  })
})
