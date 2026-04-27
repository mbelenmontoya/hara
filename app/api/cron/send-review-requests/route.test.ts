// Unit tests for /api/cron/send-review-requests

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { rpc: vi.fn(), from: vi.fn() },
}))

vi.mock('@/lib/email', () => ({
  notifyReviewRequest: vi.fn(),
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyReviewRequest } from '@/lib/email'

const mockRpc   = supabaseAdmin.rpc as ReturnType<typeof vi.fn>
const mockFrom  = supabaseAdmin.from as ReturnType<typeof vi.fn>
const mockEmail = notifyReviewRequest as ReturnType<typeof vi.fn>

const SECRET = 'test-review-cron-secret'

function makeGet(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader) headers['Authorization'] = authHeader
  return new NextRequest('http://localhost/api/cron/send-review-requests', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', SECRET)
})

// ─── Auth ──────────────────────────────────────────────────────────────────────

describe('GET /api/cron/send-review-requests — auth', () => {
  it('returns 500 when CRON_SECRET is unset (server misconfigured)', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = await GET(makeGet(`Bearer ${SECRET}`))
    expect(res.status).toBe(500)
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeGet())
    expect(res.status).toBe(401)
  })

  it('returns 401 when Bearer token is wrong', async () => {
    const res = await GET(makeGet('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })
})

// ─── Happy path ────────────────────────────────────────────────────────────────

describe('GET /api/cron/send-review-requests — processing', () => {
  it('calls notifyReviewRequest for each eligible event and returns sent count', async () => {
    const eligibleEvents = [
      { event_id: 'evt-1', professional_id: 'pro-1', email: 'a@test.com', professional_name: 'Ana', professional_slug: 'ana' },
      { event_id: 'evt-2', professional_id: 'pro-2', email: 'b@test.com', professional_name: 'Luis', professional_slug: 'luis' },
    ]

    mockRpc.mockResolvedValue({ data: eligibleEvents, error: null })
    mockEmail.mockResolvedValue(true)

    // Mock review_requests insert
    const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'req-1' }, error: null })
    const mockSelect = vi.fn(() => ({ single: mockInsert }))
    const mockInsertFn = vi.fn(() => ({ select: mockSelect }))
    mockFrom.mockReturnValue({ insert: mockInsertFn })

    const res = await GET(makeGet(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(2)
    expect(mockEmail).toHaveBeenCalledTimes(2)
  })

  it('returns sent=0 when no eligible events', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    const res = await GET(makeGet(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
  })

  it('inserts row first; skips sent count when email fails but row was inserted', async () => {
    // Insert-first logic: row is inserted before email is sent.
    // If email fails, the row exists (blocking double-send), but sent count stays 0.
    const eligibleEvents = [
      { event_id: 'evt-1', professional_id: 'pro-1', email: 'a@test.com', professional_name: 'Ana', professional_slug: 'ana' },
    ]

    mockRpc.mockResolvedValue({ data: eligibleEvents, error: null })
    mockEmail.mockResolvedValue(false)  // email failed after insert

    const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'req-1' }, error: null })
    const mockSelect = vi.fn(() => ({ single: mockInsert }))
    const mockInsertFn = vi.fn(() => ({ select: mockSelect }))
    mockFrom.mockReturnValue({ insert: mockInsertFn })

    const res = await GET(makeGet(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    // Insert WAS called (insert-first)
    expect(mockFrom).toHaveBeenCalled()
  })

  it('skips event (no insert) when DB insert itself fails', async () => {
    const eligibleEvents = [
      { event_id: 'evt-1', professional_id: 'pro-1', email: 'a@test.com', professional_name: 'Ana', professional_slug: 'ana' },
    ]

    mockRpc.mockResolvedValue({ data: eligibleEvents, error: null })

    // DB insert fails
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const mockSelect = vi.fn(() => ({ single: mockInsert }))
    const mockInsertFn = vi.fn(() => ({ select: mockSelect }))
    mockFrom.mockReturnValue({ insert: mockInsertFn })

    const res = await GET(makeGet(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    // Email was NOT sent (insert failed before email)
    expect(mockEmail).not.toHaveBeenCalled()
  })
})
