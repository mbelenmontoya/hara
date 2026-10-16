import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileFacts } from './ProfileFacts'

const empty = {
  ratingAverage: 0,
  ratingCount: 0,
  priceMin: null,
  priceMax: null,
  currency: 'ARS',
  acceptingNewClients: false,
}

describe('ProfileFacts', () => {
  it('shows the rating average and the review count', () => {
    render(<ProfileFacts {...empty} ratingAverage={4.8} ratingCount={12} />)
    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText('12 reseñas')).toBeInTheDocument()
  })

  it('uses the singular for one review', () => {
    render(<ProfileFacts {...empty} ratingAverage={5} ratingCount={1} />)
    expect(screen.getByText('1 reseña')).toBeInTheDocument()
  })

  it('shows the minimum price per session, and the maximum when it is higher', () => {
    const { rerender } = render(<ProfileFacts {...empty} priceMin={850} />)
    expect(screen.getByTestId('fact-price')).toHaveTextContent(/850/)
    expect(screen.getByText('por sesión')).toBeInTheDocument()

    rerender(<ProfileFacts {...empty} priceMin={850} priceMax={1200} />)
    expect(screen.getByText(/hasta/)).toHaveTextContent(/1\.200/)
  })

  it('shows availability only when accepting new clients', () => {
    const { rerender } = render(<ProfileFacts {...empty} acceptingNewClients />)
    expect(screen.getByText('Abierta')).toBeInTheDocument()

    rerender(<ProfileFacts {...empty} acceptingNewClients={false} />)
    expect(screen.queryByText('Abierta')).not.toBeInTheDocument()
  })

  it('renders nothing when there is no rating, price or availability', () => {
    const { container } = render(<ProfileFacts {...empty} />)
    expect(container).toBeEmptyDOMElement()
  })
})
