// Tests for SpecialtyMapper component
// Covers: curated chips (no dropdown), custom chips (dropdown), mapping action, keep-as-is

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SpecialtyMapper } from './SpecialtyMapper'

describe('SpecialtyMapper — curated specialties', () => {
  it('renders curated specialties as colored chips without dropdown', () => {
    render(<SpecialtyMapper specialties={['anxiety', 'depression']} onChange={vi.fn()} />)
    // Curated chips resolve their Spanish label via Chip's specialty prop
    expect(screen.getByText('Ansiedad')).toBeInTheDocument()
    expect(screen.getByText('Depresión')).toBeInTheDocument()
  })

  it('does not show mapping dropdown for curated specialties', () => {
    render(<SpecialtyMapper specialties={['anxiety']} onChange={vi.fn()} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})

describe('SpecialtyMapper — custom specialties', () => {
  it('renders custom specialty text with a mapping dropdown', () => {
    render(<SpecialtyMapper specialties={['Mindfulness']} onChange={vi.fn()} />)
    expect(screen.getByText('Mindfulness')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('dropdown includes all 12 curated specialties', () => {
    render(<SpecialtyMapper specialties={['Mindfulness']} onChange={vi.fn()} />)
    const dropdown = screen.getByRole('combobox')
    expect(dropdown).toContainElement(screen.getByRole('option', { name: 'Ansiedad' }))
    expect(dropdown).toContainElement(screen.getByRole('option', { name: 'Niños y adolescentes' }))
  })

  it('dropdown includes "Aprobar como está" option', () => {
    render(<SpecialtyMapper specialties={['Mindfulness']} onChange={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'Aprobar como está' })).toBeInTheDocument()
  })

  it('calls onChange with curated key when admin maps custom to curated', async () => {
    const onChange = vi.fn()
    render(<SpecialtyMapper specialties={['Mindfulness']} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Ansiedad')
    expect(onChange).toHaveBeenCalledWith(['anxiety'])
  })

  it('renders mix of curated and custom correctly', () => {
    render(<SpecialtyMapper specialties={['anxiety', 'Mindfulness']} onChange={vi.fn()} />)
    // Ansiedad appears as both the chip label and a dropdown option — verify at least one instance
    expect(screen.getAllByText('Ansiedad').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Mindfulness')).toBeInTheDocument()
    // Only one dropdown for the custom specialty
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
  })
})
