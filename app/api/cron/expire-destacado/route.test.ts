// Unit tests for /api/cron/expire-destacado
// Tests: CRON_SECRET auth, idempotent cleanup response, error handling.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase-admin'

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

const SECRET = 'test-cron-secret-12345'

function makeGet(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers['Authorization'] = authHeader
  return new NextRequest('http://localhost/api/cron/expire-destacado', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', SECRET)
})

describe('GET /api/cron/expire-destacado — auth', () => {
  it('returns 500 when CRON_SECRET env var is unset (server misconfigured)', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = await GET(makeGet(`Bearer anything`))
    expect(res.status).toBe(500)
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeGet())
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is wrong', async () => {
    const res = await GET(makeGet('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 401 when header format is not Bearer', async () => {
    const res = await GET(makeGet(`Basic ${SECRET}`))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/cron/expire-destacado — cleanup', () => {
  it('returns 200 with updated count when valid secret provided', async () => {
    const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: 'pro-1' }], error: null })
    const mockLt     = vi.fn(() => ({ select: mockSelect }))
    const mockEq     = vi.fn(() => ({ lt: mockLt }))
    const mockUpdate = vi.fn(() => ({ eq: mockEq }))
    mockFrom.mockReturnValue({ update: mockUpdate })

    const res = await GET(makeGet(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toBe(1)
    expect(Array.isArray(body.ids)).toBe(true)
  })

  it('returns 200 with updated=0 when no expired rows (idempotent)', async () => {
    const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockLt     = vi.fn(() => ({ select: mockSelect }))
    const mockEq     = vi.fn(() => ({ lt: mockLt }))
    const mockUpdate = vi.fn(() => ({ eq: mockEq }))
    mockFrom.mockReturnValue({ update: mockUpdate })

    const res = await GET(makeGet(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toBe(0)
  })

  it('returns 500 when DB operation fails', async () => {
    const mockSelect = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const mockLt     = vi.fn(() => ({ select: mockSelect }))
    const mockEq     = vi.fn(() => ({ lt: mockLt }))
    const mockUpdate = vi.fn(() => ({ eq: mockEq }))
    mockFrom.mockReturnValue({ update: mockUpdate })

    const res = await GET(makeGet(`Bearer ${SECRET}`))
    expect(res.status).toBe(500)
  })
})
