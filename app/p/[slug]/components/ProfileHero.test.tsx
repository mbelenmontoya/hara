import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileHero } from './ProfileHero'

const baseProps = {
  name: 'Silvia Ferrer',
  shortDescription: null,
  profileImageUrl: null,
  location: 'Mendoza, AR',
  primaryPractice: null,
  isDestacado: false,
}

describe('ProfileHero', () => {
  it('shows the name as the page heading', () => {
    render(<ProfileHero {...baseProps} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Silvia Ferrer')
  })

  it('shows the short description as a quote only when present', () => {
    const { rerender } = render(<ProfileHero {...baseProps} shortDescription="Acompaño procesos." />)
    expect(screen.getByText(/Acompaño procesos\./)).toBeInTheDocument()

    rerender(<ProfileHero {...baseProps} shortDescription={null} />)
    expect(screen.queryByText(/Acompaño/)).not.toBeInTheDocument()
  })

  it('shows practice and location on one line, without the practice when missing', () => {
    const { rerender } = render(<ProfileHero {...baseProps} primaryPractice="Reiki usui" />)
    expect(screen.getByTestId('hero-meta')).toHaveTextContent('Reiki usui · Mendoza, AR')

    rerender(<ProfileHero {...baseProps} primaryPractice={null} />)
    expect(screen.getByTestId('hero-meta')).toHaveTextContent(/^Mendoza, AR$/)
  })

  it('shows the destacada pill only for featured professionals', () => {
    const { rerender } = render(<ProfileHero {...baseProps} isDestacado />)
    expect(screen.getByTestId('destacado-chip')).toBeInTheDocument()

    rerender(<ProfileHero {...baseProps} isDestacado={false} />)
    expect(screen.queryByTestId('destacado-chip')).not.toBeInTheDocument()
  })

  it('falls back to the initial when there is no photo, and uses the photo when it is an http url', () => {
    const { rerender } = render(<ProfileHero {...baseProps} />)
    expect(screen.getByText('S')).toBeInTheDocument()

    rerender(<ProfileHero {...baseProps} profileImageUrl="https://example.com/a.jpg" />)
    expect(screen.getByAltText('Silvia Ferrer')).toHaveAttribute('src', 'https://example.com/a.jpg')
  })
})
