import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SpecialtyMapper } from './SpecialtyMapper'

describe('SpecialtyMapper — curated specialties', () => {
  it('renders curated chips without dropdown', () => {
    render(<SpecialtyMapper specialties={['anxiety', 'depression']} onChange={vi.fn()} />)
    expect(screen.getByText('Ansiedad')).toBeInTheDocument()
    expect(screen.getByText('Depresión')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})

describe('SpecialtyMapper — custom specialties', () => {
  it('renders custom specialty with dropdown containing all curated options + "Aprobar como está"', () => {
    render(<SpecialtyMapper specialties={['Mindfulness']} onChange={vi.fn()} />)
    expect(screen.getByText('Mindfulness')).toBeInTheDocument()
    const dropdown = screen.getByRole('combobox')
    expect(dropdown).toContainElement(screen.getByRole('option', { name: 'Ansiedad' }))
    expect(dropdown).toContainElement(screen.getByRole('option', { name: 'Aprobar como está' }))
  })

  it('maps custom to curated key via dropdown', async () => {
    const onChange = vi.fn()
    render(<SpecialtyMapper specialties={['Mindfulness']} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Ansiedad')
    expect(onChange).toHaveBeenCalledWith(['anxiety'])
  })

  it('keeps custom specialty unchanged when "Aprobar como está" is selected', async () => {
    const onChange = vi.fn()
    render(<SpecialtyMapper specialties={['Mindfulness']} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Aprobar como está')
    expect(onChange).toHaveBeenCalledWith(['Mindfulness'])
  })

  it('handles mix of curated and custom with one dropdown', () => {
    render(<SpecialtyMapper specialties={['anxiety', 'Mindfulness']} onChange={vi.fn()} />)
    expect(screen.getAllByText('Ansiedad').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Mindfulness')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
  })
})
