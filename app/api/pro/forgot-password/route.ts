// POST /api/pro/forgot-password
// Sends a branded recovery link to active professionals.
// Always returns 200 — never reveals whether the email exists (no enumeration).
// Only active professionals receive links; submitted/rejected accounts cannot set passwords.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateProAccessLink } from '@/lib/pro-invite'
import { notifyProPasswordReset } from '@/lib/email'
import { ratelimit } from '@/lib/rate-limit'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

const GENERIC_SUCCESS = { message: 'Si hay una cuenta con ese email, te enviamos un enlace en breve.' }

export async function POST(request: NextRequest) {
  // Rate-limit by IP
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const { success } = await ratelimit.limit(`pro-forgot-password:${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Demasiados intentos. Intentá de nuevo en unos minutos.' }, { status: 429 })
  }

  let email: string | undefined
  try {
    const body = await request.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined
  } catch {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  try {
    // Only active professionals can reset passwords — unapproved accounts never get access
    const { data: pro } = await supabaseAdmin
      .from('professionals')
      .select('id')
      .eq('email', email)
      .eq('status', 'active')
      .maybeSingle()

    if (pro?.id) {
      const accessLink = await generateProAccessLink({ email, professionalId: pro.id })
      if (accessLink) {
        // Fire-and-forget — email failure must not change the response
        notifyProPasswordReset({ to: email, setupUrl: accessLink.setupUrl }).catch(() => {})
      }
    }
    // Always return the generic message regardless of whether the email matched
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'POST /api/pro/forgot-password' })
    // Still return generic success — never expose internal errors that could leak enumeration info
  }

  return NextResponse.json(GENERIC_SUCCESS)
}
