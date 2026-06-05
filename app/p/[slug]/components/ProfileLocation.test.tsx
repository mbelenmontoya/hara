import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileLocation } from './ProfileLocation'

describe('ProfileLocation', () => {
  const baseProps = {
    city: 'Mendoza',
    location: 'Mendoza, AR',
    onlineOnly: false,
  }

  it('returns null when onlineOnly is true', () => {
    const { container } = render(<ProfileLocation {...baseProps} onlineOnly={true} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when city is null', () => {
    const { container } = render(<ProfileLocation {...baseProps} city={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders address when presencial with city', () => {
    render(<ProfileLocation {...baseProps} />)
    expect(screen.getByText('Mendoza, AR')).toBeInTheDocument()
  })

  it('renders Google Maps iframe when presencial', () => {
    render(<ProfileLocation {...baseProps} />)
    const iframe = document.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toContain('google.com/maps')
  })

  it('renders fallback Google Maps link', () => {
    render(<ProfileLocation {...baseProps} />)
    const link = screen.getByText(/Ver en Google Maps/i)
    expect(link).toBeInTheDocument()
  })
})
