import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileContact } from './ProfileContact'

// ContactButton mock: accepts onBeforeNavigate and invokes it on click so tests
// can verify the whatsapp_click analytics event is triggered.
vi.mock('@/app/components/ContactButton', () => ({
  ContactButton: ({ onBeforeNavigate }: { onBeforeNavigate?: () => void }) => (
    <button onClick={() => onBeforeNavigate?.()}>Contactar por WhatsApp</button>
  ),
}))

// Mock fireProfileEvent so we can assert it's called with the right args
// without needing a real navigator.sendBeacon in jsdom.
const mockFireProfileEvent = vi.fn()
vi.mock('@/lib/profile-events', () => ({
  fireProfileEvent: (...args: unknown[]) => mockFireProfileEvent(...args),
}))

describe('ProfileContact', () => {
  const baseProps = {
    slug: 'silvia-ferrer',
    name: 'Silvia Ferrer',
    whatsapp: '+5492615551234',
    instagram: null,
  }

  beforeEach(() => {
    mockFireProfileEvent.mockClear()
  })

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

  it('fires instagram_click event when Instagram link is clicked', async () => {
    const user = userEvent.setup()
    render(<ProfileContact {...baseProps} instagram="samastha_yoga" />)
    const link = screen.getByRole('link', { name: /@samastha_yoga/i })
    await user.click(link)
    expect(mockFireProfileEvent).toHaveBeenCalledWith('instagram_click', 'silvia-ferrer')
  })

  it('fires whatsapp_click event when WhatsApp button is clicked', async () => {
    const user = userEvent.setup()
    render(<ProfileContact {...baseProps} />)
    const button = screen.getByRole('button', { name: /contactar por whatsapp/i })
    await user.click(button)
    expect(mockFireProfileEvent).toHaveBeenCalledWith('whatsapp_click', 'silvia-ferrer')
  })
})
