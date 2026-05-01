// Waitlist submission API — public endpoint backing the homepage "Próximamente" form.
// Accepts { email, name? }. Idempotent on email (UNIQUE conflict → 200 OK so the
// UX is the same whether or not the visitor was already on the list).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ratelimit } from '@/lib/rate-limit'
import { extractClientIP } from '@/lib/validation'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body requerido' }, { status: 400 })
  }

  const { email, name } = body as Record<string, unknown>

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanName  = typeof name === 'string' && name.trim() ? name.trim() : null

  const clientIP = extractClientIP(request)
  if (clientIP) {
    const { success } = await ratelimit.limit(`waitlist:ip:${clientIP}`, { limit: 5, window: '1 h' })
    if (!success) {
      return NextResponse.json({ error: 'Demasiados intentos. Intentá más tarde.' }, { status: 429 })
    }
  }

  try {
    const { error } = await supabaseAdmin
      .from('waitlist')
      .insert({ email: cleanEmail, name: cleanName })

    // Postgres unique_violation = 23505. Treat as success (already on list).
    if (error && error.code !== '23505') {
      logError(new Error(error.message), { source: 'POST /api/waitlist' })
      return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'POST /api/waitlist' })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
