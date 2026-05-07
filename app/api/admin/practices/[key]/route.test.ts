// Unit tests for PATCH /api/admin/practices/[key].

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSlugCheckMaybeSingle = vi.fn()
const mockUpdateSingle = vi.fn()

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      // Slug pre-check: select('key').eq('slug', x).neq('key', y).maybeSingle()
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          neq: vi.fn(() => ({ maybeSingle: mockSlugCheckMaybeSingle })),
        })),
      })),
      // Update: update(...).eq('key', urlKey).select('key').single()
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ single: mockUpdateSingle })),
        })),
      })),
    })),
  },
}))

vi.mock('@/lib/admin-auth', () => ({ getAdminUserId: vi.fn() }))
vi.mock('@/lib/practices', () => ({ bustPracticesCache: vi.fn() }))
vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

function makeReq(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/practices/reiki', {
    method: 'PATCH',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

const PARAMS = { params: { key: 'reiki' } }

beforeEach(async () => {
  vi.clearAllMocks()
  const { getAdminUserId } = await import('@/lib/admin-auth')
  vi.mocked(getAdminUserId).mockReturnValue('admin-user-id')
})

describe('PATCH /api/admin/practices/[key]', () => {
  it('returns 503 when admin auth fails', async () => {
    const { getAdminUserId } = await import('@/lib/admin-auth')
    vi.mocked(getAdminUserId).mockReturnValue({ error: 'unauthorized', status: 503 })

    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ label: 'New' }), PARAMS)
    expect(res.status).toBe(503)
  })

  it('updates label and returns 200 + busts cache', async () => {
    mockUpdateSingle.mockResolvedValue({ data: { key: 'reiki' }, error: null })

    const { PATCH } = await import('./route')
    const { bustPracticesCache } = await import('@/lib/practices')
    const res = await PATCH(makeReq({ label: 'Reiki Updated' }), PARAMS)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(bustPracticesCache).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when body.key differs from params.key (immutable)', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ key: 'reiki-new', label: 'Reiki' }), PARAMS)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/inmutable/i)
    expect(mockUpdateSingle).not.toHaveBeenCalled()
  })

  it('allows body.key === params.key (idempotent no-op on key)', async () => {
    mockUpdateSingle.mockResolvedValue({ data: { key: 'reiki' }, error: null })

    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ key: 'reiki', label: 'Reiki Updated' }), PARAMS)

    expect(res.status).toBe(200)
  })

  it('returns 404 when the key does not exist', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: null,
      // PostgREST PGRST116: no rows
      error: { code: 'PGRST116', message: 'no rows' },
    })

    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ label: 'Valid Label' }), PARAMS)
    expect(res.status).toBe(404)
  })

  it('returns 400 when body has no updatable fields', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({}), PARAMS)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/cambios/i)
  })

  it('returns 400 when label is too short', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ label: 'A' }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('returns 400 when slug is not kebab-case', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ slug: 'Bad Slug!' }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('returns 400 when sort_order is negative', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ sort_order: -5 }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('returns 400 when slug collides with another practice', async () => {
    mockSlugCheckMaybeSingle.mockResolvedValue({ data: { key: 'other' }, error: null })

    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ slug: 'taken' }), PARAMS)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/slug/i)
  })

  it('updates active=false to deactivate', async () => {
    mockUpdateSingle.mockResolvedValue({ data: { key: 'reiki' }, error: null })

    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ active: false }), PARAMS)
    expect(res.status).toBe(200)
  })
})
