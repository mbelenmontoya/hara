// Admin API — Leads List
// GET: Fetch all leads with match context (tracking code + matched professionals)
// Security: Gated by middleware (requires admin session)

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

interface MatchRecommendation {
  rank: number
  professionals: { full_name: string; slug: string }[]
}

interface Match {
  tracking_code: string
  match_recommendations: MatchRecommendation[]
}

interface LeadRow {
  id: string
  email: string | null
  whatsapp: string | null
  country: string
  city: string | null
  intent_tags: string[]
  status: string
  urgency: string | null
  created_at: string
  matches: Match[]
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select(`
        id, email, whatsapp, country, city, intent_tags, status, urgency, created_at,
        matches (
          tracking_code,
          match_recommendations (
            rank,
            professionals (full_name, slug)
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      logError(new Error(error.message), { source: 'GET /api/admin/leads' })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const leads = ((data as unknown as LeadRow[]) || []).map((lead) => {
      const match = lead.matches?.[0] ?? null
      const professionals = match
        ? (match.match_recommendations ?? [])
            .sort((a, b) => a.rank - b.rank)
            .map((rec) => ({
              rank: rec.rank,
              name: rec.professionals?.[0]?.full_name ?? 'Desconocido',
              slug: rec.professionals?.[0]?.slug ?? '',
            }))
        : []

      return {
        id: lead.id,
        email: lead.email,
        whatsapp: lead.whatsapp,
        country: lead.country,
        city: lead.city,
        intent_tags: lead.intent_tags ?? [],
        status: lead.status,
        urgency: lead.urgency,
        created_at: lead.created_at,
        match: match
          ? { tracking_code: match.tracking_code, professionals }
          : null,
      }
    })

    return NextResponse.json({ leads })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'GET /api/admin/leads' })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
