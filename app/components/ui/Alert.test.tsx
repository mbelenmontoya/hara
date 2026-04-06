import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders children and optional title with className passthrough', () => {
    const { container } = render(
      <Alert title="Título" className="mt-4">Detalle del mensaje</Alert>
    )
    expect(screen.getByText('Título')).toBeInTheDocument()
    expect(screen.getByText('Detalle del mensaje')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('mt-4')
  })

  it('renders without title when omitted', () => {
    render(<Alert>Solo mensaje</Alert>)
    expect(screen.getByText('Solo mensaje')).toBeInTheDocument()
  })

  it('renders an icon for each variant', () => {
    const variants = ['success', 'info', 'warning', 'error'] as const
    for (const variant of variants) {
      const { container, unmount } = render(<Alert variant={variant}>Texto</Alert>)
      expect(container.querySelector('svg')).toBeInTheDocument()
      unmount()
    }
  })
})
