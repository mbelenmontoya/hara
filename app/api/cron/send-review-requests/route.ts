// Daily cron — send review-request emails to contacts from 7 days ago
//
// Auth: Bearer CRON_SECRET header (same pattern as /api/cron/expire-destacado)
// Schedule: vercel.json sets this to run daily at 07:00 UTC (04:00 ART)
//
// Logic: calls select_pending_review_events() RPC to find eligible contacts,
//   generates a 30-day single-use token per event, inserts review_requests,
//   sends Resend email. Email failures do NOT insert a review_requests row
//   (so the next day's cron can retry via the UNIQUE ON contact_event_id).
//
// IMPORTANT: Verify CRON_SECRET is set in Vercel environment variables
//   (Production + Preview). On Vercel Hobby, cron jobs do not fire and the
//   Bearer header is NOT injected — use curl as a fallback.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyReviewRequest } from '@/lib/email'
import { logError } from '@/lib/monitoring'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hara-weld.vercel.app'

type PendingEvent = {
  event_id:          string
  professional_id:   string
  email:             string
  professional_name: string
  professional_slug: string
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || cronSecret.trim().length === 0) {
    logError(new Error('CRON_SECRET not configured'), { source: 'GET /api/cron/send-review-requests' })
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch eligible contact_click events (7-day window, has email, no existing review_request)
  const { data: events, error: rpcErr } = await supabaseAdmin
    .rpc('select_pending_review_events') as { data: PendingEvent[] | null; error: unknown }

  if (rpcErr) {
    logError(rpcErr instanceof Error ? rpcErr : new Error(String(rpcErr)), {
      source: 'GET /api/cron/send-review-requests — rpc',
    })
    return NextResponse.json({ error: 'Failed to fetch pending events' }, { status: 500 })
  }

  const pending = events ?? []
  let sent = 0
  const skipped: string[] = []

  for (const evt of pending) {
    const token     = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const link      = `${APP_URL}/r/review/${token}`

    // INSERT review_requests row FIRST — only send email if insert succeeds.
    // Rationale: if email sends but INSERT fails, the next cron run re-sends the email
    // (double-email). Insert-first prevents that: a failed INSERT keeps the event
    // retryable on the next run; a successful INSERT blocks future duplicates via UNIQUE
    // on contact_event_id, so email failures leave an undelivered row (acceptable tradeoff).
    const { error: insertErr } = await supabaseAdmin
      .from('review_requests')
      .insert({
        professional_id:   evt.professional_id,
        contact_event_id:  evt.event_id,
        email:             evt.email,
        token,
        expires_at:        expiresAt,
      })
      .select('id')
      .single()

    if (insertErr) {
      logError(new Error(insertErr instanceof Error ? insertErr.message : String(insertErr)), {
        source: 'GET /api/cron/send-review-requests — insert',
        event_id: evt.event_id,
      })
      skipped.push(evt.event_id)
      continue
    }

    // Send email after row is committed
    const emailSent = await notifyReviewRequest({
      to:               evt.email,
      professionalName: evt.professional_name,
      link,
    })

    if (!emailSent) {
      // Row exists so no double-email on retry; log for manual follow-up
      logError(new Error('Review request email failed to send'), {
        source: 'GET /api/cron/send-review-requests — email',
        event_id: evt.event_id,
      })
      skipped.push(evt.event_id)
      continue
    }

    sent++
  }

  return NextResponse.json({ sent, skipped: skipped.length, skipped_ids: skipped })
}
