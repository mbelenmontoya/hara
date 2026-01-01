// Hará Match - Event Ingestion API
// Purpose: THE ONLY PATH for billing-critical contact_click events
// Security: Validates signed tokens, bypasses RLS with service role

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAttributionToken } from '@/lib/attribution-tokens'
import { ratelimit } from '@/lib/rate-limit'
import { extractClientIP, validateFingerprint, validateSessionId } from '@/lib/validation'

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || ''
  let body: any

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

  // Validate token (includes claim validation)
  const token = await verifyAttributionToken(body.attribution_token)
  if (!token) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
  }

  // Extract identifiers (never fail event)
  const clientIP = extractClientIP(req)
  const fingerprintHash = validateFingerprint(body.fingerprint_hash)
  const sessionId = validateSessionId(body.session_id)

  // Rate limiting (two-tier with fallback)
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

  // Insert via service role
  const { data, error } = await supabaseAdmin.from('events').insert({
    event_type: 'contact_click',
    match_id: token.match_id,
    professional_id: token.professional_id,
    lead_id: token.lead_id,
    tracking_code: token.tracking_code,
    fingerprint_hash: fingerprintHash,
    session_id: sessionId,
    ip_address: clientIP,
    user_agent: req.headers.get('user-agent'),
    referrer: req.headers.get('referer'),
    event_data: { ip_missing: !clientIP, fingerprint_valid: !!fingerprintHash },
  }).select().single()

  if (error) {
    console.error('Event insert failed:', error)
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, event_id: data.id })
}
