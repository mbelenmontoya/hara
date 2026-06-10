import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeHint } from './WelcomeHint'

describe('WelcomeHint', () => {
  it('starts closed', () => {
    const { container } = render(<WelcomeHint />)
    expect(container.querySelector('details')?.hasAttribute('open')).toBe(false)
  })

  it('shows content in the DOM regardless of open state', () => {
    render(<WelcomeHint />)
    expect(screen.getByText(/solo profesionales verificados/i)).toBeInTheDocument()
  })

  it('opens when summary is clicked', () => {
    const { container } = render(<WelcomeHint />)
    fireEvent.click(screen.getByText(/cómo funciona hara vital/i))
    expect(container.querySelector('details')?.hasAttribute('open')).toBe(true)
  })

  it('closes after being opened and clicked again', () => {
    const { container } = render(<WelcomeHint />)
    fireEvent.click(screen.getByText(/cómo funciona hara vital/i)) // open
    fireEvent.click(screen.getByText(/cómo funciona hara vital/i)) // close
    expect(container.querySelector('details')?.hasAttribute('open')).toBe(false)
  })
})
