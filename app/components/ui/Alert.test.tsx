// Tests for the Alert component
// Covers: variant rendering, title, children, className passthrough

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders children content', () => {
    render(<Alert>El formulario tiene errores</Alert>)
    expect(screen.getByText('El formulario tiene errores')).toBeInTheDocument()
  })

  it('renders optional title above children', () => {
    render(<Alert title="Error crítico">Detalle del error</Alert>)
    expect(screen.getByText('Error crítico')).toBeInTheDocument()
    expect(screen.getByText('Detalle del error')).toBeInTheDocument()
  })

  it('applies error variant with danger color classes', () => {
    const { container } = render(<Alert variant="error">Error</Alert>)
    expect(container.firstChild).toHaveClass('bg-danger-weak')
    expect(container.firstChild).toHaveClass('text-danger')
  })

  it('applies success variant with success color classes', () => {
    const { container } = render(<Alert variant="success">OK</Alert>)
    expect(container.firstChild).toHaveClass('bg-success-weak')
    expect(container.firstChild).toHaveClass('text-success')
  })

  it('applies info as default variant', () => {
    const { container } = render(<Alert>Info message</Alert>)
    expect(container.firstChild).toHaveClass('bg-info-weak')
  })

  it('passes through className', () => {
    const { container } = render(<Alert className="mt-4">Test</Alert>)
    expect(container.firstChild).toHaveClass('mt-4')
  })
})
