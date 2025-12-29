// Hará Match - Public Recommendations Endpoint
// Purpose: Controlled public read of match recommendations (no direct anon RLS)
// Security: Uses service role, only returns whitelisted fields, validates tracking_code format

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

interface Recommendation {
  id: string
  rank: number
  reasons: string[]
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

  // Validate tracking_code format (alphanumeric, 8-16 chars)
  if (!trackingCode || !/^[a-zA-Z0-9]{8,16}$/.test(trackingCode)) {
    return NextResponse.json({ error: 'Invalid tracking_code format' }, { status: 400 })
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
        professionals (
          slug,
          full_name,
          specialty,
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

    // Transform to safe output shape (rename full_name to name)
    const safeRecommendations: Recommendation[] = (recommendations || []).map((rec: any) => ({
      id: rec.id,
      rank: rec.rank,
      reasons: rec.reasons || [],
      professional: {
        slug: rec.professionals.slug,
        name: rec.professionals.full_name,
        specialty: rec.professionals.specialty,
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
