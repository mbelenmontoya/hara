import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScoreBreakdown } from './ScoreDisplay'
import type { ProfileScore } from '@/lib/profile-score'

const BREAKDOWN: ProfileScore['breakdown'] = [
  { key: 'profileImage', label: 'Foto de perfil', weight: 5,  earned: 0,  met: false },
  { key: 'bio',          label: 'Biografía',       weight: 20, earned: 20, met: true  },
]

describe('ScoreBreakdown', () => {
  it('renders all criterion labels', () => {
    render(<ScoreBreakdown breakdown={BREAKDOWN} />)
    expect(screen.getByText('Foto de perfil')).toBeDefined()
    expect(screen.getByText('Biografía')).toBeDefined()
  })

  it('shows earned/weight for each criterion', () => {
    render(<ScoreBreakdown breakdown={BREAKDOWN} />)
    expect(screen.getByText('0/5')).toBeDefined()
    expect(screen.getByText('20/20')).toBeDefined()
  })

  it('scores are not clickable without onOverride', () => {
    const { container } = render(<ScoreBreakdown breakdown={BREAKDOWN} />)
    const clickable = container.querySelectorAll('[class*="cursor-pointer"]')
    expect(clickable.length).toBe(0)
  })

  it('scores show cursor-pointer when onOverride is provided', () => {
    const { container } = render(<ScoreBreakdown breakdown={BREAKDOWN} onOverride={vi.fn()} />)
    const clickable = container.querySelectorAll('[class*="cursor-pointer"]')
    expect(clickable.length).toBe(BREAKDOWN.length)
  })

  it('clicking score opens an input for that criterion', () => {
    render(<ScoreBreakdown breakdown={BREAKDOWN} onOverride={vi.fn()} />)
    const scoreLabel = screen.getByText('0/5')
    fireEvent.click(scoreLabel)
    expect(screen.getByRole('spinbutton')).toBeDefined()
  })

  it('committing input calls onOverride with numeric value', () => {
    const onOverride = vi.fn()
    render(<ScoreBreakdown breakdown={BREAKDOWN} onOverride={onOverride} />)
    fireEvent.click(screen.getByText('0/5'))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onOverride).toHaveBeenCalledWith('profileImage', 3)
  })
})
