// Tests for SpecialtySelector component
// Covers: curated toggles, custom specialty fields, validation, duplicate detection

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SpecialtySelector } from './SpecialtySelector'

describe('SpecialtySelector — curated toggles', () => {
  it('renders all 12 curated specialty buttons', () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    // Check a few representative labels
    expect(screen.getByRole('button', { name: 'Ansiedad' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Depresión' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Niños y adolescentes' })).toBeInTheDocument()
  })

  it('calls onChange with curated key when toggle is clicked', async () => {
    const onChange = vi.fn()
    render(<SpecialtySelector selected={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ansiedad' }))
    expect(onChange).toHaveBeenCalledWith(['anxiety'])
  })

  it('deselects a curated specialty when clicked again', async () => {
    const onChange = vi.fn()
    render(<SpecialtySelector selected={['anxiety']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ansiedad' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('marks selected curated buttons with aria-pressed=true', () => {
    render(<SpecialtySelector selected={['anxiety']} onChange={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Ansiedad' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks unselected curated buttons with aria-pressed=false', () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Ansiedad' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('SpecialtySelector — custom specialty fields', () => {
  it('shows "Agregar otra especialidad" button', () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Agregar otra especialidad/i })).toBeInTheDocument()
  })

  it('shows input field when "Agregar otra" is clicked', async () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    expect(screen.getByPlaceholderText(/Mindfulness/i)).toBeInTheDocument()
  })

  it('adds valid custom specialty to onChange output', async () => {
    const onChange = vi.fn()
    render(<SpecialtySelector selected={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    await userEvent.type(screen.getByPlaceholderText(/Mindfulness/i), 'Mindfulness')
    // onChange fires with the custom specialty
    expect(onChange).toHaveBeenLastCalledWith(['Mindfulness'])
  })

  it('shows error for duplicate curated label (case-insensitive)', async () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    await userEvent.type(screen.getByPlaceholderText(/Mindfulness/i), 'ansiedad')
    expect(screen.getByText('Esta especialidad ya está en la lista')).toBeInTheDocument()
  })

  it('shows error for too-short input (< 3 chars)', async () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    await userEvent.type(screen.getByPlaceholderText(/Mindfulness/i), 'ab')
    expect(screen.getByText(/Mínimo 3/i)).toBeInTheDocument()
  })

  it('hides "Agregar otra" after 2 custom fields are added', async () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    expect(screen.queryByRole('button', { name: /Agregar otra especialidad/i })).not.toBeInTheDocument()
  })

  it('removes custom field when X is clicked', async () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    expect(screen.getByPlaceholderText(/Mindfulness/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Eliminar especialidad/i }))
    expect(screen.queryByPlaceholderText(/Mindfulness/i)).not.toBeInTheDocument()
  })
})
