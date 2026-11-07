// Unit tests for POST /api/professionals/register
// Required fields, account creation and practices through the real handler.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsert = vi.fn()
const mockLike = vi.fn()
const mockCreateUser = vi.fn()
const mockDeleteUser = vi.fn()
const mockRateLimit = vi.fn()

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
    auth: { admin: { createUser: mockCreateUser, deleteUser: mockDeleteUser } },
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

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: mockRateLimit },
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
  password: 'clave-segura-1',
}

const AUTH_USER_ID = 'auth-user-1'

function makeJsonRequest(body: unknown): NextRequest {
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
  mockRateLimit.mockResolvedValue({ success: true })
  mockCreateUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })
  mockDeleteUser.mockResolvedValue({ data: {}, error: null })
})

describe('POST /api/professionals/register: required fields', () => {
  beforeEach(async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })
    setupCooldownNoMatch()
    setupSlugMock()
    setupInsertMock()
  })

  const invalidFields = [
    ...['full_name', 'email', 'whatsapp', 'country', 'bio'].flatMap(field =>
      [undefined, '', '   ', 123, {}, ['contenido']].map(value => ({
        label: `${field}=${JSON.stringify(value)}`, body: { ...VALID_FIELDS, [field]: value },
      }))
    ),
    ...['modality', 'specialties'].flatMap(field =>
      [undefined, [], [''], ['   '], [null], [123], ['online', ''], 'online', {}].map(value => ({
        label: `${field}=${JSON.stringify(value)}`, body: { ...VALID_FIELDS, [field]: value },
      }))
    ),
    { label: '49 bio characters padded with spaces', body: { ...VALID_FIELDS, bio: ` ${'a'.repeat(49)} ` } },
    { label: 'malformed email', body: { ...VALID_FIELDS, email: 'sin-arroba' } },
    { label: 'malformed WhatsApp', body: { ...VALID_FIELDS, whatsapp: 'abc' } },
    { label: 'null body', body: null },
    { label: 'array body', body: [] },
  ]

  it.each(invalidFields)('test_POST_invalid_required_fields_returns_400_without_side_effects: $label', async ({ body }) => {
    const { POST } = await import('./route')
    const { notifyNewProfessional, notifyRegistrationReceived } = await import('@/lib/email')
    const { uploadProfileImage } = await import('@/lib/storage')
    const res = await POST(makeJsonRequest(body))

    expect.soft(res.status).toBe(400)
    expect((await res.json()).error).toEqual(expect.any(String))
    for (const effect of [mockCooldownEq1, mockLike, mockCreateUser, mockInsert, uploadProfileImage,
      notifyNewProfessional, notifyRegistrationReceived]) {
      expect.soft(effect).not.toHaveBeenCalled()
    }
  })

  it.each(['a'.repeat(50), 'Primera parte del relato.\n\nSegunda parte con más información.'])('accepts useful text and preserves optional fields and password: %s', async bio => {
    const { POST } = await import('./route')
    const password = '  clave con espacios  '
    const res = await POST(makeJsonRequest({
      ...VALID_FIELDS, full_name: '  María García  ', country: ' AR ', bio: `  ${bio}  `,
      specialties: ['Mi especialidad personalizada'], practices: [], password,
      city: '', instagram: '', short_description: '', experience_description: '',
    }))
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      full_name: 'María García', country: 'AR', bio,
      specialties: ['Mi especialidad personalizada'], practices: [],
      city: null, instagram: null, short_description: null, experience_description: null,
    }))
    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ password }))
  })
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

  it('(e) latitude/longitude in body → insert includes exact coordinate values', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })
    setupCooldownNoMatch()
    setupSlugMock()
    setupInsertMock()

    const { POST } = await import('./route')
    const res = await POST(makeJsonRequest({
      ...VALID_FIELDS,
      latitude: -31.4135,
      longitude: -64.1811,
    }))
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -31.4135, longitude: -64.1811 })
    )
  })

  it('(f) omitting coordinates → insert proceeds with null coords', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })
    setupCooldownNoMatch()
    setupSlugMock()
    setupInsertMock()

    const { POST } = await import('./route')
    const res = await POST(makeJsonRequest(VALID_FIELDS))
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: null, longitude: null })
    )
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

// ── Account creation (the applicant gets a login with role professional) ─────────

