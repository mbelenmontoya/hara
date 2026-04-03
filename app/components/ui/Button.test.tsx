// Tests for the Button component
// Covers: variants, sizes, loading state, disabled, onClick

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Continuar</Button>)
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
  })

  it('applies primary variant classes by default', () => {
    render(<Button>Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-brand')
    expect(btn).toHaveClass('text-white')
  })

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-surface')
    expect(btn).toHaveClass('text-foreground')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled and shows spinner when loading', () => {
    const { container } = render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    // Loading spinner SVG is present
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument()
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Disabled</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
