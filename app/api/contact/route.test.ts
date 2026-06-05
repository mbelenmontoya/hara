import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
}))

vi.mock('@/lib/validation', () => ({
  extractClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/email', () => ({
  notifyContactForm: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = { name: 'Ana García', email: 'ana@example.com', message: 'Tengo una pregunta.' }

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/contact — validation', () => {
  it('400 when name is missing', async () => {
    const res = await POST(makePost({ ...validBody, name: '' }))
    expect(res.status).toBe(400)
  })

  it('400 when email is malformed', async () => {
    const res = await POST(makePost({ ...validBody, email: 'not-email' }))
    expect(res.status).toBe(400)
  })

  it('400 when message is missing', async () => {
    const res = await POST(makePost({ ...validBody, message: '' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/contact — happy path', () => {
  it('201 and sends notification on valid input', async () => {
    const { notifyContactForm } = await import('@/lib/email')
    const res = await POST(makePost(validBody))
    expect(res.status).toBe(201)
    expect(vi.mocked(notifyContactForm)).toHaveBeenCalledWith('Ana García', 'ana@example.com', 'Tengo una pregunta.')
  })
})

describe('POST /api/contact — rate limiting', () => {
  it('429 when rate limited', async () => {
    const { ratelimit } = await import('@/lib/rate-limit')
    vi.mocked(ratelimit.limit).mockResolvedValueOnce({ success: false } as Awaited<ReturnType<typeof ratelimit.limit>>)
    const res = await POST(makePost(validBody))
    expect(res.status).toBe(429)
  })
})
