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

const ADMIN_EMAIL = 'admin@hara.com'
const PRO_EMAIL = 'pro@example.com'

function buildSession(email: string | null) {
  const response = makeResponse()
  return {
    response,
    user: email ? { id: 'user-123', email } : null,
  }
}

function makeReq(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`)
}

// ── Helper: run middleware and extract redirect target ────────────────────────

// withUser true signs in as the admin; a string signs in as that email
async function runMiddleware(path: string, withUser: boolean | string = false) {
  const email = withUser === true ? ADMIN_EMAIL : withUser || null
  mockUpdateSession.mockResolvedValue(buildSession(email))
  const { middleware } = await import('./middleware')
  const req = makeReq(path)
  return middleware(req)
}

beforeEach(() => {
  process.env.ADMIN_EMAILS = ADMIN_EMAIL
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

// ── /admin is for the admin only (ISSUES 18) ─────────────────────────────────

describe('/admin rejects signed-in users who are not the admin', () => {
  it('redirects a signed-in professional on /admin/leads to the login with no-access', async () => {
    const res = await runMiddleware('/admin/leads', PRO_EMAIL)
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location') ?? '')
    expect(location.pathname).toBe('/admin/login')
    expect(location.searchParams.get('error')).toBe('no-access')
  })

  it('returns 403 to a signed-in professional on /api/admin/leads', async () => {
    const res = await runMiddleware('/api/admin/leads', PRO_EMAIL)
    expect(res.status).toBe(403)
  })

  it('returns 403 to a signed-in professional on /api/debug', async () => {
    const res = await runMiddleware('/api/debug', PRO_EMAIL)
    expect(res.status).toBe(403)
  })

  it('shows /admin/login to a signed-in professional instead of redirecting (no loop)', async () => {
    const res = await runMiddleware('/admin/login', PRO_EMAIL)
    expect(res.status).not.toBe(307)
  })

  it('lets nobody in when ADMIN_EMAILS is empty', async () => {
    process.env.ADMIN_EMAILS = ''
    const res = await runMiddleware('/admin/leads', true)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch('/admin/login')
  })

  it('still lets a signed-in professional into /pro/perfil', async () => {
    const res = await runMiddleware('/pro/perfil', PRO_EMAIL)
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

  it('/registro is NOT redirected without a session', async () => {
    const res = await runMiddleware('/registro', false)
    expect(res.status).not.toBe(307)
  })
})
