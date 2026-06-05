import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileContact } from './ProfileContact'

vi.mock('@/app/components/ContactButton', () => ({
  ContactButton: () => <button>Contactar por WhatsApp</button>,
}))

describe('ProfileContact', () => {
  const baseProps = {
    slug: 'silvia-ferrer',
    name: 'Silvia Ferrer',
    whatsapp: '+5492615551234',
    instagram: null,
  }

  it('does not show raw WhatsApp number', () => {
    render(<ProfileContact {...baseProps} />)
    expect(screen.queryByText('+5492615551234')).not.toBeInTheDocument()
  })

  it('shows Instagram as @handle link when present (full URL)', () => {
    render(<ProfileContact {...baseProps} instagram="https://www.instagram.com/samastha_yoga" />)
    const link = screen.getByRole('link', { name: /@samastha_yoga/i })
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/samastha_yoga')
  })

  it('shows Instagram as @handle link when stored as bare handle', () => {
    render(<ProfileContact {...baseProps} instagram="samastha_yoga" />)
    const link = screen.getByRole('link', { name: /@samastha_yoga/i })
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/samastha_yoga')
  })

  it('hides Instagram section when instagram is null', () => {
    render(<ProfileContact {...baseProps} instagram={null} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('does not render ReviewerEmailCapture', () => {
    render(<ProfileContact {...baseProps} />)
    expect(screen.queryByPlaceholderText('tu@email.com')).not.toBeInTheDocument()
  })
})
