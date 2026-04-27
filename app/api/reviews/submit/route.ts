// Review submission API
// POST: validates token, calls submit_review() RPC atomically (inserts review + consumes token),
//       returns 201 { review_id, professional_id } or 400 with friendly error message.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ratelimit } from '@/lib/rate-limit'
import { extractClientIP } from '@/lib/validation'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

const TOKEN_ERRORS: Record<string, string> = {
  invalid_token:         'Esta reseña no es válida.',
  token_consumed:        'Esta reseña ya fue enviada.',
  token_expired:         'El enlace de reseña venció.',
  review_already_exists: 'Esta reseña ya fue enviada.',
  invalid_rating:        'La calificación debe ser entre 1 y 5.',
}

export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body requerido' }, { status: 400 })
  }

  const { token, rating, text, reviewer_name } = body as Record<string, unknown>

  if (typeof token !== 'string' || !token.trim()) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  const numRating = Number(rating)
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return NextResponse.json({ error: 'La calificación debe ser entre 1 y 5' }, { status: 400 })
  }

  // Rate limit per IP — 5 submits per hour prevents spam
  const clientIP = extractClientIP(request)
  if (clientIP) {
    const { success } = await ratelimit.limit(`reviews:ip:${clientIP}`, { limit: 5, window: '1 h' })
    if (!success) return NextResponse.json({ error: 'Demasiados intentos. Intentá más tarde.' }, { status: 429 })
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('submit_review', {
      p_token:         token.trim(),
      p_rating:        numRating,
      p_text:          typeof text === 'string' && text.trim() ? text.trim() : null,
      p_reviewer_name: typeof reviewer_name === 'string' && reviewer_name.trim() ? reviewer_name.trim() : null,
    })

    if (error) {
      // Supabase may wrap Postgres RAISE messages (e.g. 'ERROR: P0001: invalid_token').
      // Use substring matching so the lookup is resilient to client-version differences.
      const matchedKey = Object.keys(TOKEN_ERRORS).find(k => error.message.includes(k))
      const friendlyMsg = matchedKey ? TOKEN_ERRORS[matchedKey] : TOKEN_ERRORS['invalid_token']
      logError(new Error(error.message), { source: 'POST /api/reviews/submit' })
      return NextResponse.json({ error: friendlyMsg }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'POST /api/reviews/submit' })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
