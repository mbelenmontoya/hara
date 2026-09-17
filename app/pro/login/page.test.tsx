import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProLoginPage from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword: vi.fn() } }),
}))
vi.mock('@/app/components/ui/PageBackground', () => ({
  PageBackground: ({ image }: { image?: string | null }) => (
    <div data-testid="page-bg" data-image={image ?? 'none'} />
  ),
}))
vi.mock('@/app/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('ProLoginPage', () => {
  it('uses the default app background (no custom blue illustration)', () => {
    render(<ProLoginPage />)
    const bg = screen.getByTestId('page-bg')
    expect(bg).toHaveAttribute('data-image', 'none')
  })
})
