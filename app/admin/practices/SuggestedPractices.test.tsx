import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { SuggestedPractices } from './SuggestedPractices'
import type { PracticeWithCount } from '@/lib/admin-practices'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockFetch = vi.fn()
beforeEach(() => {
  mockRefresh.mockReset()
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  vi.stubGlobal('fetch', mockFetch)
})

const PRACTICES: PracticeWithCount[] = [{ key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 10, active: true, usage_count: 5 }]
const SUGGESTIONS = [{ entry: 'Péndulo hebreo', count: 2 }]

describe('SuggestedPractices', () => {
  it('asks before discarding, and Cancelar sends nothing', async () => {
    render(<SuggestedPractices suggestions={SUGGESTIONS} practices={PRACTICES} />)
    expect(screen.getByText('Escrita por 2 profesionales')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Descartar "Péndulo hebreo"' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('discards the entry after confirming', async () => {
    render(<SuggestedPractices suggestions={SUGGESTIONS} practices={PRACTICES} />)
    fireEvent.click(screen.getByRole('button', { name: 'Descartar "Péndulo hebreo"' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/practices/dismiss', expect.objectContaining({ method: 'POST', body: JSON.stringify({ entry: 'Péndulo hebreo' }) }))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
  })

  it('adds the entry, lowercased, as an alias of the picked practice', async () => {
    render(<SuggestedPractices suggestions={SUGGESTIONS} practices={PRACTICES} />)
    fireEvent.click(screen.getByRole('button', { name: 'Agregar como alias' }))
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(mockFetch).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Práctica para el alias "Péndulo hebreo"'), { target: { value: 'reiki' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/practices/reiki', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ append_alias: 'péndulo hebreo' }) }))
    )
  })
})
