// Hará Match - Admin Match Creation API (Production-Grade Atomic)
// Purpose: Create match with 3 distinct professionals + signed attribution tokens
// Security: Admin-only, fully atomic via PostgreSQL RPC
// Atomicity: Pre-generates match_id + tokens, RPC inserts all in single transaction

import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createAttributionToken } from '@/lib/attribution-tokens'
import { generateTrackingCode } from '@/lib/tracking-code'
import { getAdminUserId } from '@/lib/admin-auth'

export const runtime = 'nodejs'

interface RecommendationInput {
  professional_id: string
  rank: number
  reasons: string[]
}

interface CreateMatchRequest {
  lead_id: string
  recommendations: RecommendationInput[]
}

export async function POST(req: Request) {
  // Check admin auth
  const adminUserId = getAdminUserId()
  if (typeof adminUserId === 'object') {
    return NextResponse.json({ error: adminUserId.error }, { status: adminUserId.status })
  }

  try {
    const body: CreateMatchRequest = await req.json()

    // Validate input
    if (!body.lead_id || !body.recommendations || body.recommendations.length !== 3) {
      return NextResponse.json({ error: 'lead_id and 3 recommendations required' }, { status: 400 })
    }

    // Validate distinct professionals
    const professionalIds = body.recommendations.map(r => r.professional_id)
    if (new Set(professionalIds).size !== 3) {
      return NextResponse.json({ error: '3 distinct professionals required' }, { status: 400 })
    }

    // Validate ranks
    const ranks = body.recommendations.map(r => r.rank).sort()
    if (JSON.stringify(ranks) !== JSON.stringify([1, 2, 3])) {
      return NextResponse.json({ error: 'Ranks must be 1, 2, 3' }, { status: 400 })
    }

    // Pre-generate match_id (crypto-safe UUID)
    const matchId = randomUUID()

    // Generate crypto-safe tracking code
    const trackingCode = generateTrackingCode()

    // Generate attribution tokens with real match_id
    const tokensWithTokens = await Promise.all(
      body.recommendations.map(async (rec) => {
        const token = await createAttributionToken({
          match_id: matchId,  // Pre-generated UUID
          professional_id: rec.professional_id,
          lead_id: body.lead_id,
          tracking_code: trackingCode,
          rank: rec.rank,
        })

        return {
          professional_id: rec.professional_id,
          rank: rec.rank,
          reasons: rec.reasons,
          attribution_token: token,  // Real signed JWT
        }
      })
    )

    // Call atomic RPC (single transaction: match + 3 recs with tokens)
    const { data, error } = await supabaseAdmin.rpc('create_match_with_recommendations_atomic', {
      p_match_id: matchId,
      p_lead_id: body.lead_id,
      p_tracking_code: trackingCode,
      p_recommendations: tokensWithTokens,
    })

    if (error) {
      console.error('Atomic match creation failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = data as { match_id: string; tracking_code: string }

    return NextResponse.json({
      success: true,
      match_id: result.match_id,
      tracking_code: result.tracking_code,
      recommendations: tokensWithTokens.map(rec => ({
        professional_id: rec.professional_id,
        rank: rec.rank,
        attribution_token: rec.attribution_token,
      })),
    })
  } catch (error) {
    console.error('Match creation error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
