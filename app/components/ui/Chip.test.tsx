// Tests for the Chip component
// Covers: variant prop (5 semantic states), specialty prop (curated → colored, unknown → neutral),
// and discriminated union type behavior

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Chip } from './Chip'

describe('Chip — variant prop', () => {
  it('renders with success variant classes', () => {
    const { container } = render(<Chip label="Success" variant="success" />)
    const chip = container.firstChild as HTMLElement
    expect(chip).toHaveTextContent('Success')
    expect(chip).toHaveClass('bg-success-weak')
    expect(chip).toHaveClass('text-success')
  })

  it('renders with warning variant classes', () => {
    const { container } = render(<Chip label="Warning" variant="warning" />)
    const chip = container.firstChild as HTMLElement
    expect(chip).toHaveClass('bg-warning-weak')
    expect(chip).toHaveClass('text-warning')
  })

  it('renders with brand variant classes', () => {
    const { container } = render(<Chip label="Brand" variant="brand" />)
    const chip = container.firstChild as HTMLElement
    expect(chip).toHaveClass('bg-brand-weak')
    expect(chip).toHaveClass('text-brand')
  })

  it('renders neutral as default when no variant specified', () => {
    const { container } = render(<Chip label="Neutral" />)
    const chip = container.firstChild as HTMLElement
    expect(chip).toHaveClass('bg-surface-2')
    expect(chip).toHaveClass('text-foreground')
  })

  it('passes through className', () => {
    const { container } = render(<Chip label="Test" variant="info" className="extra-class" />)
    expect(container.firstChild).toHaveClass('extra-class')
  })
})

describe('Chip — specialty prop', () => {
  it('renders anxiety specialty with teal color and Spanish label', () => {
    const { container } = render(<Chip specialty="anxiety" />)
    const chip = container.firstChild as HTMLElement
    expect(chip).toHaveTextContent('Ansiedad')
    expect(chip).toHaveClass('bg-sp-teal-weak')
    expect(chip).toHaveClass('text-sp-teal')
  })

  it('renders depression specialty with indigo color', () => {
    const { container } = render(<Chip specialty="depression" />)
    const chip = container.firstChild as HTMLElement
    expect(chip).toHaveTextContent('Depresión')
    expect(chip).toHaveClass('bg-sp-indigo-weak')
  })

  it('renders all 12 curated specialties with non-neutral styling', () => {
    const curated = [
      'anxiety', 'depression', 'stress', 'trauma', 'relationships',
      'self-esteem', 'grief', 'addiction', 'eating-disorders',
      'couples', 'family', 'children',
    ]
    curated.forEach((key) => {
      const { container } = render(<Chip specialty={key} />)
      const chip = container.firstChild as HTMLElement
      // Should NOT use neutral classes
      expect(chip).not.toHaveClass('bg-surface-2')
    })
  })

  it('renders unknown specialty key with neutral style and raw text as label', () => {
    const { container } = render(<Chip specialty="Mindfulness" />)
    const chip = container.firstChild as HTMLElement
    expect(chip).toHaveTextContent('Mindfulness')
    expect(chip).toHaveClass('bg-surface-2')
    expect(chip).toHaveClass('text-foreground')
  })

  it('accepts an explicit label override when using specialty prop', () => {
    const { container } = render(<Chip specialty="anxiety" label="Custom Label" />)
    expect(container.firstChild).toHaveTextContent('Custom Label')
  })
})
