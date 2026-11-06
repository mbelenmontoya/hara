// Tests for POST /api/pro/profile
// Key invariants:
// - No session → 401
// - Authenticated non-pro (no professionals row for user_id) → 403
// - email field is always ignored even if submitted
// - Valid payload → 200 and row updated
// - WhatsApp validation, bio length, practice keys

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}))

const proMaybeSingle = vi.fn()
const proUpdateEq = vi.fn()
let lastUpdatePayload: Record<string, unknown> | null = null

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'professionals') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: proMaybeSingle,
          update: vi.fn((payload: Record<string, unknown>) => {
            lastUpdatePayload = payload
            return { eq: proUpdateEq }
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    }),
  },
}))

vi.mock('@/lib/storage', () => ({
  uploadProfileImage: vi.fn().mockResolvedValue({ url: 'https://storage.example.com/image.jpg' }),
}))

vi.mock('@/lib/practices', () => ({
  validatePracticeKeys: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_ID = 'auth-user-uuid-111'
const PRO_ID = 'pro-row-uuid-222'

const VALID_BODY: Record<string, unknown> = {
  full_name: 'Laura Giraudo',
  whatsapp: '+5491112345678',
  country: 'Argentina',
  city: 'Buenos Aires',
  bio: 'Facilitadora de constelaciones familiares y diseño humano con más de 10 años de experiencia acompañando procesos.',
  modality: ['presencial'],
  specialties: ['ansiedad'],
  practices: ['constelaciones-familiares'],
  service_type: ['sesion-individual'],
  online_only: false,
  accepting_new_clients: true,
}

function makeReq(overrides: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost/api/pro/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...VALID_BODY, ...overrides }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  lastUpdatePayload = null
  proUpdateEq.mockResolvedValue({ error: null })
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/pro/profile', () => {
  it.each(['submitted', 'rejected', 'inactive', null])('blocks a %s profile before parsing or uploading', async (status) => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    proMaybeSingle.mockResolvedValue({ data: { id: PRO_ID, status }, error: null })
    const { uploadProfileImage } = await import('@/lib/storage')
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/pro/profile', { method: 'POST', body: 'invalid JSON' })

    expect((await POST(req)).status).toBe(403)
    expect(lastUpdatePayload).toBeNull()
    expect(proUpdateEq).not.toHaveBeenCalled()
    expect(uploadProfileImage).not.toHaveBeenCalled()
  })

  it('returns 401 when no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq())

    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated user has no professional row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    proMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq())

    expect(res.status).toBe(403)
  })

  it('returns 200 and updates the professional row on valid payload', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    proMaybeSingle.mockResolvedValue({ data: { id: PRO_ID, status: 'active' }, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('never writes email — ignores any email field in the payload', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    proMaybeSingle.mockResolvedValue({ data: { id: PRO_ID, status: 'active' }, error: null })

    const { POST } = await import('./route')
    const req = makeReq({ email: 'hacker@evil.com' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(lastUpdatePayload).not.toBeNull()
    expect(lastUpdatePayload).not.toHaveProperty('email')
  })

  it('returns 400 for invalid WhatsApp number', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    proMaybeSingle.mockResolvedValue({ data: { id: PRO_ID, status: 'active' }, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq({ whatsapp: 'not-a-phone' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when bio is too short', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    proMaybeSingle.mockResolvedValue({ data: { id: PRO_ID, status: 'active' }, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq({ bio: 'Muy corta' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when modality is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    proMaybeSingle.mockResolvedValue({ data: { id: PRO_ID, status: 'active' }, error: null })

    const { POST } = await import('./route')
    const res = await POST(makeReq({ modality: [] }))

    expect(res.status).toBe(400)
  })
})
