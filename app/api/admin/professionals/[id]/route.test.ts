// Unit tests for DELETE + PATCH (approve/reject) /api/admin/professionals/[id]

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE, PATCH } from './route'

const builders = {
  // chainable builder used by both .select() and .delete() flows
  fetchSingle: vi.fn(),
  pqlsDeleteEq: vi.fn(),
  proDeleteEq:  vi.fn(),
  proUpdateEq:  vi.fn(),
  // Last update payload captured by the shared mock — read from tests
  // rather than overriding `from()` per-test (which silently breaks if the
  // route reorders its from() calls).
  lastUpdatePayload: null as Record<string, unknown> | null,
}

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'pqls') {
        return { delete: () => ({ eq: builders.pqlsDeleteEq }) }
      }
      if (table === 'professionals') {
        // PATCH approve/reject: select+eq+single (existing row), then update+eq
        // DELETE: select+eq+single (existence), then delete+eq
        return {
          select: () => ({
            eq: () => ({ single: builders.fetchSingle }),
          }),
          delete: () => ({ eq: builders.proDeleteEq }),
          update: vi.fn((payload: Record<string, unknown>) => {
            builders.lastUpdatePayload = payload
            return { eq: builders.proUpdateEq }
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    }),
  },
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

vi.mock('@/lib/email', () => ({
  notifyProfessionalApproved: vi.fn().mockResolvedValue(true),
  notifyProfessionalRejected: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/practices', () => ({
  getActivePractices: vi.fn().mockResolvedValue([]),
  validatePracticeKeys: vi.fn().mockResolvedValue({ ok: true }),
}))

const ID = '11111111-2222-3333-4444-555555555555'

function makeReq(): NextRequest {
  return new NextRequest(`http://localhost/api/admin/professionals/${ID}`, { method: 'DELETE' })
}

beforeEach(() => {
  vi.clearAllMocks()
  builders.fetchSingle.mockReset()
  builders.pqlsDeleteEq.mockReset()
  builders.proDeleteEq.mockReset()
  builders.proUpdateEq.mockReset()
  builders.lastUpdatePayload = null
})

function makePatchReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/admin/professionals/${ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('DELETE /api/admin/professionals/[id]', () => {
  it('404 when professional does not exist', async () => {
    builders.fetchSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } })
    const res = await DELETE(makeReq(), { params: { id: ID } })
    expect(res.status).toBe(404)
    expect(builders.pqlsDeleteEq).not.toHaveBeenCalled()
    expect(builders.proDeleteEq).not.toHaveBeenCalled()
  })

  it('400 when id param is empty', async () => {
    const res = await DELETE(makeReq(), { params: { id: '' } })
    expect(res.status).toBe(400)
    expect(builders.fetchSingle).not.toHaveBeenCalled()
  })

  it('200 on happy path — pqls deleted first, then professional', async () => {
    const callOrder: string[] = []
    builders.fetchSingle.mockResolvedValue({ data: { id: ID }, error: null })
    builders.pqlsDeleteEq.mockImplementation(() => {
      callOrder.push('pqls')
      return Promise.resolve({ error: null })
    })
    builders.proDeleteEq.mockImplementation(() => {
      callOrder.push('professional')
      return Promise.resolve({ error: null })
    })

    const res = await DELETE(makeReq(), { params: { id: ID } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(callOrder).toEqual(['pqls', 'professional'])
  })

  it('500 + does not delete professional when pqls deletion fails', async () => {
    builders.fetchSingle.mockResolvedValue({ data: { id: ID }, error: null })
    builders.pqlsDeleteEq.mockResolvedValue({ error: { message: 'pqls boom' } })

    const res = await DELETE(makeReq(), { params: { id: ID } })
    expect(res.status).toBe(500)
    expect(builders.proDeleteEq).not.toHaveBeenCalled()
  })

  it('500 when professional deletion fails after pqls succeed', async () => {
    builders.fetchSingle.mockResolvedValue({ data: { id: ID }, error: null })
    builders.pqlsDeleteEq.mockResolvedValue({ error: null })
    builders.proDeleteEq.mockResolvedValue({ error: { message: 'fk violation' } })

    const res = await DELETE(makeReq(), { params: { id: ID } })
    expect(res.status).toBe(500)
  })
})

describe('PATCH /api/admin/professionals/[id] — approve/reject email firing', () => {
  const SUBMITTED_PRO = {
    id: ID,
    status: 'submitted',
    email: 'pro@example.com',
    full_name: 'Laura Giraudo',
    slug: 'laura-giraudo',
  }

  it('approve fires notifyProfessionalApproved with { to, full_name, slug }', async () => {
    const { notifyProfessionalApproved } = await import('@/lib/email')
    builders.fetchSingle.mockResolvedValue({ data: SUBMITTED_PRO, error: null })
    builders.proUpdateEq.mockResolvedValue({ error: null })

    const res = await PATCH(makePatchReq({ action: 'approve' }), { params: { id: ID } })

    expect(res.status).toBe(200)
    expect(notifyProfessionalApproved).toHaveBeenCalledTimes(1)
    expect(notifyProfessionalApproved).toHaveBeenCalledWith({
      to: 'pro@example.com',
      full_name: 'Laura Giraudo',
      slug: 'laura-giraudo',
    })
  })

  it('approve still returns 200 even if email send rejects (fire-and-forget)', async () => {
    const { notifyProfessionalApproved } = await import('@/lib/email')
    vi.mocked(notifyProfessionalApproved).mockRejectedValueOnce(new Error('Resend down'))
    builders.fetchSingle.mockResolvedValue({ data: SUBMITTED_PRO, error: null })
    builders.proUpdateEq.mockResolvedValue({ error: null })

    const res = await PATCH(makePatchReq({ action: 'approve' }), { params: { id: ID } })

    expect(res.status).toBe(200)
  })

  it('reject writes resubmit_after ~60 days out and fires notifyProfessionalRejected', async () => {
    const { notifyProfessionalRejected } = await import('@/lib/email')
    builders.fetchSingle.mockResolvedValue({ data: SUBMITTED_PRO, error: null })
    builders.proUpdateEq.mockResolvedValue({ error: null })

    const before = Date.now()
    const res = await PATCH(
      makePatchReq({ action: 'reject', rejection_reason: 'El perfil necesita más detalle.' }),
      { params: { id: ID } },
    )
    const after = Date.now()

    expect(res.status).toBe(200)
    expect(builders.lastUpdatePayload).not.toBeNull()
    const payload = builders.lastUpdatePayload as unknown as Record<string, unknown>
    expect(payload).toMatchObject({ status: 'rejected', rejection_reason: 'El perfil necesita más detalle.' })
    expect(typeof payload.resubmit_after).toBe('string')

    // resubmit_after should be ~60 days from now (allow ±5 minute drift)
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000
    const fiveMinMs = 5 * 60 * 1000
    const resubmitAt = new Date(payload.resubmit_after as string).getTime()
    expect(resubmitAt).toBeGreaterThanOrEqual(before + sixtyDaysMs - fiveMinMs)
    expect(resubmitAt).toBeLessThanOrEqual(after + sixtyDaysMs + fiveMinMs)

    expect(notifyProfessionalRejected).toHaveBeenCalledTimes(1)
    expect(notifyProfessionalRejected).toHaveBeenCalledWith({
      to: 'pro@example.com',
      full_name: 'Laura Giraudo',
      rejection_reason: 'El perfil necesita más detalle.',
      resubmit_after: payload.resubmit_after,
    })
  })

  it('reject still returns 200 even if email send rejects (fire-and-forget)', async () => {
    const { notifyProfessionalRejected } = await import('@/lib/email')
    vi.mocked(notifyProfessionalRejected).mockRejectedValueOnce(new Error('Resend down'))
    builders.fetchSingle.mockResolvedValue({ data: SUBMITTED_PRO, error: null })
    builders.proUpdateEq.mockResolvedValue({ error: null })

    const res = await PATCH(
      makePatchReq({ action: 'reject', rejection_reason: 'reason' }),
      { params: { id: ID } },
    )

    expect(res.status).toBe(200)
  })
})
