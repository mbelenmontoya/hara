// Unit tests for /api/waitlist

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

const insert = vi.fn()
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn(() => ({ insert })) },
}))

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
}))

vi.mock('@/lib/validation', () => ({
  extractClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  insert.mockReset()
})

describe('POST /api/waitlist — validation', () => {
  it('400 when email is missing', async () => {
    const res = await POST(makePost({ name: 'Ana' }))
    expect(res.status).toBe(400)
  })

  it('400 when email is malformed', async () => {
    const res = await POST(makePost({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('400 on invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/waitlist — happy path', () => {
  it('201 on first successful insert', async () => {
    insert.mockResolvedValue({ error: null })
    const res = await POST(makePost({ email: 'TEST@example.com', name: '  Ana  ' }))
    expect(res.status).toBe(201)
    expect(insert).toHaveBeenCalledWith({ email: 'test@example.com', name: 'Ana' })
  })

  it('treats empty name as null', async () => {
    insert.mockResolvedValue({ error: null })
    await POST(makePost({ email: 'a@b.com', name: '   ' }))
    expect(insert).toHaveBeenCalledWith({ email: 'a@b.com', name: null })
  })

  it('201 (idempotent) when email already on list (unique_violation 23505)', async () => {
    insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } })
    const res = await POST(makePost({ email: 'a@b.com' }))
    expect(res.status).toBe(201)
  })
})

describe('POST /api/waitlist — errors', () => {
  it('500 on unexpected DB error', async () => {
    insert.mockResolvedValue({ error: { code: '42P01', message: 'no table' } })
    const res = await POST(makePost({ email: 'a@b.com' }))
    expect(res.status).toBe(500)
  })
})
