// Tests for the extended GET response and practices-only PATCH path
// in /api/admin/professionals/[id]/route.ts
// (DELETE tests live in route.test.ts)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetSingle = vi.fn()
const mockPatchUpdateSingle = vi.fn()

// supabase-admin: different flows need different shapes, so we use a flexible factory
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'professionals') {
        return {
          // GET path: select().eq().single()
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mockGetSingle }),
          }),
          // PATCH path: update().eq().select().single()
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ single: mockPatchUpdateSingle }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    }),
  },
}))

vi.mock('@/lib/practices', () => ({
  getActivePractices: vi.fn(),
  validatePracticeKeys: vi.fn(),
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const ID = 'aaaa1111-bbbb-cccc-dddd-eeeeeeeeeeee'

const MOCK_PROFESSIONAL = {
  id: ID,
  slug: 'test-pro',
  full_name: 'Test Pro',
  status: 'submitted',
  practices: [],
  needs_practice_review: true,
}

const MOCK_PRACTICES = [
  { key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 10, active: true },
]

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/admin/professionals/${ID}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/professionals/[id] — extended response', () => {
  it('(a) returns { professional, practices } on success', async () => {
    const { getActivePractices } = await import('@/lib/practices')
    vi.mocked(getActivePractices).mockResolvedValue(MOCK_PRACTICES)
    mockGetSingle.mockResolvedValue({ data: MOCK_PROFESSIONAL, error: null })

    const { GET } = await import('./route')
    const res = await GET(makeReq('GET'), { params: { id: ID } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('professional')
    expect(body).toHaveProperty('practices')
    expect(body.practices).toEqual(MOCK_PRACTICES)
  })

  it('(b) 400 when id is empty', async () => {
    const { GET } = await import('./route')
    const res = await GET(makeReq('GET'), { params: { id: '' } })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/admin/professionals/[id] — practices-only update', () => {
  it('(b) valid practices → 200, updates practices + clears needs_practice_review', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })
    mockGetSingle.mockResolvedValue({ data: MOCK_PROFESSIONAL, error: null })
    // PATCH now uses single-query: update().eq().select().single()
    mockPatchUpdateSingle.mockResolvedValue({ data: { id: ID }, error: null })

    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq('PATCH', { practices: ['reiki'] }), { params: { id: ID } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(validatePracticeKeys).toHaveBeenCalledWith(['reiki'])
    expect(mockPatchUpdateSingle).toHaveBeenCalled()
  })

  it('(c) invalid practice key → 400 with key in body, no DB update', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: false, invalidKey: 'fake-key' })
    mockGetSingle.mockResolvedValue({ data: MOCK_PROFESSIONAL, error: null })

    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq('PATCH', { practices: ['fake-key'] }), { params: { id: ID } })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('fake-key')
    expect(mockPatchUpdateSingle).not.toHaveBeenCalled()
  })

  it('(d) empty practices array → 400 (must select at least one)', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq('PATCH', { practices: [] }), { params: { id: ID } })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/práctica|seleccioná/i)
  })

  it('(e) existing approve/reject path unaffected — still works', async () => {
    // Verify that adding the practices-only path doesn't break approve
    mockGetSingle.mockResolvedValue({ data: { ...MOCK_PROFESSIONAL, status: 'submitted' }, error: null })
    mockPatchUpdateSingle.mockResolvedValue({ data: { id: ID }, error: null })

    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq('PATCH', { action: 'approve' }), { params: { id: ID } })
    expect(res.status).toBe(200)
  })
})
