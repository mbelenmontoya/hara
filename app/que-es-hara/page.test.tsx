import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QueEsHaraPage from './page'

describe('QueEsHaraPage', () => {
  it('is a plain list of questions with the title "Preguntas"', () => {
    render(<QueEsHaraPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Preguntas' })).toBeInTheDocument()
    expect(screen.queryByText(/sin letra chica/i)).not.toBeInTheDocument()
  })

  it('has "¿Qué es Hara Vital?" as one more question, holding all the About-Hara text and links', async () => {
    const user = userEvent.setup()
    render(<QueEsHaraPage />)
    await user.click(screen.getByRole('button', { name: /¿Qué es Hara Vital\?/ }))
    expect(screen.getByText('El producto es la confianza')).toBeInTheDocument()
    expect(screen.getByText('Cómo funciona')).toBeInTheDocument()
    expect(screen.getByText('Para quién es')).toBeInTheDocument()
    expect(screen.getByText('Qué nos hace diferentes')).toBeInTheDocument()
    expect(screen.getByText('Solo profesionales verificados')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ir al directorio/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /pedir recomendación/i })).toHaveAttribute('href', '/solicitar')
    expect(screen.getByRole('link', { name: /registrate acá/i })).toHaveAttribute('href', '/registro')
  })

  it('shows the questions for people looking for help first, and the professional ones behind their chip', async () => {
    const user = userEvent.setup()
    render(<QueEsHaraPage />)
    expect(screen.getByRole('button', { name: /¿Cuánto cuesta usar Hara Vital\?/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /¿Cómo me registro\?/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /para profesionales/i }))
    expect(screen.getByRole('button', { name: /¿Cómo me registro\?/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /¿Cómo me llegan los clientes\?/ })).toBeInTheDocument()
  })

  it('lets people write to the team by email or Instagram', () => {
    render(<QueEsHaraPage />)
    const email = screen.getByRole('link', { name: /centrovitalhara@gmail\.com/ })
    expect(email).toHaveAttribute('href', 'mailto:centrovitalhara@gmail.com')
    const ig = screen.getByRole('link', { name: /@haravital en instagram/i })
    expect(ig).toHaveAttribute('href', 'https://instagram.com/haravital')
    expect(ig).toHaveAttribute('target', '_blank')
    expect(ig).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('ends with links to the directory and to the personalized recommendation', () => {
    render(<QueEsHaraPage />)
    expect(screen.getByRole('link', { name: /explorar profesionales/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /pedí una recomendación personalizada/i })).toHaveAttribute('href', '/solicitar')
  })

  it('never shows an invented phone number or emergency line', () => {
    const { container } = render(<QueEsHaraPage />)
    expect(container.textContent).not.toMatch(/800 911 2000|whatsapp.*\d{6,}/i)
    expect(container.querySelector('a[href^="tel:"], a[href*="wa.me"]')).toBeNull()
  })
})
