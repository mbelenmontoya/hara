import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders with primary default, fires onClick, and supports secondary variant', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-brand', 'text-white')
    await userEvent.click(btn)
    expect(onClick).toHaveBeenCalledOnce()

    const { container } = render(<Button variant="secondary">Secondary</Button>)
    expect(container.firstChild).toHaveClass('bg-surface', 'text-foreground')
  })

  it('is disabled and blocks clicks when disabled or loading', async () => {
    const onClick = vi.fn()
    const { container } = render(<Button loading onClick={onClick}>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()

    render(<Button disabled onClick={onClick}>Disabled</Button>)
    await userEvent.click(screen.getAllByRole('button')[1])
    expect(onClick).not.toHaveBeenCalled()
  })
})
