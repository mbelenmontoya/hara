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
    mockUsePathname.mockReturnValue('/terminos')
    const { container } = render(<SiteHeader />)
    expect(screen.getByRole('link', { name: 'Hara — inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Profesionales' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Pedí recomendación' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Soy profesional' })).toHaveAttribute('href', '/registro')
    expect(screen.getByRole('link', { name: 'Qué es Hara' })).toHaveAttribute('href', '/que-es-hara')
    // Must sit above the fixed PageBackground (z-0) with transparent background
    const header = container.querySelector('header')
    expect(header).toHaveClass('z-10')
    expect(header).toHaveClass('bg-transparent')
  })

  it('shows hamburger button and toggles mobile nav on click', async () => {
    mockUsePathname.mockReturnValue('/terminos')
    render(<SiteHeader />)

    // Hamburger button must exist
    const hamburger = screen.getByRole('button', { name: 'Abrir menú' })
    expect(hamburger).toBeInTheDocument()

    // Mobile nav not in DOM before click
    expect(screen.queryByTestId('mobile-nav')).toBeNull()

    // Click opens mobile nav with all three links
    await userEvent.click(hamburger)
    const mobileNav = screen.getByTestId('mobile-nav')
    expect(within(mobileNav).getByRole('link', { name: 'Profesionales' })).toHaveAttribute('href', '/')
    expect(within(mobileNav).getByRole('link', { name: 'Pedí recomendación' })).toHaveAttribute('href', '/solicitar')
    expect(within(mobileNav).getByRole('link', { name: 'Soy profesional' })).toHaveAttribute('href', '/registro')
    expect(within(mobileNav).getByRole('link', { name: 'Qué es Hara' })).toHaveAttribute('href', '/que-es-hara')

    // Click again closes it
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }))
    expect(screen.queryByTestId('mobile-nav')).toBeNull()
  })

  it('marks no link as active on a page outside the nav', () => {
    mockUsePathname.mockReturnValue('/terminos')
    render(<SiteHeader />)
    for (const name of ['Soy profesional', 'Profesionales', 'Diario', 'Qué es Hara']) {
      expect(screen.getByRole('link', { name })).not.toHaveClass('underline')
    }
  })

  it('keeps a section link active on its sub-pages, even though the first link points to /', () => {
    mockUsePathname.mockReturnValue('/blog/escribir')
    render(<SiteHeader />)
    expect(screen.getByRole('link', { name: 'Diario' })).toHaveClass('underline')
    expect(screen.getByRole('link', { name: 'Profesionales' })).not.toHaveClass('underline')
  })

  it('returns null on excluded routes', () => {
    for (const path of ['/', '/que-es-hara', '/solicitar', '/blog', '/registro', '/pro/login', '/pro/perfil', '/pro/set-password', '/blog/mi-nota', '/admin/leads', '/r/abc123']) {
      mockUsePathname.mockReturnValue(path)
      const { container } = render(<SiteHeader />)
      expect(container.firstChild).toBeNull()
    }
  })
})
