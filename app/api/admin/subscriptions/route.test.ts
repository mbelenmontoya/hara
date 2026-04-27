// Unit tests for POST /api/admin/subscriptions
// Tests validation logic and response shapes without a real DB.
// The RPC call to upgrade_destacado_tier is mocked.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from './route'

// Mock supabaseAdmin — prevent real DB calls
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}))

vi.mock('@/lib/monitoring', () => ({
  logError: vi.fn(),
}))

import { supabaseAdmin } from '@/lib/supabase-admin'
const mockRpc = supabaseAdmin.rpc as ReturnType<typeof vi.fn>

const VALID_PAYLOAD = {
  professional_id: '00000000-0000-0000-0000-000000000001',
  amount: 5000,
  currency: 'ARS',
  paid_at: '2026-04-24T12:00:00Z',
  period_start: '2026-04-24',
  period_end: '2026-05-24',
  payment_method: 'mp_link',
  invoice_number: 'A-0001-00000001',
  notes: null,
}

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/admin/subscriptions — validation', () => {
  it('returns 400 when professional_id is not a valid UUID', async () => {
    const res = await POST(makePost({ ...VALID_PAYLOAD, professional_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('professional_id')
  })

  it('returns 400 when amount is zero', async () => {
    const res = await POST(makePost({ ...VALID_PAYLOAD, amount: 0 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('amount')
  })

  it('returns 400 when amount is negative', async () => {
    const res = await POST(makePost({ ...VALID_PAYLOAD, amount: -100 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('amount')
  })

  it('returns 400 when currency is invalid', async () => {
    const res = await POST(makePost({ ...VALID_PAYLOAD, currency: 'EUR' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('currency')
  })

  it('returns 400 when period_end is before period_start', async () => {
    const res = await POST(makePost({ ...VALID_PAYLOAD, period_start: '2026-05-24', period_end: '2026-04-24' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('period_end')
  })

  it('returns 400 when period_end equals period_start', async () => {
    const res = await POST(makePost({ ...VALID_PAYLOAD, period_start: '2026-04-24', period_end: '2026-04-24' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('period_end')
  })

  it('returns 400 when payment_method is invalid', async () => {
    const res = await POST(makePost({ ...VALID_PAYLOAD, payment_method: 'venmo' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('payment_method')
  })

  it('returns 400 for malformed JSON body', async () => {
    const req = new NextRequest('http://localhost/api/admin/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json {{{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/admin/subscriptions — success path', () => {
  it('calls upgrade_destacado_tier RPC with correct arguments and returns 201', async () => {
    mockRpc.mockResolvedValue({
      data: { payment_id: 'pay-123', professional_id: VALID_PAYLOAD.professional_id, tier_expires_at: '2026-05-24T00:00:00Z' },
      error: null,
    })

    const res = await POST(makePost(VALID_PAYLOAD))
    expect(res.status).toBe(201)
    expect(mockRpc).toHaveBeenCalledWith('upgrade_destacado_tier', expect.objectContaining({
      p_professional_id: VALID_PAYLOAD.professional_id,
      p_amount: 5000,
      p_currency: 'ARS',
      p_payment_method: 'mp_link',
      p_invoice_number: 'A-0001-00000001',
      p_period_start: '2026-04-24',
      p_period_end: '2026-05-24',
    }))
  })

  it('returns 500 when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Professional not found: ...' } })
    const res = await POST(makePost(VALID_PAYLOAD))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/admin/subscriptions — validation', () => {
  it('returns 400 when professional_id is missing', async () => {
    const req = new NextRequest('http://localhost/api/admin/subscriptions')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when professional_id is not a UUID', async () => {
    const req = new NextRequest('http://localhost/api/admin/subscriptions?professional_id=not-a-uuid')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with payments array when professional_id is valid UUID', async () => {
    const req = new NextRequest(`http://localhost/api/admin/subscriptions?professional_id=${VALID_PAYLOAD.professional_id}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('payments')
    expect(Array.isArray(body.payments)).toBe(true)
  })
})
