// Unit tests for /api/events — direct contact path (no attribution token)
// Tests the new professional_slug branch added for directory-initiated contacts.
// The existing concierge path is covered by __tests__/integration/api-events.test.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/attribution-tokens', () => ({
  verifyAttributionToken: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
}))

vi.mock('@/lib/validation', () => ({
  extractClientIP:   vi.fn().mockReturnValue('127.0.0.1'),
  validateFingerprint: vi.fn().mockReturnValue(null),
  validateSessionId:  vi.fn().mockReturnValue('test-session'),
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAttributionToken } from '@/lib/attribution-tokens'

const mockFrom   = supabaseAdmin.from as ReturnType<typeof vi.fn>
const mockVerify = verifyAttributionToken as ReturnType<typeof vi.fn>

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue(null)  // default: no token
})

// ─── Missing both token and slug → 400 (was 403 before the refactor) ─────────

describe('body with neither attribution_token nor professional_slug', () => {
  it('returns 400 (spec-review should_fix: previously 403 — update if any test checked 403)', async () => {
    const res = await POST(makePost({ event_type: 'contact_click', timestamp: new Date().toISOString() }))
    expect(res.status).toBe(400)
  })
})

// ─── Direct contact path (professional_slug, no token) ───────────────────────

describe('direct contact: professional_slug provided, no attribution_token', () => {
  it('returns 404 when professional not found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockEqStatus = vi.fn(() => ({ single: mockSingle }))
    const mockEqSlug   = vi.fn(() => ({ eq: mockEqStatus }))
    const mockSelectPro = vi.fn(() => ({ eq: mockEqSlug }))
    mockFrom.mockReturnValue({ select: mockSelectPro })

    const res = await POST(makePost({
      professional_slug: 'nonexistent-slug',
      event_type: 'contact_click',
      timestamp: new Date().toISOString(),
    }))
    expect(res.status).toBe(404)
  })

  it('returns 200 and inserts event with synthetic tracking_code starting with "direct-"', async () => {
    // Mock professional lookup
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'pro-uuid-123', status: 'active', slug: 'therapist-ana' },
      error: null,
    })
    const mockEqStatus = vi.fn(() => ({ single: mockSingle }))
    const mockEqSlug = vi.fn(() => ({ eq: mockEqStatus }))
    const mockSelectPro = vi.fn(() => ({ eq: mockEqSlug }))

    // Mock event insert
    const mockInsertResult = vi.fn().mockResolvedValue({ data: { id: 'evt-uuid-456' }, error: null })
    const mockSelect2 = vi.fn(() => ({ single: mockInsertResult }))
    const mockInsert = vi.fn(() => ({ select: mockSelect2 }))

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return { select: mockSelectPro }
      return { insert: mockInsert }
    })

    const res = await POST(makePost({
      professional_slug: 'therapist-ana',
      event_type: 'contact_click',
      timestamp: new Date().toISOString(),
    }))
    expect(res.status).toBe(200)

    // Verify the insert was called with a synthetic tracking_code
    const insertCall = (mockInsert.mock.calls[0] as unknown[])[0] as Record<string, unknown>
    expect(typeof insertCall?.tracking_code).toBe('string')
    expect((insertCall?.tracking_code as string).startsWith('direct-')).toBe(true)
    expect(insertCall?.attribution_token).toBeNull()
    expect(insertCall?.professional_id).toBe('pro-uuid-123')
  })

  it('includes reviewer_email in event_data when provided and valid', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'pro-uuid-123', status: 'active', slug: 'therapist-ana' },
      error: null,
    })
    const mockEqStatus = vi.fn(() => ({ single: mockSingle }))
    const mockEqSlug = vi.fn(() => ({ eq: mockEqStatus }))
    const mockSelectPro = vi.fn(() => ({ eq: mockEqSlug }))

    const mockInsertResult = vi.fn().mockResolvedValue({ data: { id: 'evt-uuid-456' }, error: null })
    const mockSelect2 = vi.fn(() => ({ single: mockInsertResult }))
    const mockInsert = vi.fn(() => ({ select: mockSelect2 }))

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return { select: mockSelectPro }
      return { insert: mockInsert }
    })

    await POST(makePost({
      professional_slug: 'therapist-ana',
      event_type: 'contact_click',
      timestamp: new Date().toISOString(),
      reviewer_email: 'user@example.com',
    }))

    const insertCall = (mockInsert.mock.calls[0] as unknown[])[0] as Record<string, unknown>
    const eventData = insertCall?.event_data as Record<string, unknown>
    expect(eventData?.email).toBe('user@example.com')
  })

  it('strips invalid reviewer_email format (keeps event, no email)', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'pro-uuid-123', status: 'active', slug: 'therapist-ana' },
      error: null,
    })
    const mockEqStatus = vi.fn(() => ({ single: mockSingle }))
    const mockEqSlug = vi.fn(() => ({ eq: mockEqStatus }))
    const mockSelectPro = vi.fn(() => ({ eq: mockEqSlug }))

    const mockInsertResult = vi.fn().mockResolvedValue({ data: { id: 'evt-uuid-456' }, error: null })
    const mockSelect2 = vi.fn(() => ({ single: mockInsertResult }))
    const mockInsert = vi.fn(() => ({ select: mockSelect2 }))

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return { select: mockSelectPro }
      return { insert: mockInsert }
    })

    const res = await POST(makePost({
      professional_slug: 'therapist-ana',
      event_type: 'contact_click',
      timestamp: new Date().toISOString(),
      reviewer_email: 'not-an-email',
    }))
    expect(res.status).toBe(200)
    const insertCall = (mockInsert.mock.calls[0] as unknown[])[0] as Record<string, unknown>
    const eventData = insertCall?.event_data as Record<string, unknown>
    expect(eventData?.email).toBeNull()
  })
})
