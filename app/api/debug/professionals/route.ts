// Hará Match - Debug Professionals List
// Purpose: Helper endpoint for admin UI to list professionals
// Security: Should be gated by middleware in production

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('professionals')
      .select('id, slug, full_name, specialties, status')
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Professionals fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to match UI expectations (rename full_name to name, pick first specialty)
    const professionals = (data || []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      name: p.full_name,
      specialty: Array.isArray(p.specialties) ? p.specialties[0] : null,
      status: p.status,
    }))

    return NextResponse.json({ professionals })
  } catch (error) {
    console.error('Debug professionals error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
