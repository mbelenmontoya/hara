// Tests for POST /api/pro/forgot-password
// Key invariants:
// - Always returns 200 (no user enumeration)
// - Only sends email for ACTIVE professionals
// - Rate limited per IP
// - submitted/rejected emails get 200 but no email

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRatelimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: mockRatelimit },
}))

const mockGenerateProAccessLink = vi.fn()
vi.mock('@/lib/pro-invite', () => ({
  generateProAccessLink: mockGenerateProAccessLink,
}))

const mockNotifyProPasswordReset = vi.fn()
vi.mock('@/lib/email', () => ({
  notifyProPasswordReset: mockNotifyProPasswordReset,
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

const maybeSingle = vi.fn()
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
    })),
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(email: string): NextRequest {
  return new NextRequest('http://localhost/api/pro/forgot-password', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '1.2.3.4',
    },
    body: JSON.stringify({ email }),
  })
}

const ACTIVE_PRO = { id: 'pro-uuid-123' }
const SETUP_URL = 'https://haravital.app/pro/set-password?token_hash=t&type=recovery'

beforeEach(() => {
  vi.clearAllMocks()
  mockRatelimit.mockResolvedValue({ success: true })
  mockGenerateProAccessLink.mockResolvedValue({ setupUrl: SETUP_URL, kind: 'recovery' })
  mockNotifyProPasswordReset.mockResolvedValue(true)
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/pro/forgot-password', () => {
  it('returns 200 for an active professional and sends recovery email', async () => {
    maybeSingle.mockResolvedValue({ data: ACTIVE_PRO, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq('active@example.com'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBeTruthy()

    expect(mockGenerateProAccessLink).toHaveBeenCalledWith({
      email: 'active@example.com',
      professionalId: ACTIVE_PRO.id,
    })
    expect(mockNotifyProPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'active@example.com', setupUrl: SETUP_URL })
    )
  })

  it('returns 200 but does NOT send email for unknown email (no enumeration)', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq('unknown@example.com'))

    expect(res.status).toBe(200)
    expect(mockNotifyProPasswordReset).not.toHaveBeenCalled()
    expect(mockGenerateProAccessLink).not.toHaveBeenCalled()
  })

  it('returns 200 but does NOT send email for submitted professional (not active)', async () => {
    // maybeSingle returns null because we filter by status='active'
    maybeSingle.mockResolvedValue({ data: null, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq('submitted@example.com'))

    expect(res.status).toBe(200)
    expect(mockNotifyProPasswordReset).not.toHaveBeenCalled()
  })

  it('returns 200 but does NOT send email when generateProAccessLink returns null', async () => {
    maybeSingle.mockResolvedValue({ data: ACTIVE_PRO, error: null })
    mockGenerateProAccessLink.mockResolvedValue(null)

    const { POST } = await import('./route')
    const res = await POST(makeReq('active@example.com'))

    expect(res.status).toBe(200)
    expect(mockNotifyProPasswordReset).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockRatelimit.mockResolvedValue({ success: false })

    const { POST } = await import('./route')
    const res = await POST(makeReq('any@example.com'))

    expect(res.status).toBe(429)
  })

  it('returns 400 when email is missing', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/pro/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })
})
