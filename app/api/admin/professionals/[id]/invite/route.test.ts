// Tests for POST /api/admin/professionals/[id]/invite
// Key invariants:
// - 404 when professional not found
// - 502 when generateProAccessLink returns null (link generation failed)
// - 200 with kind when invite succeeds + email is re-sent
// - Reuses approval email template (notifyProfessionalApproved)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const fetchSingle = vi.fn()

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: fetchSingle,
    })),
  },
}))

const mockGenerateProAccessLink = vi.fn()
vi.mock('@/lib/pro-invite', () => ({
  generateProAccessLink: mockGenerateProAccessLink,
}))

const mockNotifyProfessionalApproved = vi.fn()
vi.mock('@/lib/email', () => ({
  notifyProfessionalApproved: mockNotifyProfessionalApproved,
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const ID = '33333333-4444-5555-6666-777777777777'
const SETUP_URL = 'https://haravital.app/pro/set-password?token_hash=t&type=invite'

const ACTIVE_PRO = {
  id: ID,
  email: 'pro@example.com',
  full_name: 'Laura Giraudo',
  slug: 'laura-giraudo',
}

function makeReq(): NextRequest {
  return new NextRequest(`http://localhost/api/admin/professionals/${ID}/invite`, { method: 'POST' })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockNotifyProfessionalApproved.mockResolvedValue(true)
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/professionals/[id]/invite', () => {
  it('returns 404 when professional does not exist', async () => {
    fetchSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } })

    const { POST } = await import('./route')
    const res = await POST(makeReq(), { params: { id: ID } })

    expect(res.status).toBe(404)
  })

  it('returns 502 when generateProAccessLink returns null', async () => {
    fetchSingle.mockResolvedValue({ data: ACTIVE_PRO, error: null })
    mockGenerateProAccessLink.mockResolvedValue(null)

    const { POST } = await import('./route')
    const res = await POST(makeReq(), { params: { id: ID } })

    expect(res.status).toBe(502)
    // email must NOT be sent when link generation fails
    expect(mockNotifyProfessionalApproved).not.toHaveBeenCalled()
  })

  it('returns 200 and re-sends approval email with setupUrl on success', async () => {
    fetchSingle.mockResolvedValue({ data: ACTIVE_PRO, error: null })
    mockGenerateProAccessLink.mockResolvedValue({ setupUrl: SETUP_URL, kind: 'invite' })

    const { POST } = await import('./route')
    const res = await POST(makeReq(), { params: { id: ID } })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kind).toBe('invite')

    expect(mockNotifyProfessionalApproved).toHaveBeenCalledWith({
      to: 'pro@example.com',
      full_name: 'Laura Giraudo',
      slug: 'laura-giraudo',
      setupUrl: SETUP_URL,
    })
  })

  it('passes the correct email and professionalId to generateProAccessLink', async () => {
    fetchSingle.mockResolvedValue({ data: ACTIVE_PRO, error: null })
    mockGenerateProAccessLink.mockResolvedValue({ setupUrl: SETUP_URL, kind: 'recovery' })

    const { POST } = await import('./route')
    await POST(makeReq(), { params: { id: ID } })

    expect(mockGenerateProAccessLink).toHaveBeenCalledWith({
      email: 'pro@example.com',
      professionalId: ID,
    })
  })
})
