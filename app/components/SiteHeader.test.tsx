import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SiteHeader } from './SiteHeader'

const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => mockUsePathname() }))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('SiteHeader', () => {
  it('renders home link and nav on public pages with correct z-index', () => {
    mockUsePathname.mockReturnValue('/profesionales')
    const { container } = render(<SiteHeader />)
    expect(screen.getByRole('link', { name: 'Hara — inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Profesionales' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedí recomendación' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Soy profesional' })).toHaveAttribute('href', '/profesionales/registro')
    // Must sit above the fixed PageBackground (z-0) with transparent background
    const header = container.querySelector('header')
    expect(header).toHaveClass('z-10')
    expect(header).toHaveClass('bg-transparent')
  })

  it('shows hamburger button and toggles mobile nav on click', async () => {
    mockUsePathname.mockReturnValue('/profesionales')
    render(<SiteHeader />)

    // Hamburger button must exist
    const hamburger = screen.getByRole('button', { name: 'Abrir menú' })
    expect(hamburger).toBeInTheDocument()

    // Mobile nav not in DOM before click
    expect(screen.queryByTestId('mobile-nav')).toBeNull()

    // Click opens mobile nav with all three links
    await userEvent.click(hamburger)
    const mobileNav = screen.getByTestId('mobile-nav')
    expect(within(mobileNav).getByRole('link', { name: 'Profesionales' })).toHaveAttribute('href', '/profesionales')
    expect(within(mobileNav).getByRole('link', { name: 'Pedí recomendación' })).toHaveAttribute('href', '/solicitar')
    expect(within(mobileNav).getByRole('link', { name: 'Soy profesional' })).toHaveAttribute('href', '/profesionales/registro')
    expect(within(mobileNav).getByRole('link', { name: 'Ayuda' })).toHaveAttribute('href', '/ayuda')

    // Click again closes it
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }))
    expect(screen.queryByTestId('mobile-nav')).toBeNull()
  })

  it('marks only the most specific nav link active on /profesionales/registro', () => {
    mockUsePathname.mockReturnValue('/profesionales/registro')
    render(<SiteHeader />)
    const profesionalesLink = screen.getByRole('link', { name: 'Profesionales' })
    const soyProfesionalLink = screen.getByRole('link', { name: 'Soy profesional' })
    expect(profesionalesLink).not.toHaveClass('underline')
    expect(soyProfesionalLink).toHaveClass('underline')
  })

  it('returns null on excluded routes', () => {
    for (const path of ['/', '/admin/leads', '/r/abc123']) {
      mockUsePathname.mockReturnValue(path)
      const { container } = render(<SiteHeader />)
      expect(container.firstChild).toBeNull()
    }
  })
})
