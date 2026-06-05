import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContactFooterForm } from './ContactFooterForm'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
beforeEach(() => { vi.clearAllMocks() })

describe('ContactFooterForm', () => {
  it('renders heading and all fields', () => {
    render(<ContactFooterForm />)
    expect(screen.getByText(/pregunta/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/tu nombre/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/tu@email\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/en qué/i)).toBeInTheDocument()
  })

  it('submit button disabled until all fields filled', () => {
    render(<ContactFooterForm />)
    const btn = screen.getByRole('button', { name: /enviar consulta/i })
    expect(btn).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(/tu nombre/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), { target: { value: 'ana@e.com' } })
    expect(btn).toBeDisabled() // still missing message

    fireEvent.change(screen.getByPlaceholderText(/en qué/i), { target: { value: 'Hola' } })
    expect(btn).not.toBeDisabled()
  })

  it('shows success state after submission', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    render(<ContactFooterForm />)
    fireEvent.change(screen.getByPlaceholderText(/tu nombre/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), { target: { value: 'ana@e.com' } })
    fireEvent.change(screen.getByPlaceholderText(/en qué/i), { target: { value: 'Pregunta' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar consulta/i }))
    expect(await screen.findByText(/gracias/i)).toBeInTheDocument()
  })
})
