// Unit tests for lib/practices.ts
// Tests functional behavior: DB queries, validation logic, error handling.
// Caching was removed — supabaseAdmin uses cache: 'no-store' globally.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock supabase-admin before any module import ─────────────────────────────
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_PRACTICES = [
  { key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 10, active: true },
  { key: 'astrologia', label: 'Astrología', slug: 'astrologia', sort_order: 110, active: true },
]

const MOCK_PRACTICES_INCL_INACTIVE = [
  ...MOCK_PRACTICES,
  { key: 'old-practice', label: 'Old Practice', slug: 'old-practice', sort_order: 200, active: false },
]

function chainableResult(data: unknown, error: unknown = null) {
  const chain: { order: (...args: unknown[]) => typeof chain; then: PromiseLike<unknown>['then'] } = {
    order: (..._args: unknown[]) => chain,
    then: (onFulfilled, onRejected) =>
      Promise.resolve({ data, error }).then(onFulfilled, onRejected),
  }
  return chain
}

function setupSupabaseMock(returnData: unknown = MOCK_PRACTICES, error: unknown = null) {
  const chain = chainableResult(returnData, error)
  mockEq.mockReturnValueOnce(chain)
  mockSelect.mockReturnValueOnce({ eq: mockEq, order: chain.order })
  mockFrom.mockReturnValueOnce({ select: mockSelect })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getActivePractices', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
  })

  it('returns active practices from DB', async () => {
    setupSupabaseMock()
    const { getActivePractices } = await import('@/lib/practices')
    const result = await getActivePractices()
    expect(result).toHaveLength(2)
    expect(result[0].key).toBe('reiki')
  })

  it('throws when Supabase returns an error', async () => {
    setupSupabaseMock(null, { message: 'DB error' })
    const { getActivePractices } = await import('@/lib/practices')
    await expect(getActivePractices()).rejects.toThrow('Failed to load practices catalog')
  })

  it('hits the DB on every call — no caching', async () => {
    setupSupabaseMock()
    setupSupabaseMock()
    const { getActivePractices } = await import('@/lib/practices')
    await getActivePractices()
    await getActivePractices()
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })
})

describe('validatePracticeKeys — logic', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
  })

  it('returns ok:true for empty array without calling Supabase', async () => {
    setupSupabaseMock()
    const { validatePracticeKeys } = await import('@/lib/practices')
    const result = await validatePracticeKeys([])
    expect(result.ok).toBe(true)
    expect(mockFrom).toHaveBeenCalledTimes(0)
  })

  it('returns ok:true when all keys are valid', async () => {
    setupSupabaseMock()
    const { validatePracticeKeys } = await import('@/lib/practices')
    const result = await validatePracticeKeys(['reiki', 'astrologia'])
    expect(result.ok).toBe(true)
  })

  it('returns ok:false with first invalid key', async () => {
    setupSupabaseMock()
    const { validatePracticeKeys } = await import('@/lib/practices')
    const result = await validatePracticeKeys(['bad-key', 'reiki'])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.invalidKey).toBe('bad-key')
  })
})

describe('bustPracticesCache', () => {
  it('is a no-op and does not throw', async () => {
    const { bustPracticesCache } = await import('@/lib/practices')
    expect(() => bustPracticesCache()).not.toThrow()
  })
})

describe('getAllPractices', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
  })

  it('returns active + inactive rows', async () => {
    setupSupabaseMock(MOCK_PRACTICES_INCL_INACTIVE)
    const { getAllPractices } = await import('@/lib/practices')
    const result = await getAllPractices()
    expect(result).toHaveLength(3)
    expect(result.find(p => p.key === 'old-practice')?.active).toBe(false)
  })

  it('hits the DB on every call — no caching', async () => {
    setupSupabaseMock(MOCK_PRACTICES_INCL_INACTIVE)
    setupSupabaseMock(MOCK_PRACTICES_INCL_INACTIVE)
    const { getAllPractices } = await import('@/lib/practices')
    await getAllPractices()
    await getAllPractices()
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('queries with sort_order ASC then key ASC tiebreaker', async () => {
    const orderCalls: Array<[string, unknown]> = []
    const trackingChain: { order: (col: string, opts: unknown) => typeof trackingChain; then: PromiseLike<unknown>['then'] } = {
      order: (col, opts) => { orderCalls.push([col, opts]); return trackingChain },
      then: (onFulfilled, onRejected) =>
        Promise.resolve({ data: MOCK_PRACTICES_INCL_INACTIVE, error: null }).then(onFulfilled, onRejected),
    }
    mockSelect.mockReturnValueOnce({ eq: mockEq, order: trackingChain.order })
    mockFrom.mockReturnValueOnce({ select: mockSelect })

    const { getAllPractices } = await import('@/lib/practices')
    await getAllPractices()

    expect(orderCalls).toEqual([
      ['sort_order', { ascending: true }],
      ['key', { ascending: true }],
    ])
  })
})
