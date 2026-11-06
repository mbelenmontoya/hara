// Tests for route-protection middleware
// Covers: /admin gating (existing), /pro gating (new), public routes pass-through.
// NOTE: The prefix-collision regression test verifies that /profesionales and
// /registro are NOT gated: a bug-trap: startsWith('/pro') would
// match /profesionales.

import { describe, it, expect, vi, beforeEach } from 'vitest'
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

type Role = 'admin' | 'professional' | 'none'

// A signed-in user carries its role in app_metadata (set only by the server)
function buildSession(role: Role | false) {
  const response = makeResponse()
  if (role === false) return { response, user: null }
  const app_metadata = role === 'none' ? {} : { role }
  return { response, user: { id: 'user-123', email: `${role}@test.com`, app_metadata, user_metadata: {} } }
}

function makeReq(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`)
}

// ── Helper: run middleware and extract redirect target ────────────────────────

// withUser true signs in as the admin; a role string signs in with that role; false is signed out
async function runMiddleware(path: string, withUser: boolean | Role = false) {
  const role: Role | false = withUser === true ? 'admin' : withUser
  mockUpdateSession.mockResolvedValue(buildSession(role))
  const { middleware } = await import('./middleware')
  const req = makeReq(path)
  return middleware(req)
}

// The live site runs with NODE_ENV=production; a dev-only branch must not hide a failure here
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
})

// ── /admin routes (regression: must still work) ─────────────────────────────

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

// ── /admin is for the admin role only (ISSUES 18) ───────────────────────────

describe('/admin rejects signed-in users without the admin role', () => {
  it('redirects a signed-in professional on /admin/leads to the login with no-access', async () => {
    const res = await runMiddleware('/admin/leads', 'professional')
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location') ?? '')
    expect(location.pathname).toBe('/admin/login')
    expect(location.searchParams.get('error')).toBe('no-access')
  })

  it('returns 403 to a signed-in professional on /api/admin/leads', async () => {
    const res = await runMiddleware('/api/admin/leads', 'professional')
    expect(res.status).toBe(403)
  })

  it('returns 403 to a signed-in professional on /api/debug', async () => {
    const res = await runMiddleware('/api/debug', 'professional')
    expect(res.status).toBe(403)
  })

  it('returns 403 to a signed-in user with no role on /api/admin/leads', async () => {
    const res = await runMiddleware('/api/admin/leads', 'none')
    expect(res.status).toBe(403)
  })

  it('does not trust a role the user wrote into their own user_metadata', async () => {
    mockUpdateSession.mockResolvedValue({
      response: makeResponse(),
      user: { id: 'user-9', email: 'x@test.com', app_metadata: {}, user_metadata: { role: 'admin' } },
    })
    const { middleware } = await import('./middleware')
    const res = await middleware(makeReq('/api/admin/leads'))
    expect(res.status).toBe(403)
  })

  it('shows /admin/login to a signed-in professional instead of redirecting (no loop)', async () => {
    const res = await runMiddleware('/admin/login', 'professional')
    expect(res.status).not.toBe(307)
  })
})

// ── /pro routes (new behaviour) ───────────────────────────────────────────────

describe('/pro protection (new)', () => {
  it('redirects unauthenticated /pro/perfil to /pro/login', async () => {
    const res = await runMiddleware('/pro/perfil', false)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch('/pro/login')
  })

  it('lets a professional through to /pro/perfil', async () => {
    const res = await runMiddleware('/pro/perfil', 'professional')
    expect(res.status).not.toBe(307)
  })

  it('sends the admin from /pro/perfil to the admin', async () => {
    const res = await runMiddleware('/pro/perfil', 'admin')
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/admin/leads')
  })

  it('sends a signed-in user with no role from /pro/perfil to /pro/login', async () => {
    const res = await runMiddleware('/pro/perfil', 'none')
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/pro/login')
  })

  it('returns 403 to a user with no role on /api/pro/profile', async () => {
    const res = await runMiddleware('/api/pro/profile', 'none')
    expect(res.status).toBe(403)
  })

  it('returns 403 to the admin on /api/pro/profile', async () => {
    const res = await runMiddleware('/api/pro/profile', 'admin')
    expect(res.status).toBe(403)
  })

  it('redirects a professional on /pro/login to /pro/perfil', async () => {
    const res = await runMiddleware('/pro/login', 'professional')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch('/pro/perfil')
  })

  it('shows /pro/login to a signed-in user with no role (no loop)', async () => {
    const res = await runMiddleware('/pro/login', 'none')
    expect(res.status).not.toBe(307)
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

  it('/registro is NOT redirected without a session', async () => {
    const res = await runMiddleware('/registro', false)
    expect(res.status).not.toBe(307)
  })
})
