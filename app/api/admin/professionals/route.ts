// Admin API — Professionals List
// GET: Fetch all professionals for admin list view
// Security: Gated by middleware (requires admin session)

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('professionals')
      .select('id, slug, full_name, specialties, status, country, city, email, created_at, subscription_tier, tier_expires_at')
      .order('created_at', { ascending: false })

    if (error) {
      logError(new Error(error.message), { source: 'GET /api/admin/professionals' })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const professionals = (data || []).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.full_name,
      specialties: Array.isArray(p.specialties) ? p.specialties : [],
      status: p.status,
      country: p.country,
      city: p.city,
      email: p.email,
      created_at: p.created_at,
      subscription_tier: p.subscription_tier ?? 'basico',
      tier_expires_at: p.tier_expires_at ?? null,
    }))

    return NextResponse.json({ professionals })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'GET /api/admin/professionals' })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
