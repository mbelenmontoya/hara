// Unit tests for POST /api/professionals/register
// Focus: practices field handling + validatePracticeKeys integration.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsert = vi.fn()
const mockLike = vi.fn()

// Cooldown query chain: .select(...).eq('email', ...).eq('status', 'rejected')
//                                   .order(created_at).order(id).limit(1).maybeSingle()
const mockCooldownMaybeSingle = vi.fn()
const mockCooldownLimit = vi.fn().mockReturnValue({ maybeSingle: mockCooldownMaybeSingle })
const mockCooldownOrder2 = vi.fn().mockReturnValue({ limit: mockCooldownLimit })
const mockCooldownOrder1 = vi.fn().mockReturnValue({ order: mockCooldownOrder2 })
const mockCooldownEq2 = vi.fn().mockReturnValue({ order: mockCooldownOrder1 })
const mockCooldownEq1 = vi.fn().mockReturnValue({ eq: mockCooldownEq2 })

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'professionals') {
        return {
          select: vi.fn().mockReturnValue({
            like: mockLike,         // slug-uniqueness path
            eq: mockCooldownEq1,    // cooldown-lookup path
          }),
          insert: mockInsert,
        }
      }
      throw new Error(`unexpected table: ${table}`)
    }),
  },
}))

vi.mock('@/lib/practices', () => ({
  validatePracticeKeys: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  notifyNewProfessional: vi.fn().mockResolvedValue(undefined),
  notifyRegistrationReceived: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/storage', () => ({
  uploadProfileImage: vi.fn(),
}))

vi.mock('@/lib/monitoring', () => ({
  logError: vi.fn(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_FIELDS = {
  full_name: 'María García',
  email: `test-${Date.now()}@example.com`,
  whatsapp: '+5491112345678',
  country: 'AR',
  modality: ['online'],
  specialties: ['ansiedad'],
  bio: 'Soy reikista con 10 años de experiencia acompañando procesos de sanación.',
  practices: ['reiki'],
}

function makeJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/professionals/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setupSlugMock() {
  mockLike.mockResolvedValue({ data: [], error: null })
}

function setupCooldownNoMatch() {
  mockCooldownMaybeSingle.mockResolvedValue({ data: null, error: null })
}

function setupInsertMock(id = 'uuid-1234') {
  const selectMock = vi.fn().mockResolvedValue({
    data: { id, slug: 'maria-garcia', ...VALID_FIELDS },
    error: null,
  })
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: selectMock }) })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/professionals/register — practices field', () => {
  it('(a) valid practices → 201, row inserted with practices column', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })
    setupCooldownNoMatch()
    setupSlugMock()
    setupInsertMock()

    const { POST } = await import('./route')
    const res = await POST(makeJsonRequest(VALID_FIELDS))
    expect(res.status).toBe(200) // route returns 200 on success
    expect(validatePracticeKeys).toHaveBeenCalledWith(['reiki'])
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ practices: ['reiki'] }))
  })

  it('(b) unknown practice key → 400 with key in error body', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: false, invalidKey: 'fake-key' })

    const { POST } = await import('./route')
    const res = await POST(makeJsonRequest({ ...VALID_FIELDS, practices: ['fake-key'] }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toContain('fake-key')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('(c) empty practices array → 201, insert proceeds', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    // validatePracticeKeys short-circuits for empty array without even being called
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })
    setupCooldownNoMatch()
    setupSlugMock()
    setupInsertMock()

    const { POST } = await import('./route')
    const res = await POST(makeJsonRequest({ ...VALID_FIELDS, practices: [] }))
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ practices: [] }))
  })

  it('(d) legacy style field in body is not inserted into practices column', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })
    setupCooldownNoMatch()
    setupSlugMock()
    setupInsertMock()

    const { POST } = await import('./route')
    // Sending both style and practices — only practices should land in the insert
    const res = await POST(makeJsonRequest({ ...VALID_FIELDS, style: ['humanistic'] }))
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ style: expect.anything() })
    )
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ practices: ['reiki'] }))
  })
})
