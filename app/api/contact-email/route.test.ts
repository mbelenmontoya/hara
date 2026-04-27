// Unit tests for /api/contact-email — validation paths

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })),
  },
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/contact-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/contact-email', () => {
  it('returns 400 for invalid email', async () => {
    const res = await POST(makePost({ professional_slug: 'ana', email: 'not-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is missing', async () => {
    const res = await POST(makePost({ professional_slug: 'ana' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with { stored: true } for valid email', async () => {
    const res = await POST(makePost({ professional_slug: 'ana', email: 'u@ex.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stored).toBe(true)
  })

  it('returns 200 even when session_id is absent (skips DB write)', async () => {
    const res = await POST(makePost({ professional_slug: 'ana', email: 'u@ex.com' }))
    expect(res.status).toBe(200)
  })
})
