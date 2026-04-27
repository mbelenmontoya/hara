// Unit tests for /api/reviews/submit

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { rpc: vi.fn() },
}))

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
}))

vi.mock('@/lib/validation', () => ({
  extractClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase-admin'
const mockRpc = supabaseAdmin.rpc as ReturnType<typeof vi.fn>

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/reviews/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID = { token: 'abc123', rating: 5, text: 'Excelente!', reviewer_name: 'Ana' }

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/reviews/submit — validation', () => {
  it('returns 400 when token is missing', async () => {
    const res = await POST(makePost({ rating: 5 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when rating is below 1', async () => {
    const res = await POST(makePost({ ...VALID, rating: 0 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when rating is above 5', async () => {
    const res = await POST(makePost({ ...VALID, rating: 6 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when rating is not a number', async () => {
    const res = await POST(makePost({ ...VALID, rating: 'five' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/reviews/submit — RPC error mapping', () => {
  it('returns 400 with friendly message for invalid_token error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'invalid_token' } })
    const res = await POST(makePost(VALID))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('returns 400 with friendly message for review_already_exists error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'review_already_exists' } })
    const res = await POST(makePost(VALID))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })
})

describe('POST /api/reviews/submit — success', () => {
  it('returns 201 with review_id when RPC succeeds', async () => {
    mockRpc.mockResolvedValue({ data: { review_id: 'rev-123', professional_id: 'pro-456' }, error: null })
    const res = await POST(makePost(VALID))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.review_id).toBe('rev-123')
  })
})
