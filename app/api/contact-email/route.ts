// Contact email capture endpoint
// Validates a reviewer's optional email and:
//   1. Returns 200 so the client can store it in localStorage.
//   2. Writes the email to event_data of the most recent direct contact_click
//      event for this session + professional within the last 5 minutes.
//      This handles the edge case where the user clicked WhatsApp BEFORE
//      submitting their email (sendBeacon already fired without email).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body requerido' }, { status: 400 })
  }

  const { professional_slug, email, session_id } = body as Record<string, unknown>

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  if (typeof professional_slug !== 'string' || !professional_slug.trim()) {
    return NextResponse.json({ error: 'professional_slug requerido' }, { status: 400 })
  }

  // Always return 200 (client stores in localStorage regardless).
  // The DB write is best-effort — a failure here must never block the user.
  if (typeof session_id === 'string' && session_id.trim()) {
    try {
      // Look up professional.id from slug
      const { data: pro } = await supabaseAdmin
        .from('professionals')
        .select('id')
        .eq('slug', professional_slug.trim())
        .single()

      if (pro) {
        // Find the most recent direct contact_click for this session+professional within 5 min
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { data: event } = await supabaseAdmin
          .from('events')
          .select('id, event_data')
          .eq('session_id', session_id.trim())
          .eq('professional_id', pro.id)
          .eq('event_type', 'contact_click')
          .gt('created_at', fiveMinAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (event) {
          const existingData = (event.event_data as Record<string, unknown>) ?? {}
          // Merge email into event_data (never overwrite other fields)
          await supabaseAdmin
            .from('events')
            .update({ event_data: { ...existingData, email: email.toLowerCase() } })
            .eq('id', event.id)
        }
      }
    } catch (err) {
      // Best-effort — log but don't fail the response
      logError(err instanceof Error ? err : new Error(String(err)), {
        source: 'POST /api/contact-email',
      })
    }
  }

  return NextResponse.json({ stored: true })
}
