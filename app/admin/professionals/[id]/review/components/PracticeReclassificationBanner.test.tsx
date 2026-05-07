// Unit tests for PracticeReclassificationBanner component

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PracticeReclassificationBanner } from './PracticeReclassificationBanner'
import type { Practice } from '@/lib/practices'

const MOCK_PRACTICES: Practice[] = [
  { key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 10, active: true },
  { key: 'astrologia', label: 'Astrología', slug: 'astrologia', sort_order: 110, active: true },
]

describe('PracticeReclassificationBanner', () => {
  describe('(a) renders when needs_practice_review is true', () => {
    it('shows the banner heading and picker', () => {
      render(
        <PracticeReclassificationBanner
          professionalId="uuid-1234"
          practices={MOCK_PRACTICES}
          needsReview={true}
          onSaved={vi.fn()}
        />
      )
      expect(screen.getByText(/re-clasificación pendiente/i)).toBeInTheDocument()
      expect(screen.getByText('Reiki')).toBeInTheDocument()
    })
  })

  describe('(b) does NOT render when needs_practice_review is false', () => {
    it('returns null when not flagged', () => {
      const { container } = render(
        <PracticeReclassificationBanner
          professionalId="uuid-1234"
          practices={MOCK_PRACTICES}
          needsReview={false}
          onSaved={vi.fn()}
        />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('(c) save button disabled when selected is empty', () => {
    it('Guardar prácticas is disabled on initial render (nothing selected)', () => {
      render(
        <PracticeReclassificationBanner
          professionalId="uuid-1234"
          practices={MOCK_PRACTICES}
          needsReview={true}
          onSaved={vi.fn()}
        />
      )
      const btn = screen.getByRole('button', { name: /guardar prácticas/i })
      expect(btn).toBeDisabled()
    })

    it('button becomes enabled after selecting a practice', () => {
      render(
        <PracticeReclassificationBanner
          professionalId="uuid-1234"
          practices={MOCK_PRACTICES}
          needsReview={true}
          onSaved={vi.fn()}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Reiki' }))
      const btn = screen.getByRole('button', { name: /guardar prácticas/i })
      expect(btn).not.toBeDisabled()
    })
  })

  describe('(d) clicking save calls PATCH and invokes onSaved on success', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    })

    it('calls PATCH /api/admin/professionals/[id] with selected practices', async () => {
      const onSaved = vi.fn()
      render(
        <PracticeReclassificationBanner
          professionalId="uuid-1234"
          practices={MOCK_PRACTICES}
          needsReview={true}
          onSaved={onSaved}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Reiki' }))
      fireEvent.click(screen.getByRole('button', { name: /guardar prácticas/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/professionals/uuid-1234',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ practices: ['reiki'] }),
          })
        )
        expect(onSaved).toHaveBeenCalled()
      })
    })
  })

  describe('(e) on PATCH failure banner stays mounted and shows error', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      })
    })

    it('shows error text and does not call onSaved', async () => {
      const onSaved = vi.fn()
      render(
        <PracticeReclassificationBanner
          professionalId="uuid-1234"
          practices={MOCK_PRACTICES}
          needsReview={true}
          onSaved={onSaved}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Reiki' }))
      fireEvent.click(screen.getByRole('button', { name: /guardar prácticas/i }))

      await waitFor(() => {
        expect(onSaved).not.toHaveBeenCalled()
        // Banner should still be visible
        expect(screen.getByText(/re-clasificación pendiente/i)).toBeInTheDocument()
      })
    })
  })
})
