// Unit tests for lib/admin-practices.ts
// Tests usage-count merge logic with mocked Supabase.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockIn = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}))

const PRACTICES = [
  { key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 10, active: true },
  { key: 'meditacion', label: 'Meditación', slug: 'meditacion', sort_order: 20, active: true },
  { key: 'inactive-one', label: 'Old', slug: 'inactive-one', sort_order: 30, active: false },
]

function chainable(data: unknown, error: unknown = null) {
  const c: { order: (...args: unknown[]) => typeof c; then: PromiseLike<unknown>['then'] } = {
    order: () => c,
    then: (onFulfilled, onRejected) =>
      Promise.resolve({ data, error }).then(onFulfilled, onRejected),
  }
  return c
}

function setupMocks(opts: {
  practices: unknown[]
  professionalsByStatus: Array<{ status: string; rows: Array<{ practices: string[] }> }>
}) {
  // First from('practices') call → select(...).order().order() → returns practices.
  // Second from('professionals') call → select('practices').in('status', [...]) → returns the matching rows.
  const practicesChain = chainable(opts.practices)
  const professionalsChain = chainable(
    opts.professionalsByStatus.flatMap(s => s.rows)
  )

  mockFrom.mockImplementation((table: string) => {
    if (table === 'practices') {
      return { select: () => ({ order: () => practicesChain.order() }) }
    }
    if (table === 'professionals') {
      return {
        select: () => ({
          in: (col: string, values: string[]) => {
            // record the filter so tests can assert on it
            mockIn(col, values)
            return professionalsChain
          },
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('lib/admin-practices — loadAdminPracticesView', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockOrder.mockReset()
    mockIn.mockReset()
  })

  it('returns all practices (active + inactive) with usage_count merged', async () => {
    setupMocks({
      practices: PRACTICES,
      professionalsByStatus: [
        { status: 'active', rows: [{ practices: ['reiki', 'meditacion'] }, { practices: ['reiki'] }] },
        { status: 'submitted', rows: [{ practices: ['meditacion'] }] },
      ],
    })

    const { loadAdminPracticesView } = await import('@/lib/admin-practices')
    const result = await loadAdminPracticesView()

    expect(result).toHaveLength(3)
    expect(result.find(p => p.key === 'reiki')?.usage_count).toBe(2)
    expect(result.find(p => p.key === 'meditacion')?.usage_count).toBe(2)
    expect(result.find(p => p.key === 'inactive-one')?.usage_count).toBe(0)
  })

  it('filters professionals to status IN (active, submitted) only', async () => {
    setupMocks({
      practices: PRACTICES,
      professionalsByStatus: [{ status: 'active', rows: [] }],
    })

    const { loadAdminPracticesView } = await import('@/lib/admin-practices')
    await loadAdminPracticesView()

    expect(mockIn).toHaveBeenCalledWith('status', ['active', 'submitted'])
  })

  it('does NOT query the leads table — leads.practice_preference is excluded', async () => {
    setupMocks({
      practices: PRACTICES,
      professionalsByStatus: [{ status: 'active', rows: [] }],
    })

    const { loadAdminPracticesView } = await import('@/lib/admin-practices')
    await loadAdminPracticesView()

    const tablesQueried = mockFrom.mock.calls.map(c => c[0])
    expect(tablesQueried).not.toContain('leads')
  })

  it('returns 0 usage_count for practices with no professionals', async () => {
    setupMocks({
      practices: PRACTICES,
      professionalsByStatus: [{ status: 'active', rows: [] }],
    })

    const { loadAdminPracticesView } = await import('@/lib/admin-practices')
    const result = await loadAdminPracticesView()

    for (const p of result) {
      expect(p.usage_count).toBe(0)
    }
  })
})
