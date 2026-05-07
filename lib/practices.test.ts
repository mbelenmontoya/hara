// Unit tests for lib/practices.ts
// Tests cache behavior with mocked Supabase and mocked Date.now().
// Integration tests (real DB) live at __tests__/integration/practices-helpers.test.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock supabase-admin before any module import ─────────────────────────────
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
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

// Builds a chainable thenable that supports `.order(...).order(...)` and
// awaits to `{ data, error }`. Mirrors how Supabase's PostgrestFilterBuilder
// chains: each .order() returns the same builder, awaiting it resolves.
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
  // For loadCache: from → select → eq(active) → order().order() → resolves
  mockEq.mockReturnValueOnce(chain)
  // For getAllPractices: from → select → order().order() → resolves (no eq)
  // mockSelect responds to either .eq or .order on the returned object
  mockSelect.mockReturnValueOnce({ eq: mockEq, order: chain.order })
  mockFrom.mockReturnValueOnce({ select: mockSelect })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('lib/practices cache behavior', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockOrder.mockReset()
  })

  it('should call Supabase exactly once for two consecutive getActivePractices() calls', async () => {
    setupSupabaseMock()
    const { getActivePractices } = await import('@/lib/practices')

    await getActivePractices()
    await getActivePractices() // second call — should use cache

    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('should call Supabase again after TTL expires', async () => {
    let fakeNow = 0
    vi.spyOn(Date, 'now').mockImplementation(() => fakeNow)

    // First call at t=0
    setupSupabaseMock()
    setupSupabaseMock() // prep second Supabase response for after TTL
    const { getActivePractices } = await import('@/lib/practices')
    await getActivePractices()
    expect(mockFrom).toHaveBeenCalledTimes(1)

    // Advance past 60s TTL
    fakeNow = 61_000

    await getActivePractices() // should re-fetch
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('should call Supabase exactly once for two consecutive validatePracticeKeys() calls', async () => {
    setupSupabaseMock()
    const { validatePracticeKeys } = await import('@/lib/practices')

    await validatePracticeKeys(['reiki'])
    await validatePracticeKeys(['astrologia']) // second call — cache hit

    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('should share cache between getActivePractices() and validatePracticeKeys()', async () => {
    setupSupabaseMock()
    const { getActivePractices, validatePracticeKeys } = await import('@/lib/practices')

    await getActivePractices()
    await validatePracticeKeys(['reiki']) // should use the same cache load

    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('should throw when Supabase returns an error', async () => {
    setupSupabaseMock(null, { message: 'DB error' })

    const { getActivePractices } = await import('@/lib/practices')
    await expect(getActivePractices()).rejects.toThrow('Failed to load practices catalog')
  })
})

describe('validatePracticeKeys — logic', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockOrder.mockReset()
  })

  it('should return ok:true for empty array without calling Supabase', async () => {
    setupSupabaseMock()
    const { validatePracticeKeys } = await import('@/lib/practices')
    const result = await validatePracticeKeys([])
    // Empty array short-circuits before fetching
    expect(result.ok).toBe(true)
    expect(mockFrom).toHaveBeenCalledTimes(0)
  })

  it('should return ok:true when all keys are valid', async () => {
    setupSupabaseMock()
    const { validatePracticeKeys } = await import('@/lib/practices')
    const result = await validatePracticeKeys(['reiki', 'astrologia'])
    expect(result.ok).toBe(true)
  })

  it('should return ok:false with first invalid key', async () => {
    setupSupabaseMock()
    const { validatePracticeKeys } = await import('@/lib/practices')
    const result = await validatePracticeKeys(['bad-key', 'reiki'])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.invalidKey).toBe('bad-key')
    }
  })
})

describe('bustPracticesCache', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockOrder.mockReset()
  })

  it('forces the next getActivePractices() call to re-fetch from Supabase', async () => {
    setupSupabaseMock()
    setupSupabaseMock() // second fetch
    const { getActivePractices, bustPracticesCache } = await import('@/lib/practices')

    await getActivePractices()
    expect(mockFrom).toHaveBeenCalledTimes(1)

    bustPracticesCache()
    await getActivePractices()
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('also clears the getAllPractices cache (both caches busted on every write)', async () => {
    setupSupabaseMock(MOCK_PRACTICES_INCL_INACTIVE)
    setupSupabaseMock(MOCK_PRACTICES_INCL_INACTIVE) // post-bust refetch
    const { getAllPractices, bustPracticesCache } = await import('@/lib/practices')

    await getAllPractices()
    expect(mockFrom).toHaveBeenCalledTimes(1)

    // Without bust, the cache hit means no second fetch.
    await getAllPractices()
    expect(mockFrom).toHaveBeenCalledTimes(1)

    bustPracticesCache()
    await getAllPractices()
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })
})

describe('getAllPractices', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockOrder.mockReset()
  })

  it('returns active + inactive rows', async () => {
    setupSupabaseMock(MOCK_PRACTICES_INCL_INACTIVE)
    const { getAllPractices } = await import('@/lib/practices')

    const result = await getAllPractices()

    expect(result).toHaveLength(3)
    expect(result.find(p => p.key === 'old-practice')?.active).toBe(false)
  })

  it('does NOT populate the active-only cache', async () => {
    setupSupabaseMock(MOCK_PRACTICES_INCL_INACTIVE) // for getAllPractices
    setupSupabaseMock() // for the subsequent getActivePractices
    const { getAllPractices, getActivePractices } = await import('@/lib/practices')

    await getAllPractices()
    await getActivePractices()

    // Both calls should hit Supabase — getAllPractices must not seed the active cache
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('does NOT read from the active-only cache', async () => {
    setupSupabaseMock() // for getActivePractices (warms cache)
    setupSupabaseMock(MOCK_PRACTICES_INCL_INACTIVE) // for getAllPractices
    const { getActivePractices, getAllPractices } = await import('@/lib/practices')

    await getActivePractices() // populates cache with active-only rows
    expect(mockFrom).toHaveBeenCalledTimes(1)

    const result = await getAllPractices()
    expect(mockFrom).toHaveBeenCalledTimes(2) // separate query
    expect(result).toHaveLength(3) // includes inactive
  })

  it('queries with sort_order ASC then key ASC tiebreaker', async () => {
    // Test asserts the query calls .order twice in sequence: sort_order, then key.
    const orderCalls: Array<[string, unknown]> = []
    const trackingChain: any = {
      order: (col: string, opts: unknown) => {
        orderCalls.push([col, opts])
        return trackingChain
      },
      then: (onFulfilled: any, onRejected: any) =>
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
