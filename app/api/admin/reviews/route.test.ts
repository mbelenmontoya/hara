// Unit tests for GET /api/admin/reviews

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase-admin'
const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

function makeGet(): NextRequest {
  return new NextRequest('http://localhost/api/admin/reviews')
}

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/admin/reviews', () => {
  it('returns 200 with reviews array', async () => {
    const fakeReviews = [
      { id: 'r1', professional_id: 'p1', rating: 5, text: 'Great', reviewer_name: 'Ana', submitted_at: new Date().toISOString(), is_hidden: false, professionals: { full_name: 'Dr García' } },
    ]
    const mockOrder = vi.fn().mockResolvedValue({ data: fakeReviews, error: null })
    const mockSelect = vi.fn(() => ({ order: mockOrder }))
    mockFrom.mockReturnValue({ select: mockSelect })

    const res = await GET(makeGet())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.reviews)).toBe(true)
    expect(body.reviews[0].id).toBe('r1')
    expect(body.reviews[0].professional_name).toBe('Dr García')
  })

  it('returns 500 on DB error', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB err' } })
    const mockSelect = vi.fn(() => ({ order: mockOrder }))
    mockFrom.mockReturnValue({ select: mockSelect })

    const res = await GET(makeGet())
    expect(res.status).toBe(500)
  })
})
