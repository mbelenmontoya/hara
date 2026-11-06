// AdminFilterBar component tests
// Tests search input, status pills, clear button, and result count

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdminFilterBar } from './AdminFilterBar'

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'matched', label: 'Matcheado' },
]

describe('AdminFilterBar', () => {
  it('renders search input and status pills', () => {
    render(
      <AdminFilterBar
        searchPlaceholder="Buscar por email..."
        searchValue=""
        onSearchChange={vi.fn()}
        statusOptions={STATUS_OPTIONS}
        statusValue=""
        onStatusChange={vi.fn()}
        resultCount={5}
      />
    )
    expect(screen.getByPlaceholderText('Buscar por email...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument()
  })

  it('shows "Todos" as the first pill, selected when no status is picked', () => {
    render(
      <AdminFilterBar
        searchPlaceholder="Buscar..."
        searchValue=""
        onSearchChange={vi.fn()}
        statusOptions={STATUS_OPTIONS}
        statusValue=""
        onStatusChange={vi.fn()}
        resultCount={3}
      />
    )
    const pills = screen.getAllByRole('button')
    expect(pills[0]).toHaveTextContent('Todos')
    expect(pills[1]).toHaveTextContent('Nuevo')
    expect(pills[0]).toHaveAttribute('aria-pressed', 'true')
    expect(pills[1]).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onSearchChange when typing in search', () => {
    const onSearchChange = vi.fn()
    render(
      <AdminFilterBar
        searchPlaceholder="Buscar..."
        searchValue=""
        onSearchChange={onSearchChange}
        statusOptions={STATUS_OPTIONS}
        statusValue=""
        onStatusChange={vi.fn()}
        resultCount={3}
      />
    )
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'test' } })
    expect(onSearchChange).toHaveBeenCalledWith('test')
  })

  it('shows clear button when searchValue is non-empty and calls onSearchChange with empty string', () => {
    const onSearchChange = vi.fn()
    render(
      <AdminFilterBar
        searchPlaceholder="Buscar..."
        searchValue="algo"
        onSearchChange={onSearchChange}
        statusOptions={STATUS_OPTIONS}
        statusValue=""
        onStatusChange={vi.fn()}
        resultCount={1}
      />
    )
    const clearBtn = screen.getByRole('button', { name: /limpiar/i })
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)
    expect(onSearchChange).toHaveBeenCalledWith('')
  })

  it('does not show clear button when search is empty', () => {
    render(
      <AdminFilterBar
        searchPlaceholder="Buscar..."
        searchValue=""
        onSearchChange={vi.fn()}
        statusOptions={STATUS_OPTIONS}
        statusValue=""
        onStatusChange={vi.fn()}
        resultCount={5}
      />
    )
    expect(screen.queryByRole('button', { name: /limpiar/i })).not.toBeInTheDocument()
  })

  it('displays result count', () => {
    render(
      <AdminFilterBar
        searchPlaceholder="Buscar..."
        searchValue=""
        onSearchChange={vi.fn()}
        statusOptions={STATUS_OPTIONS}
        statusValue=""
        onStatusChange={vi.fn()}
        resultCount={7}
      />
    )
    expect(screen.getByText('7 resultados')).toBeInTheDocument()
  })

  it('uses singular "resultado" when count is 1', () => {
    render(
      <AdminFilterBar
        searchPlaceholder="Buscar..."
        searchValue=""
        onSearchChange={vi.fn()}
        statusOptions={STATUS_OPTIONS}
        statusValue=""
        onStatusChange={vi.fn()}
        resultCount={1}
      />
    )
    expect(screen.getByText('1 resultado')).toBeInTheDocument()
  })

  it('calls onStatusChange when selecting a status', () => {
    const onStatusChange = vi.fn()
    render(
      <AdminFilterBar
        searchPlaceholder="Buscar..."
        searchValue=""
        onSearchChange={vi.fn()}
        statusOptions={STATUS_OPTIONS}
        statusValue=""
        onStatusChange={onStatusChange}
        resultCount={3}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo' }))
    expect(onStatusChange).toHaveBeenCalledWith('new')
  })

  it('calls onStatusChange with an empty value when "Todos" is picked', () => {
    const onStatusChange = vi.fn()
    render(
      <AdminFilterBar
        searchPlaceholder="Buscar..."
        searchValue=""
        onSearchChange={vi.fn()}
        statusOptions={STATUS_OPTIONS}
        statusValue="new"
        onStatusChange={onStatusChange}
        resultCount={3}
      />
    )
    expect(screen.getByRole('button', { name: 'Nuevo' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(onStatusChange).toHaveBeenCalledWith('')
  })

  it('hides the "Todos" pill when allLabel is null', () => {
    render(
      <AdminFilterBar
        searchPlaceholder="Buscar..."
        searchValue=""
        onSearchChange={vi.fn()}
        statusOptions={STATUS_OPTIONS}
        statusValue="new"
        onStatusChange={vi.fn()}
        resultCount={3}
        allLabel={null}
      />
    )
    expect(screen.queryByRole('button', { name: 'Todos' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Nuevo', 'Matcheado'])
  })
})
