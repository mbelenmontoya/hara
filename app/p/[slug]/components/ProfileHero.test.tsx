import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileHero } from './ProfileHero'

const baseProps = {
  name: 'Silvia Ferrer',
  shortDescription: null,
  profileImageUrl: null,
  location: 'Mendoza, AR',
  acceptingNewClients: false,
  isDestacado: false,
  ratingAverage: 0,
  ratingCount: 0,
}

describe('ProfileHero', () => {
  it('shows rating aggregate when ratingCount > 0', () => {
    render(<ProfileHero {...baseProps} ratingAverage={4.8} ratingCount={12} />)
    expect(screen.getByText(/4\.8/)).toBeInTheDocument()
    expect(screen.getByText(/12 reseñas/)).toBeInTheDocument()
  })

  it('hides rating row when ratingCount === 0', () => {
    render(<ProfileHero {...baseProps} ratingAverage={0} ratingCount={0} />)
    expect(screen.queryByText(/reseña/)).not.toBeInTheDocument()
  })

  it('uses singular reseña when ratingCount === 1', () => {
    render(<ProfileHero {...baseProps} ratingAverage={5} ratingCount={1} />)
    expect(screen.getByText(/1 reseña/)).toBeInTheDocument()
    expect(screen.queryByText(/1 reseñas/)).not.toBeInTheDocument()
  })
})
