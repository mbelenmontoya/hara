// Tests for the GlassCard component
// Covers: children rendering, liquid-glass class, className passthrough

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GlassCard } from './GlassCard'

describe('GlassCard', () => {
  it('renders children content', () => {
    render(<GlassCard><p>Card content</p></GlassCard>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies liquid-glass class for frosted effect', () => {
    const { container } = render(<GlassCard>Content</GlassCard>)
    expect(container.firstChild).toHaveClass('liquid-glass')
  })

  it('applies rounded-3xl for the card shape', () => {
    const { container } = render(<GlassCard>Content</GlassCard>)
    expect(container.firstChild).toHaveClass('rounded-3xl')
  })

  it('passes through className to the outer wrapper', () => {
    const { container } = render(<GlassCard className="custom-class">Content</GlassCard>)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
