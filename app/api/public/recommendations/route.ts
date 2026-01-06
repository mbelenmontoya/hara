// Hará Match - Public Recommendations Endpoint
// Purpose: Controlled public read of match recommendations (no direct anon RLS)
// Security: Uses service role, only returns whitelisted fields, validates tracking_code format, rate limited

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ratelimit } from '@/lib/rate-limit'
import { extractClientIP } from '@/lib/validation'

export const runtime = 'nodejs'

// Rate limit configuration
const RATE_LIMIT = {
  limit: 30,
  window: '5 m' as const,
}

interface Recommendation {
  id: string
  rank: number
  reasons: string[]
  attribution_token: string
  professional: {
    slug: string
    name: string
    specialty: string
    whatsapp: string
    bio?: string
    profile_image_url?: string
  }
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
      .select('id, lead_id, tracking_code')
      .eq('tracking_code', trackingCode)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Fetch recommendations with professional details
    const { data: recommendations, error: recsError } = await supabaseAdmin
      .from('match_recommendations')
      .select(`
        id,
        rank,
        reasons,
        attribution_token,
        professionals (
          slug,
          full_name,
          specialties,
          whatsapp,
          bio,
          profile_image_url
        )
      `)
      .eq('match_id', match.id)
      .order('rank', { ascending: true })

    if (recsError) {
      console.error('Recommendations fetch error:', recsError)
      return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
    }

    // Transform to safe output shape (rename full_name to name, extract first specialty from array)
    const safeRecommendations: Recommendation[] = (recommendations || []).map((rec: any) => ({
      id: rec.id,
      rank: rec.rank,
      reasons: rec.reasons || [],
      attribution_token: rec.attribution_token,
      professional: {
        slug: rec.professionals.slug,
        name: rec.professionals.full_name,
        specialty: rec.professionals.specialties?.[0] || 'General',
        whatsapp: rec.professionals.whatsapp,
        bio: rec.professionals.bio || undefined,
        profile_image_url: rec.professionals.profile_image_url || undefined,
      },
    }))

    return NextResponse.json({
      tracking_code: match.tracking_code,
      recommendations: safeRecommendations,
    })
  } catch (error) {
    console.error('Public recommendations error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
