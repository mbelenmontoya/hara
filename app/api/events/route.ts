// Hará Match - Event Ingestion API
// Purpose: THE ONLY PATH for billing-critical contact_click events
// Security: Validates signed tokens (concierge) or professional slug (direct),
//           bypasses RLS with service role.
//
// Two branches:
//   1. Concierge: attribution_token present → verify JWT, existing billing path
//   2. Direct:    professional_slug present → look up professional, synthetic tracking_code
//
// If neither is present → 400

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAttributionToken } from '@/lib/attribution-tokens'
import { ratelimit } from '@/lib/rate-limit'
import { extractClientIP, validateFingerprint, validateSessionId } from '@/lib/validation'
import { logError } from '@/lib/monitoring'
import { nanoid } from 'nanoid'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || ''
  let body: Record<string, unknown>

  try {
    if (contentType.includes('text/plain')) {
      body = JSON.parse(await req.text())
    } else if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      return NextResponse.json({ error: 'Invalid Content-Type' }, { status: 415 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Extract shared identifiers (never fail event)
  const clientIP        = extractClientIP(req)
  const fingerprintHash = validateFingerprint(typeof body.fingerprint_hash === 'string' ? body.fingerprint_hash : undefined)
  const sessionId       = validateSessionId(typeof body.session_id === 'string' ? body.session_id : undefined)

  // ── Rate limiting ────────────────────────────────────────────────────────────
  if (clientIP) {
    const { success } = await ratelimit.limit(`contact_click:ip:${clientIP}`, { limit: 10, window: '1 m' })
    if (!success) return NextResponse.json({ error: 'Rate limit (IP)' }, { status: 429 })
  }
  if (fingerprintHash) {
    const { success } = await ratelimit.limit(`contact_click:fp:${fingerprintHash}`, { limit: 3, window: '5 m' })
    if (!success) return NextResponse.json({ error: 'Rate limit (fingerprint)' }, { status: 429 })
  } else if (sessionId) {
    const { success } = await ratelimit.limit(`contact_click:session:${sessionId}`, { limit: 5, window: '5 m' })
    if (!success) return NextResponse.json({ error: 'Rate limit (session)' }, { status: 429 })
  }

  // ── Branch 1: Concierge path — attribution_token present ────────────────────
  if (body.attribution_token) {
    const token = await verifyAttributionToken(body.attribution_token as string)
    if (!token) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin.from('events').insert({
      event_type:       'contact_click',
      match_id:         token.match_id,
      professional_id:  token.professional_id,
      lead_id:          token.lead_id,
      tracking_code:    token.tracking_code,
      fingerprint_hash: fingerprintHash,
      session_id:       sessionId,
      ip_address:       clientIP,
      user_agent:       req.headers.get('user-agent'),
      referrer:         req.headers.get('referer'),
      event_data:       { ip_missing: !clientIP, fingerprint_valid: !!fingerprintHash },
    }).select().single()

    if (error) {
      logError(new Error(error.message), { source: 'POST /api/events (concierge)' })
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, event_id: data.id })
  }

  // ── Branch 2: Direct profile contact — professional_slug present ─────────────
  if (body.professional_slug && typeof body.professional_slug === 'string') {
    const slug = body.professional_slug.trim()

    // Look up active professional by slug
    const { data: pro, error: proErr } = await supabaseAdmin
      .from('professionals')
      .select('id, status, slug')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (proErr || !pro) {
      return NextResponse.json({ error: 'Professional not found or inactive' }, { status: 404 })
    }

    // Synthesize tracking_code — format: "direct-{slug}-{nanoid(10)}"
    // This keeps events.tracking_code NOT NULL (column is required by the schema)
    // and makes direct contacts easy to identify in analytics.
    const trackingCode = `direct-${slug}-${nanoid(10)}`

    // Validate optional reviewer email (strip if invalid — never block the event)
    const rawEmail = typeof body.reviewer_email === 'string' ? body.reviewer_email : null
    const reviewerEmail = rawEmail && EMAIL_RE.test(rawEmail) ? rawEmail : null

    const { data, error } = await supabaseAdmin.from('events').insert({
      event_type:       'contact_click',
      professional_id:  pro.id,
      tracking_code:    trackingCode,
      attribution_token: null,
      match_id:         null,
      lead_id:          null,
      fingerprint_hash: fingerprintHash,
      session_id:       sessionId,
      ip_address:       clientIP,
      user_agent:       req.headers.get('user-agent'),
      referrer:         req.headers.get('referer'),
      event_data:       {
        ip_missing:         !clientIP,
        fingerprint_valid:  !!fingerprintHash,
        email:              reviewerEmail,
        direct_contact:     true,
      },
    }).select().single()

    if (error) {
      logError(new Error(error.message), { source: 'POST /api/events (direct)' })
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, event_id: data.id })
  }

  // ── Neither token nor slug ────────────────────────────────────────────────────
  // Returns 400 (not 403) — see plan Task 2 DoD note about the error code change.
  return NextResponse.json(
    { error: 'Provide either attribution_token (concierge) or professional_slug (direct)' },
    { status: 400 },
  )
}
