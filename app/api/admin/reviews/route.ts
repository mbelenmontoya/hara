// Admin API — Reviews list
// GET: all reviews with professional name joined, ordered by submitted_at DESC
// Security: Gated by middleware (requires admin session)

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

export async function GET(_request: Request) {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('id, professional_id, rating, text, reviewer_name, submitted_at, is_hidden, professionals(full_name)')
      .order('submitted_at', { ascending: false })

    if (error) {
      logError(new Error(error.message), { source: 'GET /api/admin/reviews' })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const reviews = (data ?? []).map((r) => {
      const prof = Array.isArray(r.professionals) ? r.professionals[0] : r.professionals as { full_name?: string } | null
      return {
        id:               r.id,
        professional_id:  r.professional_id,
        professional_name: prof?.full_name ?? '—',
        rating:           r.rating,
        text:             r.text,
        reviewer_name:    r.reviewer_name,
        submitted_at:     r.submitted_at,
        is_hidden:        r.is_hidden,
      }
    })

    return NextResponse.json({ reviews })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'GET /api/admin/reviews' })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
