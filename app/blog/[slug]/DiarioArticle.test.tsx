import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiarioArticle, type DiarioArticleProps } from './DiarioArticle'

const BASE: DiarioArticleProps = {
  title: 'Lo que el invierno sabe',
  bodyHtml: '<p>Hay algo que el invierno sabe.</p><h2>El cuerpo se retrae</h2><p>Segundo párrafo.</p>',
  minutes: 5,
  coverUrl: 'https://cdn.test/invierno.jpg',
  secondaryImageUrl: null,
  authorLabel: 'Hara Vital',
  isEditorial: true,
  professional: null,
  next: { slug: 'preguntas', title: '5 preguntas antes de reservar' },
}

function renderArticle(overrides: Partial<DiarioArticleProps> = {}) {
  return render(<DiarioArticle {...BASE} {...overrides} />)
}

describe('DiarioArticle', () => {
  it('should show the title, reading time, editorial author and body', () => {
    const { container } = renderArticle()
    expect(screen.getByRole('heading', { level: 1, name: 'Lo que el invierno sabe' })).toBeInTheDocument()
    expect(screen.getByText('5 min de lectura')).toBeInTheDocument()
    expect(screen.getByText('Hara Vital')).toBeInTheDocument()
    expect(container.querySelector('img[src="/assets/logo/isotipo.png"]')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'El cuerpo se retrae' })).toBeInTheDocument()
    expect(screen.getByText('Segundo párrafo.')).toBeInTheDocument()
  })

  it('should show the cover and a back button to the Diario, and keep the back button without a cover', () => {
    const { container, unmount } = renderArticle()
    expect(container.querySelector('img[src="https://cdn.test/invierno.jpg"]')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Volver al Diario' })).toHaveAttribute('href', '/blog')
    unmount()

    const noCover = renderArticle({ coverUrl: null })
    expect(noCover.container.querySelector('img[src="https://cdn.test/invierno.jpg"]')).toBeNull()
    expect(screen.getByRole('link', { name: 'Volver al Diario' })).toHaveAttribute('href', '/blog')
  })

  it('should invite to write to a confirmed professional, with their profile and the concierge', () => {
    const { container } = renderArticle({
      authorLabel: 'Mariana López',
      isEditorial: false,
      professional: { slug: 'mariana-lopez', fullName: 'Mariana López', imageUrl: 'https://cdn.test/mariana.jpg' },
    })
    expect(screen.getByText(/Escribile a/)).toHaveTextContent('Escribile a Mariana, o pedinos tres opciones.')
    expect(screen.getByRole('link', { name: 'Ver perfil' })).toHaveAttribute('href', '/p/mariana-lopez')
    expect(screen.getByRole('link', { name: 'Concierge' })).toHaveAttribute('href', '/solicitar')
    expect(container.querySelector('img[src="https://cdn.test/mariana.jpg"]')).not.toBeNull()
    expect(container.querySelector('img[src="/assets/logo/isotipo.png"]')).toBeNull()
  })

  it('should only offer the concierge when there is no confirmed professional', () => {
    renderArticle()
    expect(screen.getByText('Si esto te sonó')).toBeInTheDocument()
    expect(screen.queryByText(/Escribile a/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver perfil' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Concierge' })).toHaveAttribute('href', '/solicitar')
  })

  it('should link "Seguí leyendo" to the next post, and hide it when there is none', () => {
    const { unmount } = renderArticle()
    expect(screen.getByRole('link', { name: /Seguí leyendo/ })).toHaveAttribute('href', '/blog/preguntas')
    expect(screen.getByRole('link', { name: /Seguí leyendo/ })).toHaveTextContent('5 preguntas antes de reservar')
    unmount()

    renderArticle({ next: null })
    expect(screen.queryByText(/Seguí leyendo/)).not.toBeInTheDocument()
  })

  it('should show the secondary image after the body when there is one', () => {
    const { container } = renderArticle({ secondaryImageUrl: 'https://cdn.test/segunda.jpg' })
    expect(container.querySelector('img[src="https://cdn.test/segunda.jpg"]')).not.toBeNull()
  })
})
