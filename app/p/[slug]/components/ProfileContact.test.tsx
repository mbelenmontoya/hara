import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
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
    email: 'silvia@example.com',
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

  it('shows Instagram as a full-width button when there is no WhatsApp number', () => {
    render(<ProfileContact {...baseProps} whatsapp="" instagram="samastha_yoga" />)
    const link = screen.getByRole('link', { name: /@samastha_yoga/i })
    expect(link).toHaveTextContent('Ver en Instagram')
    expect(link.className).toContain('flex-1')
  })

  it('hides Instagram section when instagram is null', () => {
    render(<ProfileContact {...baseProps} instagram={null} />)
    expect(screen.queryByRole('link', { name: /^@/ })).not.toBeInTheDocument()
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

  it('hides WhatsApp button when whatsapp is empty string', () => {
    render(<ProfileContact {...baseProps} whatsapp="" />)
    expect(screen.queryByRole('button', { name: /contactar por whatsapp/i })).not.toBeInTheDocument()
  })

  it('shows email link when email is provided', () => {
    render(<ProfileContact {...baseProps} email="silvia@example.com" />)
    const link = screen.getByRole('link', { name: /silvia@example.com/i })
    expect(link).toHaveAttribute('href', 'mailto:silvia@example.com')
  })

  it('hides email section when email is empty string', () => {
    render(<ProfileContact {...baseProps} email="" />)
    expect(screen.queryByRole('link', { name: /@/i })).not.toBeInTheDocument()
  })

  describe('floating WhatsApp bar', () => {
    type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void
    let trigger: ObserverCallback

    beforeEach(() => {
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(cb: ObserverCallback) { trigger = cb }
          observe() {}
          disconnect() {}
        }
      )
    })

    afterEach(() => { vi.unstubAllGlobals() })

    it('stays hidden while the main button is on screen and shows once it scrolls away', () => {
      render(<ProfileContact {...baseProps} />)
      expect(screen.getByTestId('sticky-cta')).toHaveAttribute('aria-hidden', 'true')

      act(() => trigger([{ isIntersecting: false }]))
      expect(screen.getByTestId('sticky-cta')).toHaveAttribute('aria-hidden', 'false')

      act(() => trigger([{ isIntersecting: true }]))
      expect(screen.getByTestId('sticky-cta')).toHaveAttribute('aria-hidden', 'true')
    })

    it('fires whatsapp_click when the floating bar button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProfileContact {...baseProps} />)
      act(() => trigger([{ isIntersecting: false }]))
      const buttons = screen.getAllByRole('button', { name: /contactar por whatsapp/i })
      await user.click(buttons[buttons.length - 1])
      expect(mockFireProfileEvent).toHaveBeenCalledWith('whatsapp_click', 'silvia-ferrer')
    })

    it('renders no floating bar without a WhatsApp number', () => {
      render(<ProfileContact {...baseProps} whatsapp="" />)
      expect(screen.queryByTestId('sticky-cta')).not.toBeInTheDocument()
    })
  })
})
