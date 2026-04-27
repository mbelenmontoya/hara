// Daily cleanup cron — expires Destacado tier for professionals past their tier_expires_at.
//
// Auth: This endpoint is NOT under /api/admin/* and is NOT gated by middleware.
//       It is protected ONLY by CRON_SECRET header check.
//       Vercel Pro automatically injects Authorization: Bearer ${CRON_SECRET}
//       on scheduled invocations when CRON_SECRET is set in Vercel environment variables.
//
// Schedule: vercel.json sets this to run daily at 06:00 UTC (03:00 ART).
//
// IMPORTANT: Verify CRON_SECRET is set in Vercel dashboard (Production + Preview)
//            before deploying. On Vercel Hobby plan, crons do not fire and the Bearer
//            header is NOT injected — use curl as a manual fallback:
//            curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/expire-destacado

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Server misconfiguration guard — refuse to process requests when the
  // CRON_SECRET env var is missing or empty. Without this guard, a missing
  // secret would build the expected token as "Bearer undefined" or "Bearer ",
  // either of which a determined caller could match.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || cronSecret.trim().length === 0) {
    logError(new Error('CRON_SECRET not configured'), { source: 'GET /api/cron/expire-destacado' })
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Verify cron secret (Bearer token)
  const authHeader = request.headers.get('Authorization')
  const expected   = `Bearer ${cronSecret}`

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Set subscription_tier = 'basico' and tier_expires_at = null for all
    // professionals whose Destacado tier has expired.
    // The BEFORE UPDATE trigger (recompute_ranking) fires per row and recomputes
    // ranking_score to exclude the tier contribution — ranking is always accurate.
    const { data, error } = await supabaseAdmin
      .from('professionals')
      .update({ subscription_tier: 'basico', tier_expires_at: null })
      .eq('subscription_tier', 'destacado')
      .lt('tier_expires_at', new Date().toISOString())
      .select('id')

    if (error) {
      logError(new Error(error.message), { source: 'GET /api/cron/expire-destacado' })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ids = (data ?? []).map((r: { id: string }) => r.id)
    return NextResponse.json({ updated: ids.length, ids })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'GET /api/cron/expire-destacado' })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