describe('POST /api/professionals/register: account', () => {
  async function ready() {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })
    setupCooldownNoMatch()
    setupSlugMock()
    setupInsertMock()
    return (await import('./route')).POST
  }

  it('creates a confirmed professional account and links it, never storing the password', async () => {
    const POST = await ready()
    const res = await POST(makeJsonRequest(VALID_FIELDS))

    expect(res.status).toBe(200)
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: VALID_FIELDS.email,
      password: 'clave-segura-1',
      email_confirm: true,
      app_metadata: { role: 'professional' },
    })
    const row = mockInsert.mock.calls[0][0]
    expect(row.user_id).toBe(AUTH_USER_ID)
    expect(row).not.toHaveProperty('password')
    expect(JSON.stringify(await res.json())).not.toContain('clave-segura-1')
  })

  it.each([
    ['missing', undefined],
    ['7 characters', '1234567'],
    ['73 characters', 'x'.repeat(73)],
  ])('rejects a %s password with 400 and creates nothing', async (_label, password) => {
    const POST = await ready()
    const res = await POST(makeJsonRequest({ ...VALID_FIELDS, password }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/contraseña/i)
    expect(mockCreateUser).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns 409 and inserts nothing when the email already has an account', async () => {
    const POST = await ready()
    mockCreateUser.mockResolvedValue({ data: { user: null }, error: { status: 422, code: 'email_exists', message: 'A user with this email address has already been registered' } })
    const res = await POST(makeJsonRequest(VALID_FIELDS))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Ya tenés una cuenta/)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it.each([
    { offsetDays: 30, status: 403 },
    { offsetDays: -1, status: 200 },
  ])('preserves the rejection cooldown ($offsetDays days → $status)', async ({ offsetDays, status }) => {
    const POST = await ready()
    mockCooldownMaybeSingle.mockResolvedValue({ data: {
      id: 'rejected-profile', created_at: '2026-01-01T00:00:00Z',
      resubmit_after: new Date(Date.now() + offsetDays * 86400000).toISOString(),
    }, error: null })
    const res = await POST(makeJsonRequest(VALID_FIELDS))
    expect(res.status).toBe(status)
    if (status === 403) {
      expect((await res.json()).resubmit_after).toBeTruthy()
      expect(mockCreateUser).not.toHaveBeenCalled()
      expect(mockInsert).not.toHaveBeenCalled()
    } else {
      expect(mockCreateUser).toHaveBeenCalledOnce()
      expect(mockInsert).toHaveBeenCalledOnce()
    }
  })

  it('deletes the new account when saving the professional fails', async () => {
    const POST = await ready()
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key professionals_email' } }) }),
    })
    const res = await POST(makeJsonRequest(VALID_FIELDS))
    expect(res.status).toBe(409)
    expect(mockDeleteUser).toHaveBeenCalledWith(AUTH_USER_ID)
  })

  it('rolls the account back when the insert throws', async () => {
    const POST = await ready()
    mockInsert.mockReturnValue({ select: () => ({ single: () => Promise.reject(new Error('network failure')) }) })
    expect((await POST(makeJsonRequest(VALID_FIELDS))).status).toBe(500)
    expect(mockDeleteUser).toHaveBeenCalledWith(AUTH_USER_ID)
  })

  it('reports a failed rollback without exposing the password', async () => {
    const POST = await ready()
    mockInsert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: null, error: { code: '500', message: 'DB failure' } }) }) })
    mockDeleteUser.mockResolvedValue({ error: { message: 'Auth failure' } })
    const { logError } = await import('@/lib/monitoring')
    expect((await POST(makeJsonRequest(VALID_FIELDS))).status).toBe(500)
    expect(logError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ userId: AUTH_USER_ID }))
    expect(JSON.stringify(vi.mocked(logError).mock.calls)).not.toContain(VALID_FIELDS.password)
  })

  it('does not confuse another 422 error with an existing email', async () => {
    const POST = await ready()
    mockCreateUser.mockResolvedValue({ data: { user: null }, error: { status: 422, code: 'weak_password', message: 'Password too weak' } })
    const res = await POST(makeJsonRequest(VALID_FIELDS))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('contraseña más segura')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('answers 429 before any write when the rate limit is hit', async () => {
    const POST = await ready()
    mockRateLimit.mockResolvedValue({ success: false })
    const res = await POST(makeJsonRequest(VALID_FIELDS))
    expect(res.status).toBe(429)
    expect(mockCreateUser).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
