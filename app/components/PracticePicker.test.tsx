// PracticePicker component tests
// Vitest + React Testing Library (jsdom)

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PracticePicker } from './PracticePicker'
import type { Practice } from '@/lib/practices'

const MOCK_PRACTICES: Practice[] = [
  { key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 10, active: true },
  { key: 'astrologia', label: 'Astrología', slug: 'astrologia', sort_order: 110, active: true },
  { key: 'meditacion-mindfulness', label: 'Meditación y mindfulness', slug: 'meditacion-mindfulness', sort_order: 70, active: true },
]

describe('PracticePicker', () => {
  describe('rendering', () => {
    it('should render a chip for each practice', () => {
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={[]}
          onChange={vi.fn()}
          label="Práctica"
        />
      )
      expect(screen.getByText('Reiki')).toBeInTheDocument()
      expect(screen.getByText('Astrología')).toBeInTheDocument()
      expect(screen.getByText('Meditación y mindfulness')).toBeInTheDocument()
    })

    it('should render the label', () => {
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={[]}
          onChange={vi.fn()}
          label="Práctica preferida"
        />
      )
      expect(screen.getByText('Práctica preferida')).toBeInTheDocument()
    })

    it('should render optional helperText when provided', () => {
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={[]}
          onChange={vi.fn()}
          label="Práctica"
          helperText="Podés elegir varias."
        />
      )
      expect(screen.getByText('Podés elegir varias.')).toBeInTheDocument()
    })

    it('should NOT render No tengo preferencia pill by default', () => {
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={[]}
          onChange={vi.fn()}
          label="Práctica"
        />
      )
      expect(screen.queryByText('No tengo preferencia')).not.toBeInTheDocument()
    })

    it('should render No tengo preferencia pill when includeNoPreference is true', () => {
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={[]}
          onChange={vi.fn()}
          label="Práctica preferida"
          includeNoPreference
        />
      )
      expect(screen.getByText('No tengo preferencia')).toBeInTheDocument()
    })
  })

  describe('chip selection state', () => {
    it('selected chips should have bg-brand class', () => {
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={['reiki']}
          onChange={vi.fn()}
          label="Práctica"
        />
      )
      const reikiButton = screen.getByRole('button', { name: 'Reiki' })
      expect(reikiButton).toHaveClass('bg-brand')
    })

    it('unselected chips should have bg-surface-2 class', () => {
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={['reiki']}
          onChange={vi.fn()}
          label="Práctica"
        />
      )
      const astroButton = screen.getByRole('button', { name: 'Astrología' })
      expect(astroButton).toHaveClass('bg-surface-2')
    })

    it('should set aria-pressed on each chip', () => {
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={['reiki']}
          onChange={vi.fn()}
          label="Práctica"
        />
      )
      expect(screen.getByRole('button', { name: 'Reiki' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'Astrología' })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('selection toggling', () => {
    it('clicking an unselected chip calls onChange with the key added', () => {
      const onChange = vi.fn()
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={[]}
          onChange={onChange}
          label="Práctica"
        />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Reiki' }))
      expect(onChange).toHaveBeenCalledWith(['reiki'])
    })

    it('clicking a selected chip calls onChange with the key removed', () => {
      const onChange = vi.fn()
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={['reiki', 'astrologia']}
          onChange={onChange}
          label="Práctica"
        />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Reiki' }))
      expect(onChange).toHaveBeenCalledWith(['astrologia'])
    })
  })

  describe('No tengo preferencia mutual exclusion', () => {
    it('clicking No tengo preferencia clears selected and calls onChange([])', () => {
      const onChange = vi.fn()
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={['reiki', 'astrologia']}
          onChange={onChange}
          label="Práctica preferida"
          includeNoPreference
        />
      )
      fireEvent.click(screen.getByRole('button', { name: 'No tengo preferencia' }))
      expect(onChange).toHaveBeenCalledWith([])
    })

    it('No tengo preferencia pill is active-styled when selected is empty', () => {
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={[]}
          onChange={vi.fn()}
          label="Práctica preferida"
          includeNoPreference
        />
      )
      const pill = screen.getByRole('button', { name: 'No tengo preferencia' })
      expect(pill).toHaveClass('bg-brand')
    })

    it('clicking a practice chip when No tengo preferencia is active calls onChange with just that key', () => {
      const onChange = vi.fn()
      render(
        <PracticePicker
          practices={MOCK_PRACTICES}
          selected={[]}
          onChange={onChange}
          label="Práctica preferida"
          includeNoPreference
        />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Reiki' }))
      expect(onChange).toHaveBeenCalledWith(['reiki'])
    })
  })
})
