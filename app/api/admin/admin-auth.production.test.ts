// Guard against the 2026-11-06 bug: the admin write routes returned 503 on the live site because the old
// admin check (getAdminUserId) rejected every request when NODE_ENV was 'production'. Dev testing never saw it.
//
// These tests run the REAL requireAdmin() with NODE_ENV=production. Only the Supabase session and the database
// are faked. Every /api/admin write route MUST be listed in ROUTES below.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type Role = 'admin' | 'professional'
let currentUser: { id: string; app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> } | null = null

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) } }),
}))

// Chainable stand-in for the service-role client: records inserts, every query resolves with a harmless row
const inserts: Array<{ table: string; row: unknown }> = []
vi.mock('@/lib/supabase-admin', () => {
  function chain(table: string): unknown {
    const result = { data: { id: 'row-1', key: 'reiki' }, error: null }
    const list = { data: [], error: null }
    const self: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is', 'in', 'order', 'limit', 'update', 'delete', 'ilike', 'contains', 'neq', 'filter', 'or']) {
      self[m] = () => self
    }
    self.insert = (row: unknown) => {
      inserts.push({ table, row })
      return self
    }
    self.single = async () => result
    self.maybeSingle = async () => result
    self.then = (resolve: (v: unknown) => unknown) => Promise.resolve(list).then(resolve)
    return self
  }
  return { supabaseAdmin: { from: (t: string) => chain(t), rpc: async () => ({ data: null, error: null }) } }
})

function signIn(role: Role | null) {
  currentUser = role ? { id: `${role}-user-id`, app_metadata: { role }, user_metadata: {} } : null
}

function jsonReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
}

// Every admin write route (plus the practices GET, which shares the check). Add new ones here.
const ROUTES: Array<{ name: string; call: () => Promise<Response> }> = [
  {
    name: 'POST /api/admin/matches',
    call: async () => (await import('./matches/route')).POST(jsonReq('/api/admin/matches', 'POST', {})),
  },
  {
    name: 'POST /api/admin/pqls/[id]/adjust',
    call: async () =>
      (await import('./pqls/[id]/adjust/route')).POST(
        jsonReq('/api/admin/pqls/pql-1/adjust', 'POST', { adjustment_type: 'waive', reason: 'Prueba', billing_month: '2026-10' }),
        { params: { id: 'pql-1' } }
      ),
  },
  {
    name: 'GET /api/admin/practices',
    call: async () => (await import('./practices/route')).GET(new NextRequest('http://localhost/api/admin/practices')),
  },
  {
    name: 'POST /api/admin/practices',
    call: async () => (await import('./practices/route')).POST(jsonReq('/api/admin/practices', 'POST', {})),
  },
  {
    name: 'PATCH /api/admin/practices/[key]',
    call: async () =>
      (await import('./practices/[key]/route')).PATCH(jsonReq('/api/admin/practices/reiki', 'PATCH', {}), { params: { key: 'reiki' } }),
  },
  {
    name: 'POST /api/admin/practices/dismiss',
    call: async () => (await import('./practices/dismiss/route')).POST(jsonReq('/api/admin/practices/dismiss', 'POST', {})),
  },
]

const AUTH_FAILURES = [401, 403, 503]

describe('admin write routes on the live site (NODE_ENV=production)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    inserts.length = 0
  })

  it.each(ROUTES)('$name lets the admin through', async ({ call }) => {
    signIn('admin')
    const res = await call()
    expect(AUTH_FAILURES).not.toContain(res.status)
  })

  it.each(ROUTES)('$name returns 403 to a professional', async ({ call }) => {
    signIn('professional')
    expect((await call()).status).toBe(403)
  })

  it.each(ROUTES)('$name returns 401 with no session', async ({ call }) => {
    signIn(null)
    expect((await call()).status).toBe(401)
  })

  it('records the signed-in admin as created_by on a PQL adjustment', async () => {
    signIn('admin')
    const res = await ROUTES[1].call()
    expect(res.status).toBe(200)
    const adjustment = inserts.find((i) => i.table === 'pql_adjustments')
    expect(adjustment?.row).toMatchObject({ pql_id: 'pql-1', adjustment_type: 'waive', created_by: 'admin-user-id' })
  })
})
