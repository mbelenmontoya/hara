// AdminFilterBar component tests
// Tests search input, status dropdown, clear button, and result count

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdminFilterBar } from './AdminFilterBar'

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'matched', label: 'Matcheado' },
]

describe('AdminFilterBar', () => {
  it('renders search input and status dropdown', () => {
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
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows "Todos" as first dropdown option', () => {
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
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveTextContent('Todos')
    expect(options[1]).toHaveTextContent('Nuevo')
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
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'new' } })
    expect(onStatusChange).toHaveBeenCalledWith('new')
  })
})
