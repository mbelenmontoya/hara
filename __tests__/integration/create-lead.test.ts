// Integration tests for createLead server action
// Verifies practice_preference field rename + validatePracticeKeys integration.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSingle = vi.fn()
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
  it('(a) valid practice keys → success, lead row inserted with practice_preference', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    vi.mocked(validatePracticeKeys).mockResolvedValue({ ok: true })
    setupInsertMock()

    const { createLead } = await import('@/app/actions/create-lead')
    const result = await createLead({
      intent_tags: ['anxiety'],
      country: 'AR',
      practice_preference: ['reiki', 'astrologia'],
    })

    expect(result).toHaveProperty('lead_id')
    expect(validatePracticeKeys).toHaveBeenCalledWith(['reiki', 'astrologia'])
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ practice_preference: ['reiki', 'astrologia'] })
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
      intent_tags: ['stress'],
      country: 'MX',
      // practice_preference omitted
    })

    expect(result).toHaveProperty('lead_id')
    expect(validatePracticeKeys).not.toHaveBeenCalled()
  })
})
