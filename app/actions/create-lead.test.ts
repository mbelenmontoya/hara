// Unit tests for the real createLead action; external storage and mail are mocked.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CreateLeadInput } from './create-lead'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsert = vi.fn()

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'leads') return { insert: mockInsert }
      throw new Error(`unexpected table: ${table}`)
    }),
  },
}))

vi.mock('@/lib/practices', () => ({
  validatePracticeKeys: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  notifyNewLead: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/monitoring', () => ({
  logError: vi.fn(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupInsertMock(error: unknown = null) {
  const selectMock = vi.fn().mockResolvedValue({
    data: { id: 'lead-uuid-1234' },
    error,
  })
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: selectMock }) })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('createLead — practice_preference field', () => {
  const validContact = { email: 'sol@example.com', whatsapp: '+5491123456789' }

  it.each([
    { label: 'both omitted', contact: {} },
    { label: 'email omitted', contact: { whatsapp: validContact.whatsapp } },
    { label: 'WhatsApp omitted', contact: { email: validContact.email } },
    { label: 'both empty', contact: { email: '', whatsapp: '' } },
    { label: 'both whitespace', contact: { email: '  ', whatsapp: '  ' } },
    { label: 'invalid email with valid phone', contact: { ...validContact, email: 'sin-arroba' } },
    { label: 'valid email with incomplete phone', contact: { ...validContact, whatsapp: '+54' } },
    { label: 'valid email with local phone', contact: { ...validContact, whatsapp: '1123456789' } },
    { label: 'email with unexpected type', contact: { ...validContact, email: 123 } },
    { label: 'phone with unexpected type', contact: { ...validContact, whatsapp: ['+5491123456789'] } },
  ])('should reject unusable contact before saving or notifying: $label', async ({ contact }) => {
    const { createLead } = await import('@/app/actions/create-lead')
    const { validatePracticeKeys } = await import('@/lib/practices')
    const { notifyNewLead } = await import('@/lib/email')
    setupInsertMock()
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })

    await expect(createLead({
      country: 'AR', intent_tags: ['anxiety'], practice_preference: ['reiki'], ...contact,
    } as CreateLeadInput)).rejects.toThrow(/email|WhatsApp/)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(validatePracticeKeys).not.toHaveBeenCalled()
    expect(notifyNewLead).not.toHaveBeenCalled()
  })

  it('(a) valid practice keys → success, lead row inserted with practice_preference', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })
    setupInsertMock()

    const { createLead } = await import('@/app/actions/create-lead')
    const result = await createLead({
      ...validContact,
      intent_tags: ['anxiety'],
      country: 'AR',
      practice_preference: ['reiki', 'astrologia'],
    })

    expect(result).toHaveProperty('lead_id')
    const { notifyNewLead } = await import('@/lib/email')
    expect(notifyNewLead).toHaveBeenCalledWith(expect.objectContaining({
      whatsapp: validContact.whatsapp, country: 'AR', intent_tags: ['anxiety'],
    }))
    expect(validatePracticeKeys).toHaveBeenCalledWith(['reiki', 'astrologia'])
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ ...validContact, practice_preference: ['reiki', 'astrologia'] })
    )
    // Must NOT contain the old style_preference key
    expect(mockInsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ style_preference: expect.anything() })
    )
  })

  it('(b) invalid practice key → throws with Spanish error message', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: false, invalidKey: 'cognitive-behavioral' })

    const { createLead } = await import('@/app/actions/create-lead')
    await expect(
      createLead({
        ...validContact,
        intent_tags: ['anxiety'],
        country: 'AR',
        practice_preference: ['cognitive-behavioral'],
      })
    ).rejects.toThrow(/Práctica inválida/i)

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('(c) undefined practice_preference → success, NULL stored (not validated)', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    setupInsertMock()

    const { createLead } = await import('@/app/actions/create-lead')
    const result = await createLead({
      ...validContact,
      intent_tags: ['stress'],
      country: 'MX',
      // practice_preference omitted
    })

    expect(result).toHaveProperty('lead_id')
    expect(validatePracticeKeys).not.toHaveBeenCalled()
  })
})
