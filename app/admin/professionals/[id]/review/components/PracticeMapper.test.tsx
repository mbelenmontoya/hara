import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PracticeMapper } from './PracticeMapper'

const CATALOG = [
  { key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 1, active: true },
  { key: 'biodecodificacion', label: 'Biodecodificación', slug: 'biodecodificacion', sort_order: 2, active: true },
  { key: 'sonoterapia', label: 'Sonoterapia', slug: 'sonoterapia', sort_order: 3, active: true },
]

describe('PracticeMapper', () => {
  it('renders one row per free-text entry', () => {
    render(
      <PracticeMapper
        freeTextEntries={['reiki', 'terapia de pendulo']}
        catalogPractices={CATALOG}
        initialPractices={[]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('reiki')).toBeDefined()
    expect(screen.getByText('terapia de pendulo')).toBeDefined()
  })

  it('auto-matches exact key hit and shows confirmation label', () => {
    render(
      <PracticeMapper
        freeTextEntries={['reiki']}
        catalogPractices={CATALOG}
        initialPractices={[]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('✓ Reiki')).toBeDefined()
  })

  it('leaves non-matching entries unmapped (no confirmation label)', () => {
    render(
      <PracticeMapper
        freeTextEntries={['terapia de pendulo']}
        catalogPractices={CATALOG}
        initialPractices={[]}
        onChange={vi.fn()}
      />
    )
    expect(screen.queryByText(/✓/)).toBeNull()
  })

  it('calls onChange with deduplicated practice keys when user maps an entry', () => {
    const onChange = vi.fn()
    render(
      <PracticeMapper
        freeTextEntries={['pendulo hebreo']}
        catalogPractices={CATALOG}
        initialPractices={[]}
        onChange={onChange}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'sonoterapia' } })
    expect(onChange).toHaveBeenCalledWith(['sonoterapia'])
  })

  it('excludes __skip__ entries from onChange output', () => {
    const onChange = vi.fn()
    render(
      <PracticeMapper
        freeTextEntries={['algo sin mapear']}
        catalogPractices={CATALOG}
        initialPractices={[]}
        onChange={onChange}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '__skip__' } })
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('deduplicates when two entries map to the same practice', () => {
    const onChange = vi.fn()
    render(
      <PracticeMapper
        freeTextEntries={['reiki', 'reiki usui']}
        catalogPractices={CATALOG}
        initialPractices={[]}
        onChange={onChange}
      />
    )
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: 'reiki' } })
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[]
    expect(lastCall.filter(k => k === 'reiki').length).toBe(1)
  })

  it('shows empty-state message when no free-text entries', () => {
    render(
      <PracticeMapper
        freeTextEntries={[]}
        catalogPractices={CATALOG}
        initialPractices={[]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText(/no ingresó prácticas libres/i)).toBeDefined()
  })
})
