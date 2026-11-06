// Unit tests for GET + POST /api/admin/unread (unread numbers in the admin menu)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

interface Call {
  table: string
  op: 'select' | 'update'
  payload?: Record<string, unknown>
  filters: Array<[string, string, unknown]>
}

const state = {
  calls: [] as Call[],
  counts: {} as Record<string, number>,
  error: null as { message: string } | null,
}

// Thenable builder that records every filter, so tests assert the query, not only the response
function builder(call: Call) {
  const b = {
    is: (col: string, val: unknown) => { call.filters.push(['is', col, val]); return b },
    eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return b },
    then: (resolve: (v: unknown) => void) =>
      resolve(state.error ? { count: null, error: state.error } : { count: state.counts[call.table] ?? 0, error: null }),
  }
  return b
}

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => {
        const call: Call = { table, op: 'select', filters: [] }
        state.calls.push(call)
        return builder(call)
      },
      update: (payload: Record<string, unknown>) => {
        const call: Call = { table, op: 'update', payload, filters: [] }
        state.calls.push(call)
        return builder(call)
      },
    }),
  },
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

const LEAD_ID = '6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f'

function post(body: unknown) {
  return POST(new NextRequest('http://localhost/api/admin/unread', {
    method: 'POST',
    body: JSON.stringify(body),
  }))
}

beforeEach(() => {
  state.calls = []
  state.counts = {}
  state.error = null
})

describe('GET /api/admin/unread', () => {
  it('should return the unread count per section from rows with no admin_read_at', async () => {
    state.counts = { leads: 3, professionals: 1, blog_posts: 2, reviews: 5 }
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ leads: 3, professionals: 1, blog: 2, reviews: 5 })
    expect(state.calls.map((c) => c.table).sort()).toEqual(['blog_posts', 'leads', 'professionals', 'reviews'])
    for (const c of state.calls) {
      expect(c.op).toBe('select')
      expect(c.filters).toEqual([['is', 'admin_read_at', null]])
    }
  })

  it('should return 500 when the database fails', async () => {
    state.error = { message: 'column admin_read_at does not exist' }
    const res = await GET()
    expect(res.status).toBe(500)
  })
})

describe('POST /api/admin/unread', () => {
  it('should mark one unread lead as read', async () => {
    const res = await post({ kind: 'leads', id: LEAD_ID })
    expect(res.status).toBe(200)
    expect(state.calls).toHaveLength(1)
    const [call] = state.calls
    expect(call.table).toBe('leads')
    expect(call.op).toBe('update')
    expect(typeof call.payload?.admin_read_at).toBe('string')
    expect(call.filters).toEqual(expect.arrayContaining([['eq', 'id', LEAD_ID], ['is', 'admin_read_at', null]]))
    expect(call.filters).toHaveLength(2)
  })

  it('should map the blog kind to the blog_posts table', async () => {
    await post({ kind: 'blog', id: LEAD_ID })
    expect(state.calls[0].table).toBe('blog_posts')
  })

  it('should mark every unread review as read when no id is given', async () => {
    const res = await post({ kind: 'reviews' })
    expect(res.status).toBe(200)
    expect(state.calls[0].table).toBe('reviews')
    expect(state.calls[0].filters).toEqual([['is', 'admin_read_at', null]])
  })

  it('should reject an unknown kind', async () => {
    const res = await post({ kind: 'pqls', id: LEAD_ID })
    expect(res.status).toBe(400)
    expect(state.calls).toHaveLength(0)
  })

  it('should reject a lead without an id instead of marking every lead read', async () => {
    const res = await post({ kind: 'leads' })
    expect(res.status).toBe(400)
    expect(state.calls).toHaveLength(0)
  })

  it('should reject a body that is not JSON', async () => {
    const res = await POST(new NextRequest('http://localhost/api/admin/unread', { method: 'POST', body: 'nope' }))
    expect(res.status).toBe(400)
  })

  it('should return 500 when the update fails', async () => {
    state.error = { message: 'boom' }
    const res = await post({ kind: 'leads', id: LEAD_ID })
    expect(res.status).toBe(500)
  })
})
