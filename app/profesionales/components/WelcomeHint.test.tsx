import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeHint } from './WelcomeHint'

describe('WelcomeHint', () => {
  it('starts open', () => {
    const { container } = render(<WelcomeHint />)
    expect(container.querySelector('details')?.hasAttribute('open')).toBe(true)
  })

  it('shows content when open', () => {
    render(<WelcomeHint />)
    expect(screen.getByText(/solo profesionales verificados/i)).toBeInTheDocument()
  })

  it('collapses when summary is clicked', () => {
    const { container } = render(<WelcomeHint />)
    fireEvent.click(screen.getByText(/cómo funciona hara vital/i))
    expect(container.querySelector('details')?.hasAttribute('open')).toBe(false)
  })

  it('re-expands after collapsing', () => {
    const { container } = render(<WelcomeHint />)
    fireEvent.click(screen.getByText(/cómo funciona hara vital/i))
    fireEvent.click(screen.getByText(/cómo funciona hara vital/i))
    expect(container.querySelector('details')?.hasAttribute('open')).toBe(true)
  })
})
