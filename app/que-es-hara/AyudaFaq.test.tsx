import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AyudaFaq } from './AyudaFaq'

const GROUPS = [
  {
    id: 'usuarios',
    label: 'Para quien busca',
    intro: 'Lo que más nos preguntan quienes buscan ayuda.',
    items: [
      { title: '¿Cuánto cuesta?', paragraphs: ['Nada para vos.'] },
      { title: '¿Se comparten mis datos?', paragraphs: ['No.', 'Solo si escribís.'] },
    ],
  },
  {
    id: 'profesionales',
    label: 'Para profesionales',
    intro: 'Si querés sumarte, esto te sirve.',
    items: [{ title: '¿Cómo me registro?', paragraphs: ['En /registro.'] }],
  },
]

describe('AyudaFaq', () => {
  it('starts on the first category with every question closed', () => {
    render(<AyudaFaq groups={GROUPS} />)
    expect(screen.getByRole('button', { name: 'Para quien busca' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Para profesionales' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /¿Cuánto cuesta\?/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Nada para vos.')).not.toBeInTheDocument()
    expect(screen.queryByText('¿Cómo me registro?')).not.toBeInTheDocument()
  })

  it('shows the intro line of the chosen category', async () => {
    const user = userEvent.setup()
    render(<AyudaFaq groups={GROUPS} />)
    expect(screen.getByText('Lo que más nos preguntan quienes buscan ayuda.')).toBeInTheDocument()
    expect(screen.queryByText('Si querés sumarte, esto te sirve.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Para profesionales' }))
    expect(screen.getByText('Si querés sumarte, esto te sirve.')).toBeInTheDocument()
    expect(screen.queryByText('Lo que más nos preguntan quienes buscan ayuda.')).not.toBeInTheDocument()
  })

  it('opens a question to show every paragraph of its answer, and closes it when tapped again', async () => {
    const user = userEvent.setup()
    render(<AyudaFaq groups={GROUPS} />)
    const q = screen.getByRole('button', { name: /¿Se comparten mis datos\?/ })
    await user.click(q)
    expect(q).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('No.')).toBeInTheDocument()
    expect(screen.getByText('Solo si escribís.')).toBeInTheDocument()

    await user.click(q)
    expect(q).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('No.')).not.toBeInTheDocument()
  })

  it('shows a rich answer (with links) when an item brings its own content', async () => {
    const user = userEvent.setup()
    const groups = [
      {
        id: 'g',
        label: 'Grupo',
        intro: 'Intro.',
        items: [{ title: '¿Qué es esto?', content: <a href="/destino">Ir al destino</a> }],
      },
    ]
    render(<AyudaFaq groups={groups} />)
    expect(screen.queryByRole('link', { name: 'Ir al destino' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /¿Qué es esto\?/ }))
    expect(screen.getByRole('link', { name: 'Ir al destino' })).toHaveAttribute('href', '/destino')
  })

  it('keeps only one question open at a time', async () => {
    const user = userEvent.setup()
    render(<AyudaFaq groups={GROUPS} />)
    await user.click(screen.getByRole('button', { name: /¿Cuánto cuesta\?/ }))
    await user.click(screen.getByRole('button', { name: /¿Se comparten mis datos\?/ }))
    expect(screen.getByRole('button', { name: /¿Cuánto cuesta\?/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Nada para vos.')).not.toBeInTheDocument()
    expect(screen.getByText('No.')).toBeInTheDocument()
  })

  it('switching category shows only that category and closes what was open', async () => {
    const user = userEvent.setup()
    render(<AyudaFaq groups={GROUPS} />)
    await user.click(screen.getByRole('button', { name: /¿Cuánto cuesta\?/ }))
    await user.click(screen.getByRole('button', { name: 'Para profesionales' }))

    expect(screen.getByRole('button', { name: 'Para profesionales' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('¿Cuánto cuesta?')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /¿Cómo me registro\?/ })).toHaveAttribute('aria-expanded', 'false')

    await user.click(screen.getByRole('button', { name: 'Para quien busca' }))
    expect(screen.getByRole('button', { name: /¿Cuánto cuesta\?/ })).toHaveAttribute('aria-expanded', 'false')
  })
})
