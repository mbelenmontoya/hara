import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RegistroForm } from './RegistroForm'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))
vi.mock('@/app/components/PlacesAutocomplete', () => ({
  PlacesAutocomplete: ({ placeholder }: { placeholder?: string }) => <input placeholder={placeholder} />,
}))
vi.mock('@/app/components/ui/PageBackground', () => ({
  PageBackground: ({ image }: { image?: string | null }) => <div data-testid="page-bg" data-image={image ?? 'none'} />,
}))
vi.mock('@/app/profesionales/registro/components/SpecialtySelector', () => ({
  SpecialtySelector: () => <div />,
}))
vi.mock('@/app/components/PracticePicker', () => ({
  PracticePicker: () => <div />,
}))

describe('RegistroForm', () => {
  it('centers the form card with mx-auto', () => {
    const { container } = render(<RegistroForm practices={[]} />)
    // The liquid-glass form card must have mx-auto for centering
    const card = container.querySelector('.liquid-glass')
    expect(card).toHaveClass('mx-auto')
  })

  it('does not render the dev background picker button', () => {
    render(<RegistroForm practices={[]} />)
    expect(screen.queryByRole('button', { name: 'Cambiar fondo' })).toBeNull()
  })

  it('passes no custom image to PageBackground', () => {
    render(<RegistroForm practices={[]} />)
    const bg = screen.getByTestId('page-bg')
    expect(bg).toHaveAttribute('data-image', 'none')
  })
})
