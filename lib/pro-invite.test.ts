// Tests for generateProAccessLink
// Verifies the invite/recovery link generation, user_id write-back, and null-on-failure behaviour.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

const adminGenerateLink = vi.fn()
const adminUpdateUserById = vi.fn()
const fromProfessionals = {
  select: vi.fn(),
  update: vi.fn(),
}

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: { admin: { generateLink: adminGenerateLink, updateUserById: adminUpdateUserById } },
    from: vi.fn((table: string) => {
      if (table === 'professionals') return fromProfessionals
      throw new Error(`unexpected table: ${table}`)
    }),
  },
}))

vi.mock('@/lib/email', () => ({
  emailBaseUrl: () => 'https://haravital.app',
}))

// Helper to build a chainable select mock for professionals
function makeSelectChain(result: unknown) {
  const chain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  fromProfessionals.select.mockReturnValue(chain)
  return chain
}

// Helper to build a chainable update mock for professionals
function makeUpdateChain(result = { error: null }) {
  const chain = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    mockResult: vi.fn().mockResolvedValue(result),
  }
  // Mimic: .update(...).eq(...).is(...)
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      is: vi.fn().mockResolvedValue(result),
    }),
  })
  fromProfessionals.update = updateMock
  return updateMock
}

const PRO_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const EMAIL = 'laura@example.com'
const HASHED_TOKEN = 'abc123hashedtoken'
const AUTH_USER_ID = '11111111-2222-3333-4444-555555555555'

beforeEach(() => {
  vi.clearAllMocks()
  adminUpdateUserById.mockResolvedValue({ data: {}, error: null })
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateProAccessLink', () => {
  it('returns invite link when user does not yet exist', async () => {
    adminGenerateLink.mockResolvedValue({
      data: {
        properties: { hashed_token: HASHED_TOKEN },
        user: { id: AUTH_USER_ID },
      },
      error: null,
    })
    makeSelectChain({ data: { user_id: null }, error: null })
    makeUpdateChain({ error: null })

    const { generateProAccessLink } = await import('./pro-invite')
    const result = await generateProAccessLink({ email: EMAIL, professionalId: PRO_ID })

    expect(result).not.toBeNull()
    expect(result?.kind).toBe('invite')
    expect(result?.setupUrl).toBe(
      `https://haravital.app/pro/set-password?token_hash=${HASHED_TOKEN}&type=invite`
    )

    // Should have called with type: 'invite'
    expect(adminGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'invite', email: EMAIL })
    )
  })

  it('retries with recovery when invite fails because user already exists', async () => {
    // First call (invite) fails with user-exists error
    adminGenerateLink
      .mockResolvedValueOnce({
        data: { properties: null, user: null },
        error: { message: 'User already registered' },
      })
      // Second call (recovery) succeeds
      .mockResolvedValueOnce({
        data: {
          properties: { hashed_token: HASHED_TOKEN },
          user: { id: AUTH_USER_ID },
        },
        error: null,
      })
    makeSelectChain({ data: { user_id: null }, error: null })
    makeUpdateChain({ error: null })

    const { generateProAccessLink } = await import('./pro-invite')
    const result = await generateProAccessLink({ email: EMAIL, professionalId: PRO_ID })

    expect(result).not.toBeNull()
    expect(result?.kind).toBe('recovery')
    expect(result?.setupUrl).toContain('type=recovery')

    expect(adminGenerateLink).toHaveBeenCalledTimes(2)
    expect(adminGenerateLink).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'recovery', email: EMAIL })
    )
  })

  it('writes user_id to professionals row only when currently null', async () => {
    adminGenerateLink.mockResolvedValue({
      data: {
        properties: { hashed_token: HASHED_TOKEN },
        user: { id: AUTH_USER_ID },
      },
      error: null,
    })
    // Row has no user_id yet
    makeSelectChain({ data: { user_id: null }, error: null })
    const updateMock = makeUpdateChain({ error: null })

    const { generateProAccessLink } = await import('./pro-invite')
    await generateProAccessLink({ email: EMAIL, professionalId: PRO_ID })

    // update should have been called (user_id was null)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: AUTH_USER_ID })
    )
  })

  it('does not overwrite user_id when already set', async () => {
    adminGenerateLink.mockResolvedValue({
      data: {
        properties: { hashed_token: HASHED_TOKEN },
        user: { id: AUTH_USER_ID },
      },
      error: null,
    })
    // Row already has a user_id
    makeSelectChain({ data: { user_id: 'existing-user-id' }, error: null })
    const updateMock = makeUpdateChain({ error: null })

    const { generateProAccessLink } = await import('./pro-invite')
    await generateProAccessLink({ email: EMAIL, professionalId: PRO_ID })

    // update should NOT be called since user_id is already set
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('returns null when both invite and recovery fail', async () => {
    adminGenerateLink.mockResolvedValue({
      data: { properties: null, user: null },
      error: { message: 'Auth error' },
    })

    const { generateProAccessLink } = await import('./pro-invite')
    const result = await generateProAccessLink({ email: EMAIL, professionalId: PRO_ID })

    expect(result).toBeNull()
  })

  it('returns null without throwing when generateLink throws', async () => {
    adminGenerateLink.mockRejectedValue(new Error('Network failure'))

    const { generateProAccessLink } = await import('./pro-invite')
    const result = await generateProAccessLink({ email: EMAIL, professionalId: PRO_ID })

    expect(result).toBeNull()
  })

  describe('professional role', () => {
    function linkFor(appMetadata: Record<string, unknown>) {
      adminGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: HASHED_TOKEN }, user: { id: AUTH_USER_ID, app_metadata: appMetadata } },
        error: null,
      })
      makeSelectChain({ data: { user_id: AUTH_USER_ID }, error: null })
    }

    it('gives the invited user role professional and keeps the rest of app_metadata', async () => {
      linkFor({ provider: 'email', providers: ['email'] })
      const { generateProAccessLink } = await import('./pro-invite')
      const result = await generateProAccessLink({ email: EMAIL, professionalId: PRO_ID })

      expect(result).not.toBeNull()
      expect(adminUpdateUserById).toHaveBeenCalledTimes(1)
      expect(adminUpdateUserById).toHaveBeenCalledWith(AUTH_USER_ID, {
        app_metadata: { provider: 'email', providers: ['email'], role: 'professional' },
      })
    })

    it('never turns the admin into a professional', async () => {
      linkFor({ provider: 'email', role: 'admin' })
      const { generateProAccessLink } = await import('./pro-invite')
      expect(await generateProAccessLink({ email: EMAIL, professionalId: PRO_ID })).not.toBeNull()
      expect(adminUpdateUserById).not.toHaveBeenCalled()
    })

    it('does not write again when the user is already a professional', async () => {
      linkFor({ role: 'professional' })
      const { generateProAccessLink } = await import('./pro-invite')
      expect(await generateProAccessLink({ email: EMAIL, professionalId: PRO_ID })).not.toBeNull()
      expect(adminUpdateUserById).not.toHaveBeenCalled()
    })

    it('returns null when the role cannot be saved, since the link would not open /pro', async () => {
      linkFor({})
      adminUpdateUserById.mockResolvedValue({ data: null, error: { message: 'boom' } })
      const { generateProAccessLink } = await import('./pro-invite')
      expect(await generateProAccessLink({ email: EMAIL, professionalId: PRO_ID })).toBeNull()
    })
  })
})
