// Unit tests for PracticesList client component.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { PracticesList } from './PracticesList'
import type { PracticeWithCount } from '@/lib/admin-practices'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockFetch = vi.fn()
beforeEach(() => {
  mockRefresh.mockReset()
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

const PRACTICES: PracticeWithCount[] = [
  { key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 10, active: true, usage_count: 5 },
  { key: 'old', label: 'Old Practice', slug: 'old', sort_order: 100, active: false, usage_count: 0 },
]

describe('PracticesList', () => {
  it('renders all practices with label, key, slug, and usage count', () => {
    render(<PracticesList practices={PRACTICES} />)
    expect(screen.getByText('Reiki')).toBeInTheDocument()
    expect(screen.getAllByText('reiki')).toHaveLength(2) // key and slug columns
    expect(screen.getByText('Old Practice')).toBeInTheDocument()
    expect(screen.getByText('5 profesionales')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
  })

  it('renders empty state when no practices', () => {
    render(<PracticesList practices={[]} />)
    expect(screen.getByText(/no hay prácticas/i)).toBeInTheDocument()
  })

  it('opens confirm modal when toggling an active practice with usage', async () => {
    render(<PracticesList practices={PRACTICES} />)
    const toggle = screen.getByRole('button', { name: /^desactivar$/i })
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveTextContent('5 profesionales la usan')
    })
  })

  it('cancels deactivation when modal Cancel is clicked', async () => {
    render(<PracticesList practices={PRACTICES} />)
    const toggle = screen.getByRole('button', { name: /^desactivar$/i })
    fireEvent.click(toggle)
    await waitFor(() => screen.getByRole('dialog'))

    const cancel = screen.getByRole('button', { name: /cancelar/i })
    fireEvent.click(cancel)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('PATCHes active=false when modal Confirm is clicked', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) })

    render(<PracticesList practices={PRACTICES} />)
    const toggle = screen.getByRole('button', { name: /^desactivar$/i })
    fireEvent.click(toggle)
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^desactivar$/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/practices/reiki',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ active: false }),
        })
      )
    })
  })

  it('immediately PATCHes active=true (no modal) when re-activating', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) })

    render(<PracticesList practices={PRACTICES} />)
    const reactivate = screen.getByRole('button', { name: /^activar$/i })
    fireEvent.click(reactivate)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/practices/old',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ active: true }),
        })
      )
    })
    // No confirmation dialog when re-activating
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
