// Admin Analytics API
// GET /api/admin/analytics           → summary: all professionals with event counts
// GET /api/admin/analytics?professional_id=<uuid>&days=30 → time series for one professional
//
// Auth: gated by middleware.ts for all /api/admin/* routes — no auth code needed here.
// Uses SECURITY DEFINER RPC functions from migration 019 for DB-level aggregation.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseDays(raw: string | null): number {
  const n = parseInt(raw ?? '30', 10)
  if (isNaN(n)) return 30
  return Math.min(90, Math.max(7, n))
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const professionalId = url.searchParams.get('professional_id')
  const days = parseDays(url.searchParams.get('days'))

  // ── Detail mode: time series for one professional ───────────────────────────
  if (professionalId !== null) {
    if (!UUID_RE.test(professionalId)) {
      return NextResponse.json({ error: 'Invalid professional_id' }, { status: 400 })
    }

    // Verify the professional exists and is active
    const { data: pro, error: proErr } = await supabaseAdmin
      .from('professionals')
      .select('id, full_name, slug')
      .eq('id', professionalId)
      .eq('status', 'active')
      .single()

    if (proErr || !pro) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Fetch day-by-day breakdown via DB aggregate (never fetches raw event rows)
    const { data: rows, error: rpcErr } = await supabaseAdmin.rpc('get_analytics_timeseries', {
      pro_id:      professionalId,
      cutoff_days: days,
    })

    if (rpcErr) {
      logError(new Error(rpcErr.message), { source: 'GET /api/admin/analytics (timeseries)' })
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    // Pivot (date, event_type, count) → { date, profile_view, whatsapp_click, instagram_click }
    const byDate: Record<string, { profile_view: number; whatsapp_click: number; instagram_click: number }> = {}
    for (const row of (rows ?? [])) {
      const d = typeof row.event_date === 'string'
        ? row.event_date
        : new Date(row.event_date).toISOString().slice(0, 10)

      if (!byDate[d]) byDate[d] = { profile_view: 0, whatsapp_click: 0, instagram_click: 0 }
      const count = Number(row.event_count)
      if (row.event_type === 'profile_view')    byDate[d].profile_view    += count
      if (row.event_type === 'whatsapp_click')  byDate[d].whatsapp_click  += count
      if (row.event_type === 'instagram_click') byDate[d].instagram_click += count
    }

    const timeSeries = Object.entries(byDate)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      professional: { id: pro.id, name: pro.full_name, slug: pro.slug },
      timeSeries,
    })
  }

  // ── Summary mode: all professionals with aggregated counts ──────────────────
  const { data: eventRows, error: rpcErr } = await supabaseAdmin.rpc('get_analytics_summary', {
    cutoff_days: days,
  })

  if (rpcErr) {
    logError(new Error(rpcErr.message), { source: 'GET /api/admin/analytics (summary)' })
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  // Collect distinct professional IDs from the event data
  const proIds = [...new Set((eventRows ?? []).map((r: { professional_id: string }) => r.professional_id))]

  // Fetch professional names and slugs in one query
  const { data: proData } = proIds.length > 0
    ? await supabaseAdmin
        .from('professionals')
        .select('id, full_name, slug')
        .in('id', proIds)
    : { data: [] }

  const proMap = Object.fromEntries(
    (proData ?? []).map((p: { id: string; full_name: string; slug: string }) => [p.id, p])
  )

  // Pivot (professional_id, event_type, count) → per-professional summary
  const summaryMap: Record<string, { profile_views: number; whatsapp_clicks: number; instagram_clicks: number }> = {}
  for (const row of (eventRows ?? [])) {
    const id = row.professional_id
    if (!summaryMap[id]) summaryMap[id] = { profile_views: 0, whatsapp_clicks: 0, instagram_clicks: 0 }
    const count = Number(row.event_count)
    if (row.event_type === 'profile_view')    summaryMap[id].profile_views    += count
    if (row.event_type === 'whatsapp_click')  summaryMap[id].whatsapp_clicks  += count
    if (row.event_type === 'instagram_click') summaryMap[id].instagram_clicks += count
  }

  const professionals = Object.entries(summaryMap)
    .map(([id, counts]) => {
      const pro = proMap[id]
      return {
        id,
        name: pro?.full_name ?? 'Desconocido',
        slug: pro?.slug ?? '',
        ...counts,
      }
    })
    .sort((a, b) => b.profile_views - a.profile_views)

  return NextResponse.json({ professionals })
}
