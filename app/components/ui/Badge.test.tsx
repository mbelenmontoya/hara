import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children with default neutral style and passes className', () => {
    const { container } = render(<Badge className="extra">Pendiente</Badge>)
    expect(container.firstChild).toHaveTextContent('Pendiente')
    expect(container.firstChild).toHaveClass('bg-surface-2', 'extra')
  })

  it('applies variant-specific color classes', () => {
    const { container: c1 } = render(<Badge variant="new">Nuevo</Badge>)
    expect(c1.firstChild).toHaveClass('bg-brand-weak', 'text-brand')

    const { container: c2 } = render(<Badge variant="converted">OK</Badge>)
    expect(c2.firstChild).toHaveClass('bg-success-weak', 'text-success')
  })
})
