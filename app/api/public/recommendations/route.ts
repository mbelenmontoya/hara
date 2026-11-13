// Hara Vital - Public Recommendations Endpoint
// Purpose: Controlled public read of match recommendations (no direct anon RLS)
// Security: Uses service role, only returns whitelisted fields, validates tracking_code format, rate limited

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ratelimit } from '@/lib/rate-limit'
import { extractClientIP } from '@/lib/validation'
import { getAllPractices } from '@/lib/practices'
import { firstNameFromContext, toCartaPick, type CartaRecommendationRow } from '@/lib/carta'

export const runtime = 'nodejs'

// Rate limit configuration
const RATE_LIMIT = {
  limit: 30,
  window: '5 m' as const,
}

const PROFESSIONAL_COLUMNS =
  'slug, full_name, short_description, profile_image_url, city, country, online_only, modality, ranking_score, practices, specialties, price_range_min, price_range_max, currency, rating_average, rating_count, subscription_tier, tier_expires_at, whatsapp, show_whatsapp'

interface MatchRow {
  id: string
  tracking_code: string
  sent_at: string | null
  created_at: string
  leads: { additional_context: string | null } | null
}

type RecommendationRow = Omit<CartaRecommendationRow, 'professional'> & {
  professionals: (CartaRecommendationRow['professional'] & { rating_average: number | string | null }) | null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const trackingCode = searchParams.get('tracking_code')

  // Validate tracking_code format (M-<timestamp>-<6-char> pattern)
  if (!trackingCode || !/^M-\d{13}-[A-Z0-9]{6}$/.test(trackingCode)) {
    return NextResponse.json({ error: 'Invalid tracking_code format' }, { status: 400 })
  }

  // Rate limiting: Primary by IP, fallback to tracking_code-based
  // This ensures each client gets their own bucket, and if IP unavailable,
  // each tracking_code gets its own bucket (no shared "unknown" bucket)
  const clientIP = extractClientIP(req)
  const rateLimitKey = clientIP
    ? `recommendations:ip:${clientIP}`
    : `recommendations:tracking:${trackingCode}`

  try {
    const { success } = await ratelimit.limit(rateLimitKey, RATE_LIMIT)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }
  } catch (error) {
    // Production: rate limit failure is a critical error (fail-closed behavior in lib)
    // Dev/test: lib returns success with warning (fail-open)
    // If we're here in production, it means rate limiting failed catastrophically
    console.error('Rate limiting error:', error)
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
  }

  try {
    // Use service role to fetch data (controlled, no broad anon RLS)
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, tracking_code, sent_at, created_at, leads(additional_context)')
      .eq('tracking_code', trackingCode)
      .single<MatchRow>()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const [{ data: recommendations, error: recsError }, catalog] = await Promise.all([
      supabaseAdmin
        .from('match_recommendations')
        .select(`id, rank, reasons, attribution_token, professionals (${PROFESSIONAL_COLUMNS})`)
        .eq('match_id', match.id)
        .order('rank', { ascending: true })
        .returns<RecommendationRow[]>(),
      getAllPractices(),
    ])

    if (recsError) {
      console.error('Recommendations fetch error:', recsError)
      return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
    }

    // Whitelisted output: the first name only (never the lead note), and ready-to-render cards.
    const picks = (recommendations ?? [])
      .filter((rec) => rec.professionals)
      .map((rec) => {
        const p = rec.professionals as NonNullable<RecommendationRow['professionals']>
        const professional = {
          ...p,
          rating_average: p.rating_average == null ? null : Number(p.rating_average),
          rating_count: p.rating_count == null ? null : Number(p.rating_count),
        }
        return toCartaPick({ ...rec, professional }, catalog)
      })

    return NextResponse.json({
      tracking_code: match.tracking_code,
      carta: {
        first_name: firstNameFromContext(match.leads?.additional_context ?? null),
        sent_at: match.sent_at ?? match.created_at,
      },
      recommendations: picks,
    })
  } catch (error) {
    console.error('Public recommendations error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
