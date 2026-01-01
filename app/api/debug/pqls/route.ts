// Hará Match - Debug PQLs List
// Purpose: Helper endpoint for admin UI to list PQL entries
// Security: Should be gated by middleware in production

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('pqls')
      .select(`
        id,
        professional_id,
        billing_month,
        created_at,
        professionals (
          full_name,
          slug
        )
      `)
      .order('billing_month', { ascending: false })
      .limit(100)

    if (error) {
      console.error('PQL fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to match UI expectations
    const entries = (data || []).map((entry: any) => ({
      id: entry.id,
      professional_id: entry.professional_id,
      month: entry.billing_month,
      created_at: entry.created_at,
      professional: {
        name: entry.professionals?.full_name || 'Unknown',
        slug: entry.professionals?.slug || '',
      },
    }))

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Debug PQLs error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
