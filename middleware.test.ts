// Tests for route-protection middleware
// Covers: /admin gating (existing), /pro gating (new), public routes pass-through.
// NOTE: The prefix-collision regression test verifies that /profesionales and
// /profesionales/registro are NOT gated — a bug-trap: startsWith('/pro') would
// match /profesionales.

import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUpdateSession = vi.fn()

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: mockUpdateSession,
}))

// Build a minimal NextResponse-like object that satisfies the middleware's needs
function makeResponse() {
  return {
    cookies: { set: vi.fn() },
    headers: new Headers(),
    status: 200,
  }
}

function buildSession(withUser: boolean) {
  const response = makeResponse()
  return {
    response,
    user: withUser ? { id: 'user-123', email: 'admin@hara.com' } : null,
  }
}

function makeReq(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`)
}

// ── Helper — run middleware and extract redirect target ────────────────────────

async function runMiddleware(path: string, withUser = false) {
  mockUpdateSession.mockResolvedValue(buildSession(withUser))
  const { middleware } = await import('./middleware')
  const req = makeReq(path)
  return middleware(req)
}

// ── /admin routes (regression — must still work) ─────────────────────────────

describe('/admin protection (existing behaviour)', () => {
  it('redirects unauthenticated visitors of /admin/leads to /admin/login', async () => {
    const res = await runMiddleware('/admin/leads', false)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch('/admin/login')
  })

  it('lets authenticated users through to /admin/leads', async () => {
    const res = await runMiddleware('/admin/leads', true)
    expect(res.status).not.toBe(307)
  })

  it('redirects authenticated users on /admin/login to /admin/leads', async () => {
    const res = await runMiddleware('/admin/login', true)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch('/admin/leads')
  })
})

// ── /pro routes (new behaviour) ───────────────────────────────────────────────

describe('/pro protection (new)', () => {
  it('redirects unauthenticated /pro/perfil to /pro/login', async () => {
    const res = await runMiddleware('/pro/perfil', false)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch('/pro/login')
  })

  it('lets authenticated users through to /pro/perfil', async () => {
    const res = await runMiddleware('/pro/perfil', true)
    expect(res.status).not.toBe(307)
  })

  it('redirects authenticated users on /pro/login to /pro/perfil', async () => {
    const res = await runMiddleware('/pro/login', true)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch('/pro/perfil')
  })

  it('/pro/login is reachable without a session', async () => {
    const res = await runMiddleware('/pro/login', false)
    expect(res.status).not.toBe(307)
  })

  it('/pro/set-password is reachable without a session (verifyOtp runs client-side)', async () => {
    const res = await runMiddleware('/pro/set-password', false)
    expect(res.status).not.toBe(307)
  })

  it('/api/pro/forgot-password is reachable without a session', async () => {
    const res = await runMiddleware('/api/pro/forgot-password', false)
    expect(res.status).not.toBe(307)
  })
})

// ── Prefix-collision regression ───────────────────────────────────────────────

describe('prefix-collision regression: /profesionales is public', () => {
  it('/profesionales is NOT redirected without a session', async () => {
    const res = await runMiddleware('/profesionales', false)
    expect(res.status).not.toBe(307)
  })

  it('/profesionales/registro is NOT redirected without a session', async () => {
    const res = await runMiddleware('/profesionales/registro', false)
    expect(res.status).not.toBe(307)
  })
})
