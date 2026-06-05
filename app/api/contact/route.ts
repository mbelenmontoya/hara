// POST /api/contact
// Contact form from the /profesionales page footer.
// Validates name + email + message, rate-limits per IP, sends email notification.

import { NextRequest, NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { extractClientIP } from '@/lib/validation'
import { notifyContactForm } from '@/lib/email'
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

  const { name, email, message } = body as Record<string, unknown>

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  }

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
  }

  const clientIP = extractClientIP(request) ?? 'unknown'
  const { success } = await ratelimit.limit(`contact:ip:${clientIP}`)
  if (!success) {
    return NextResponse.json({ error: 'Demasiados intentos. Intentá más tarde.' }, { status: 429 })
  }

  try {
    await notifyContactForm(name.trim(), email.trim().toLowerCase(), message.trim())
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'POST /api/contact' })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
