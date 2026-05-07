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

function setupSupabaseMock(returnData = MOCK_PRACTICES, error: unknown = null) {
  mockOrder.mockResolvedValueOnce({ data: returnData, error })
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('lib/practices cache behavior', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.restoreAllMocks()
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
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { getActivePractices } = await import('@/lib/practices')
    await expect(getActivePractices()).rejects.toThrow('Failed to load practices catalog')
  })
})

describe('validatePracticeKeys — logic', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
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
