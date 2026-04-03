import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders children, optional title, defaults to info variant, and passes className', () => {
    const { container } = render(
      <Alert title="Título" className="mt-4">Detalle del mensaje</Alert>
    )
    expect(screen.getByText('Título')).toBeInTheDocument()
    expect(screen.getByText('Detalle del mensaje')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('bg-info-weak', 'mt-4')
  })

  it('applies variant-specific color classes', () => {
    const { container: c1 } = render(<Alert variant="error">Error</Alert>)
    expect(c1.firstChild).toHaveClass('bg-danger-weak', 'text-danger')

    const { container: c2 } = render(<Alert variant="success">OK</Alert>)
    expect(c2.firstChild).toHaveClass('bg-success-weak', 'text-success')
  })
})
