import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import QueEsHaraPage from './page'

describe('QueEsHaraPage', () => {
  it('renders all 7 TOC anchors', () => {
    render(<QueEsHaraPage />)
    const anchors = document.querySelectorAll('a[href^="#"]')
    const hrefs = Array.from(anchors).map(a => a.getAttribute('href'))
    expect(hrefs).toContain('#producto')
    expect(hrefs).toContain('#como-funciona')
    expect(hrefs).toContain('#para-quien')
    expect(hrefs).toContain('#diferencias')
    expect(hrefs).toContain('#faq-usuarios')
    expect(hrefs).toContain('#faq-profesionales')
    expect(hrefs).toContain('#contacto')
  })

  it('renders existing que-es-hara sections unchanged', () => {
    render(<QueEsHaraPage />)
    expect(screen.getByText('El producto es la confianza')).toBeInTheDocument()
    expect(screen.getAllByText('Cómo funciona').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Para quién es').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Qué nos hace diferentes').length).toBeGreaterThanOrEqual(1)
  })

  it('renders FAQ sections from ayuda', () => {
    render(<QueEsHaraPage />)
    expect(screen.getByText('Preguntas frecuentes — Usuarios')).toBeInTheDocument()
    expect(screen.getByText('Preguntas frecuentes — Profesionales')).toBeInTheDocument()
  })

  it('renders contact section', () => {
    render(<QueEsHaraPage />)
    expect(screen.getByText('¿Necesitás escribirnos?')).toBeInTheDocument()
    expect(screen.getByText('centrovitalhara@gmail.com')).toBeInTheDocument()
  })
})
