// Tests for the Badge component
// Covers: variant rendering, children, default behavior

import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children text', () => {
    const { container } = render(<Badge>Pendiente</Badge>)
    expect(container.firstChild).toHaveTextContent('Pendiente')
  })

  it('applies new variant with brand color classes', () => {
    const { container } = render(<Badge variant="new">Nuevo</Badge>)
    expect(container.firstChild).toHaveClass('bg-brand-weak')
    expect(container.firstChild).toHaveClass('text-brand')
  })

  it('applies converted variant with success color classes', () => {
    const { container } = render(<Badge variant="converted">Convertido</Badge>)
    expect(container.firstChild).toHaveClass('bg-success-weak')
    expect(container.firstChild).toHaveClass('text-success')
  })

  it('renders default variant when no variant specified', () => {
    const { container } = render(<Badge>Status</Badge>)
    expect(container.firstChild).toHaveClass('bg-surface-2')
  })

  it('passes through className', () => {
    const { container } = render(<Badge className="extra">Test</Badge>)
    expect(container.firstChild).toHaveClass('extra')
  })
})
