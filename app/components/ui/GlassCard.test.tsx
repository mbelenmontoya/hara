import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GlassCard } from './GlassCard'

describe('GlassCard', () => {
  it('renders children and passes className to outer element', () => {
    const { container } = render(<GlassCard className="custom">Card content</GlassCard>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('custom')
  })
})
