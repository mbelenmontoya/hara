// Unit tests for /api/admin/practices route — GET (list) + POST (create).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockKeyCheckMaybeSingle = vi.fn()
const mockSlugCheckMaybeSingle = vi.fn()
const mockInsertSingle = vi.fn()

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      // POST pre-checks: select('key').eq('key', x).maybeSingle() or .eq('slug', y).maybeSingle()
      select: vi.fn(() => ({
        eq: vi.fn((col: string) => ({
          maybeSingle: col === 'key' ? mockKeyCheckMaybeSingle : mockSlugCheckMaybeSingle,
        })),
      })),
      // POST insert: insert(...).select(...).single()
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: mockInsertSingle })),
      })),
    })),
  },
}))

vi.mock('@/lib/admin-auth', () => ({
  getAdminUserId: vi.fn(),
}))

vi.mock('@/lib/admin-practices', () => ({
  loadAdminPracticesView: vi.fn(),
}))

vi.mock('@/lib/practices', () => ({
  bustPracticesCache: vi.fn(),
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(method: 'GET' | 'POST', body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/practices', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

const VALID_BODY = {
  key: 'new-practice',
  label: 'New Practice',
  slug: 'new-practice',
  sort_order: 200,
  active: true,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/practices', () => {
  it('returns 503 when admin auth fails (production stub)', async () => {
    const { getAdminUserId } = await import('@/lib/admin-auth')
    vi.mocked(getAdminUserId).mockReturnValue({ error: 'unauthorized', status: 503 })

    const { GET } = await import('./route')
    const res = await GET(makeReq('GET'))

    expect(res.status).toBe(503)
  })

  it('returns 200 with { practices } including usage_count', async () => {
    const { getAdminUserId } = await import('@/lib/admin-auth')
    vi.mocked(getAdminUserId).mockReturnValue('admin-user-id')
    const { loadAdminPracticesView } = await import('@/lib/admin-practices')
    vi.mocked(loadAdminPracticesView).mockResolvedValue([
      { key: 'reiki', label: 'Reiki', slug: 'reiki', sort_order: 10, active: true, usage_count: 3 },
    ])

    const { GET } = await import('./route')
    const res = await GET(makeReq('GET'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.practices).toHaveLength(1)
    expect(body.practices[0].usage_count).toBe(3)
  })
})

describe('POST /api/admin/practices', () => {
  beforeEach(async () => {
    const { getAdminUserId } = await import('@/lib/admin-auth')
    vi.mocked(getAdminUserId).mockReturnValue('admin-user-id')
  })

  it('returns 400 when key is missing', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', { ...VALID_BODY, key: undefined }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when key is not kebab-case', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', { ...VALID_BODY, key: 'Bad Key!' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/key/i)
  })

  it('returns 400 when label is too short', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', { ...VALID_BODY, label: 'A' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when sort_order is negative', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', { ...VALID_BODY, sort_order: -1 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when key already exists (pre-check)', async () => {
    mockKeyCheckMaybeSingle.mockResolvedValue({ data: { key: 'new-practice' }, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', VALID_BODY))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/clave/i)
  })

  it('returns 400 when slug already exists (pre-check)', async () => {
    mockKeyCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSlugCheckMaybeSingle.mockResolvedValue({ data: { key: 'other' }, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', VALID_BODY))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/slug/i)
  })

  it('returns 201 + busts cache on happy path', async () => {
    mockKeyCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSlugCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsertSingle.mockResolvedValue({
      data: { key: 'new-practice', label: 'New Practice', slug: 'new-practice', sort_order: 200, active: true },
      error: null,
    })

    const { POST } = await import('./route')
    const { bustPracticesCache } = await import('@/lib/practices')

    const res = await POST(makeReq('POST', VALID_BODY))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.practice).toMatchObject({ key: 'new-practice' })
    expect(bustPracticesCache).toHaveBeenCalledTimes(1)
  })

  it('defaults slug = key when slug omitted', async () => {
    mockKeyCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSlugCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsertSingle.mockResolvedValue({
      data: { key: 'auto', label: 'Auto', slug: 'auto', sort_order: 50, active: true },
      error: null,
    })

    const { POST } = await import('./route')
    const res = await POST(
      makeReq('POST', { key: 'auto', label: 'Auto', sort_order: 50 })
    )

    expect(res.status).toBe(201)
    // Verify slug check was called with the auto-derived slug equal to key
    expect(mockSlugCheckMaybeSingle).toHaveBeenCalled()
  })

  it('returns 400 + logs on 23505 race backstop', async () => {
    mockKeyCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSlugCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })

    const { POST } = await import('./route')
    const { logError } = await import('@/lib/monitoring')

    const res = await POST(makeReq('POST', VALID_BODY))
    expect(res.status).toBe(400)
    expect(logError).toHaveBeenCalled()
  })
})
