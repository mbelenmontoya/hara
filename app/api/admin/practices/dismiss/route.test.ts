// Unit tests for POST /api/admin/practices/dismiss

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { rpc: mockRpc },
}))
vi.mock('@/lib/admin-auth', () => ({ getAdminUserId: vi.fn() }))
vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

function makeReq(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/practices/dismiss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
}

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/admin/practices/dismiss', () => {
  it('returns 503 when not admin', async () => {
    const { getAdminUserId } = await import('@/lib/admin-auth')
    vi.mocked(getAdminUserId).mockReturnValue({ error: 'unauthorized', status: 503 })

    const { POST } = await import('./route')
    expect((await POST(makeReq({ entry: 'pnl' }))).status).toBe(503)
  })

  it('returns 400 when entry is missing', async () => {
    const { getAdminUserId } = await import('@/lib/admin-auth')
    vi.mocked(getAdminUserId).mockReturnValue('admin-id')

    const { POST } = await import('./route')
    expect((await POST(makeReq({}))).status).toBe(400)
  })

  it('returns 400 when entry is blank', async () => {
    const { getAdminUserId } = await import('@/lib/admin-auth')
    vi.mocked(getAdminUserId).mockReturnValue('admin-id')

    const { POST } = await import('./route')
    expect((await POST(makeReq({ entry: '   ' }))).status).toBe(400)
  })

  it('calls RPC with trimmed entry and returns 200', async () => {
    const { getAdminUserId } = await import('@/lib/admin-auth')
    vi.mocked(getAdminUserId).mockReturnValue('admin-id')
    mockRpc.mockResolvedValue({ error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq({ entry: '  PNL  ' }))

    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('dismiss_specialty_suggestion', { p_entry: 'PNL' })
  })

  it('returns 500 and logs on RPC error', async () => {
    const { getAdminUserId } = await import('@/lib/admin-auth')
    vi.mocked(getAdminUserId).mockReturnValue('admin-id')
    mockRpc.mockResolvedValue({ error: { message: 'function not found' } })

    const { POST } = await import('./route')
    const { logError } = await import('@/lib/monitoring')

    const res = await POST(makeReq({ entry: 'pnl' }))
    expect(res.status).toBe(500)
    expect(logError).toHaveBeenCalledTimes(1)
  })
})
