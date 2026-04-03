import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SpecialtySelector } from './SpecialtySelector'

describe('SpecialtySelector — curated toggles', () => {
  it('renders 12 curated buttons with aria-pressed reflecting selection state', () => {
    render(<SpecialtySelector selected={['anxiety']} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Ansiedad' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Depresión' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Niños y adolescentes' })).toBeInTheDocument()
  })

  it('toggles curated specialty on click and deselects on re-click', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<SpecialtySelector selected={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ansiedad' }))
    expect(onChange).toHaveBeenCalledWith(['anxiety'])

    rerender(<SpecialtySelector selected={['anxiety']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ansiedad' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })
})

describe('SpecialtySelector — custom fields', () => {
  it('reveals input on "Agregar otra" click and adds valid custom to onChange', async () => {
    const onChange = vi.fn()
    render(<SpecialtySelector selected={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    expect(screen.getByPlaceholderText(/Mindfulness/i)).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText(/Mindfulness/i), 'Mindfulness')
    expect(onChange).toHaveBeenLastCalledWith(['Mindfulness'])
  })

  it('shows error for duplicate curated label (case-insensitive)', async () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    await userEvent.type(screen.getByPlaceholderText(/Mindfulness/i), 'ansiedad')
    expect(screen.getByText('Esta especialidad ya está en la lista')).toBeInTheDocument()
  })

  it('shows validation error for too-short input', async () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    await userEvent.type(screen.getByPlaceholderText(/Mindfulness/i), 'ab')
    expect(screen.getByText(/Mínimo 3/i)).toBeInTheDocument()
  })

  it('hides "Agregar otra" after 2 custom fields and restores on remove', async () => {
    render(<SpecialtySelector selected={[]} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    await userEvent.click(screen.getByRole('button', { name: /Agregar otra especialidad/i }))
    expect(screen.queryByRole('button', { name: /Agregar otra especialidad/i })).not.toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar especialidad/i })[0])
    expect(screen.getByRole('button', { name: /Agregar otra especialidad/i })).toBeInTheDocument()
  })
})
