// Hará Match - Debug PQLs List
// Purpose: Helper endpoint for admin UI to list PQL entries
// Security: Should be gated by middleware in production

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('pql_ledger')
      .select(`
        id,
        professional_id,
        month,
        balance,
        created_at,
        professionals (
          full_name,
          slug
        )
      `)
      .order('month', { ascending: false })
      .limit(100)

    if (error) {
      console.error('PQL ledger fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to match UI expectations (rename full_name to name)
    const entries = (data || []).map((entry: any) => ({
      ...entry,
      professionals: {
        name: entry.professionals.full_name,
        slug: entry.professionals.slug,
      },
    }))

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Debug PQLs error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
