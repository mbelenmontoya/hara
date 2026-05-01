// Unit tests for DELETE /api/admin/professionals/[id]

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from './route'

const builders = {
  // chainable builder used by both .select() and .delete() flows
  fetchSingle: vi.fn(),
  pqlsDeleteEq: vi.fn(),
  proDeleteEq:  vi.fn(),
}

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'pqls') {
        return { delete: () => ({ eq: builders.pqlsDeleteEq }) }
      }
      if (table === 'professionals') {
        // first call is select+eq+single (existence check)
        // second call is delete+eq (the actual deletion)
        return {
          select: () => ({
            eq: () => ({ single: builders.fetchSingle }),
          }),
          delete: () => ({ eq: builders.proDeleteEq }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    }),
  },
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

const ID = '11111111-2222-3333-4444-555555555555'

function makeReq(): NextRequest {
  return new NextRequest(`http://localhost/api/admin/professionals/${ID}`, { method: 'DELETE' })
}

beforeEach(() => {
  vi.clearAllMocks()
  builders.fetchSingle.mockReset()
  builders.pqlsDeleteEq.mockReset()
  builders.proDeleteEq.mockReset()
})

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
