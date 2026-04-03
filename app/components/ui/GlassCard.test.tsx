import { render, screen } from '@testing-library/react'
import { it, expect } from 'vitest'
import { GlassCard } from './GlassCard'

it('GlassCard renders children with liquid-glass, rounded-3xl, and passes className', () => {
  const { container } = render(<GlassCard className="custom">Card content</GlassCard>)
  expect(screen.getByText('Card content')).toBeInTheDocument()
  expect(container.firstChild).toHaveClass('liquid-glass', 'rounded-3xl', 'custom')
})
