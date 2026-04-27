// Unit tests for PATCH /api/admin/reviews/[id]

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase-admin'
const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

function makePatch(body: unknown, id = 'rev-123'): NextRequest {
  return new NextRequest(`http://localhost/api/admin/reviews/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks() })

describe('PATCH /api/admin/reviews/[id]', () => {
  it('returns 400 when is_hidden is not boolean', async () => {
    const res = await PATCH(makePatch({ is_hidden: 'true' }), { params: { id: 'rev-123' } })
    expect(res.status).toBe(400)
  })

  it('returns 200 when is_hidden toggled successfully', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn(() => ({ eq: mockEq }))
    mockFrom.mockReturnValue({ update: mockUpdate })

    const res = await PATCH(makePatch({ is_hidden: true }), { params: { id: 'rev-123' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.is_hidden).toBe(true)
  })

  it('returns 500 on DB error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'DB err' } })
    const mockUpdate = vi.fn(() => ({ eq: mockEq }))
    mockFrom.mockReturnValue({ update: mockUpdate })

    const res = await PATCH(makePatch({ is_hidden: false }), { params: { id: 'rev-123' } })
    expect(res.status).toBe(500)
  })
})
