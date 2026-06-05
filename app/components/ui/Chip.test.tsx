import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Chip } from './Chip'

describe('Chip — variant prop', () => {
  it('renders label with variant-specific classes and defaults to neutral', () => {
    const { container: neutral } = render(<Chip label="Default" className="extra" />)
    expect(neutral.firstChild).toHaveTextContent('Default')
    expect(neutral.firstChild).toHaveClass('bg-surface-2', 'text-foreground', 'extra')

    const { container: success } = render(<Chip label="OK" variant="success" />)
    expect(success.firstChild).toHaveClass('bg-success-weak', 'text-success')
  })
})

describe('Chip — specialty prop', () => {
  it('renders curated specialty with color and Spanish label', () => {
    const { container } = render(<Chip specialty="estres-ansiedad" />)
    expect(container.firstChild).toHaveTextContent('Estrés y ansiedad')
    expect(container.firstChild).toHaveClass('bg-sp-teal-weak', 'text-sp-teal')
  })

  it('renders all 12 curated specialties with non-neutral styling', () => {
    const curated = [
      'estres-ansiedad', 'bloqueos-emocionales', 'autoconocimiento', 'duelo-perdidas',
      'vinculos-relaciones', 'pareja', 'familia-linaje', 'miedos-creencias',
      'proposito-vida', 'equilibrio-energetico', 'transiciones-vitales', 'trauma-heridas',
    ]
    curated.forEach(key => {
      const { container } = render(<Chip specialty={key} />)
      expect(container.firstChild).not.toHaveClass('bg-surface-2')
    })
  })

  it('renders unknown specialty with neutral style and raw text as label', () => {
    const { container } = render(<Chip specialty="Mindfulness" />)
    expect(container.firstChild).toHaveTextContent('Mindfulness')
    expect(container.firstChild).toHaveClass('bg-surface-2', 'text-foreground')
  })

  it('accepts an explicit label override', () => {
    const { container } = render(<Chip specialty="estres-ansiedad" label="Custom" />)
    expect(container.firstChild).toHaveTextContent('Custom')
    expect(container.firstChild).toHaveClass('bg-sp-teal-weak')
  })
})
