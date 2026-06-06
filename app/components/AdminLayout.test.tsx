import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminLayout } from './AdminLayout'

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/leads' }))
vi.mock('@/app/components/ui/PageBackground', () => ({ PageBackground: () => null }))
vi.mock('@/app/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('AdminLayout nav', () => {
  it('renders the Analíticas nav link pointing to /admin/analytics', () => {
    render(<AdminLayout><div /></AdminLayout>)
    const link = screen.getByRole('link', { name: /analíticas/i })
    expect(link).toHaveAttribute('href', '/admin/analytics')
  })

  it('renders all five nav items', () => {
    render(<AdminLayout><div /></AdminLayout>)
    const navLinks = screen.getAllByRole('link')
    const navLabels = navLinks.map((l) => l.textContent)
    expect(navLabels).toContain('Leads')
    expect(navLabels).toContain('Profesionales')
    expect(navLabels).toContain('Analíticas')
  })
})
