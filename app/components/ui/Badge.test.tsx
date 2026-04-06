import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children with className passthrough', () => {
    render(<Badge className="extra">Pendiente</Badge>)
    const badge = screen.getByText('Pendiente')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('extra')
    expect(badge.tagName).toBe('SPAN')
  })

  it('renders all variants without throwing', () => {
    const variants = ['new', 'matched', 'contacted', 'converted', 'closed', 'default'] as const
    for (const variant of variants) {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>)
      expect(screen.getByText(variant)).toBeInTheDocument()
      unmount()
    }
  })
})
