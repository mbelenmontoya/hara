import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WelcomeModal } from './WelcomeModal'

const SEEN_KEY = 'hara:welcome-seen:v1'

const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => mockUsePathname() }))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

beforeEach(() => {
  localStorage.clear()
  mockUsePathname.mockReturnValue('/profesionales')
})

describe('WelcomeModal', () => {
  it('(a) renders the welcome dialog when the flag is absent', () => {
    render(<WelcomeModal />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/bienvenida/i)).toBeInTheDocument()
  })

  it('(b) renders nothing when the flag is already set', () => {
    localStorage.setItem(SEEN_KEY, '1')
    render(<WelcomeModal />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('(c) sets the localStorage flag after first render on a public route', () => {
    render(<WelcomeModal />)
    expect(localStorage.getItem(SEEN_KEY)).toBe('1')
  })

  it('(d) does NOT render on /admin routes', () => {
    mockUsePathname.mockReturnValue('/admin')
    render(<WelcomeModal />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('(d) does NOT render on /r/ concierge routes', () => {
    mockUsePathname.mockReturnValue('/r/abc123')
    render(<WelcomeModal />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
