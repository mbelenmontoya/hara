// POST /api/reviews/direct
// Open review submission from professional profile page — no token required.
// Requires email for identity validation and duplicate prevention (1 review per email per pro).
// Rate limited per IP. Inserts directly into reviews table (contact_event_id omitted).

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
    return NextResponse.json({ error: 'Body requerido' }, { status: 400 }) }

  const { professional_slug, rating, reviewer_name, reviewer_email, text } = body as Record<string, unknown>

  if (typeof professional_slug !== 'string' || !professional_slug.trim()) {
    return NextResponse.json({ error: 'Profesional requerido' }, { status: 400 })
  }

  const numRating = Number(rating)
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return NextResponse.json({ error: 'Calificación inválida' }, { status: 400 })
  }

  if (typeof reviewer_name !== 'string' || !reviewer_name.trim()) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  }

  if (typeof reviewer_email !== 'string' || !EMAIL_RE.test(reviewer_email.trim())) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  const normalizedEmail = reviewer_email.trim().toLowerCase()

  // Rate limit — 5 reviews per hour per IP; 'unknown' bucket throttles missing-header requests
  const clientIP = extractClientIP(request) ?? 'unknown'
  const { success } = await ratelimit.limit(`reviews-direct:ip:${clientIP}`)
  if (!success) {
    return NextResponse.json({ error: 'Demasiados intentos. Intentá más tarde.' }, { status: 429 })
  }

  try {
    // Look up professional
    const { data: pro, error: proError } = await supabaseAdmin
      .from('professionals')
      .select('id')
      .eq('slug', professional_slug.trim())
      .eq('status', 'active')
      .single()

    if (proError || !pro) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    // Duplicate prevention — one review per email per professional
    const { data: existing } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('professional_id', pro.id)
      .eq('reviewer_email', normalizedEmail)
      .eq('is_hidden', false)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Ya dejaste una reseña para este profesional.' }, { status: 409 })
    }

    // Insert review — contact_event_id omitted (nullable), AFTER INSERT trigger auto-updates aggregates
    const { error: insertError } = await supabaseAdmin
      .from('reviews')
      .insert({
        professional_id: pro.id,
        rating: numRating,
        text: typeof text === 'string' && text.trim() ? text.trim() : null,
        reviewer_name: reviewer_name.trim(),
        reviewer_email: normalizedEmail,
        is_hidden: false,
      })

    if (insertError) {
      logError(new Error(insertError.message), { source: 'POST /api/reviews/direct' })
      return NextResponse.json({ error: 'Error al guardar el comentario' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'POST /api/reviews/direct' })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
