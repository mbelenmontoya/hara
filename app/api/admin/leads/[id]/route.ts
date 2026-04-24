import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

interface MatchRecommendation {
  rank: number
  professionals: { full_name: string; slug: string }[]
}

interface MatchRow {
  id: string
  tracking_code: string
  created_at: string
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
  matches: MatchRow[]
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select(`
        id, email, whatsapp, country, city, intent_tags, status, urgency, created_at,
        matches (
          id,
          tracking_code,
          created_at,
          match_recommendations (
            rank,
            professionals (full_name, slug)
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const lead = data as unknown as LeadRow
    const matches = (lead.matches ?? [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((match) => ({
        id: match.id,
        tracking_code: match.tracking_code,
        created_at: match.created_at,
        professionals: (match.match_recommendations ?? [])
          .sort((a, b) => a.rank - b.rank)
          .map((rec) => ({
            rank: rec.rank,
            name: rec.professionals?.[0]?.full_name ?? 'Desconocido',
            slug: rec.professionals?.[0]?.slug ?? '',
          })),
      }))

    return NextResponse.json({
      lead: {
        id: lead.id,
        email: lead.email,
        whatsapp: lead.whatsapp,
        country: lead.country,
        city: lead.city,
        intent_tags: lead.intent_tags ?? [],
        status: lead.status,
        urgency: lead.urgency,
        created_at: lead.created_at,
        latest_match: matches[0] ?? null,
        match_count: matches.length,
      },
    })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'GET /api/admin/leads/[id]' })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
