// Unit tests for POST /api/reviews/direct

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// Supabase mock — supports professionals lookup, review duplicate check, and insert
const profSingle = vi.fn()
const dupMaybeSingle = vi.fn()
const reviewInsert = vi.fn()

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'professionals') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: profSingle })) })) })) }
      }
      // reviews table: supports both select (duplicate check) and insert
      const eqChain = { eq: vi.fn().mockReturnThis(), maybeSingle: dupMaybeSingle }
      return {
        select: vi.fn(() => eqChain),
        insert: reviewInsert,
      }
    }),
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
}))

vi.mock('@/lib/validation', () => ({
  extractClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/reviews/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  professional_slug: 'silvia-ferrer',
  rating: 4,
  reviewer_name: 'Ana García',
  reviewer_email: 'ana@example.com',
  text: 'Excelente sesión',
}

beforeEach(() => {
  vi.clearAllMocks()
  profSingle.mockResolvedValue({ data: { id: 'pro-uuid-123' }, error: null })
  dupMaybeSingle.mockResolvedValue({ data: null }) // no duplicate by default
  reviewInsert.mockResolvedValue({ error: null })
})

describe('POST /api/reviews/direct — validation', () => {
  it('400 when reviewer_name is missing', async () => {
    const res = await POST(makePost({ ...validBody, reviewer_name: '' }))
    expect(res.status).toBe(400)
  })

  it('400 when rating is 0', async () => {
    const res = await POST(makePost({ ...validBody, rating: 0 }))
    expect(res.status).toBe(400)
  })

  it('400 when rating is 6', async () => {
    const res = await POST(makePost({ ...validBody, rating: 6 }))
    expect(res.status).toBe(400)
  })

  it('400 when professional_slug is missing', async () => {
    const res = await POST(makePost({ ...validBody, professional_slug: '' }))
    expect(res.status).toBe(400)
  })

  it('400 when reviewer_email is missing', async () => {
    const res = await POST(makePost({ ...validBody, reviewer_email: '' }))
    expect(res.status).toBe(400)
  })

  it('400 when reviewer_email is malformed', async () => {
    const res = await POST(makePost({ ...validBody, reviewer_email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/reviews/direct — happy path', () => {
  it('201 on valid submission', async () => {
    const res = await POST(makePost(validBody))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('inserts review with email, without contact_event_id', async () => {
    await POST(makePost(validBody))
    expect(reviewInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        professional_id: 'pro-uuid-123',
        rating: 4,
        reviewer_name: 'Ana García',
        reviewer_email: 'ana@example.com',
        is_hidden: false,
      })
    )
    const callArg = reviewInsert.mock.calls[0][0]
    expect(callArg).not.toHaveProperty('contact_event_id')
  })

  it('normalizes email to lowercase before storing', async () => {
    await POST(makePost({ ...validBody, reviewer_email: 'ANA@EXAMPLE.COM' }))
    const callArg = reviewInsert.mock.calls[0][0]
    expect(callArg.reviewer_email).toBe('ana@example.com')
  })
})

describe('POST /api/reviews/direct — duplicate prevention', () => {
  it('409 when same email already reviewed this professional', async () => {
    dupMaybeSingle.mockResolvedValue({ data: { id: 'existing-review' } })
    const res = await POST(makePost(validBody))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/ya dejaste/i)
  })
})

describe('POST /api/reviews/direct — errors', () => {
  it('404 when professional not found', async () => {
    profSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const res = await POST(makePost(validBody))
    expect(res.status).toBe(404)
  })

  it('429 when rate limited', async () => {
    const { ratelimit } = await import('@/lib/rate-limit')
    vi.mocked(ratelimit.limit).mockResolvedValue({ success: false } as ReturnType<typeof ratelimit.limit> extends Promise<infer T> ? T : never)
    const res = await POST(makePost(validBody))
    expect(res.status).toBe(429)
  })
})
