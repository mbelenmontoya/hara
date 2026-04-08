// Admin API — PQLs List
// GET: Fetch all PQL entries with professional info and tracking code
// Security: Gated by middleware (requires admin session)

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('pqls')
      .select(`
        id,
        professional_id,
        billing_month,
        tracking_code,
        created_at,
        professionals (full_name, slug)
      `)
      .order('billing_month', { ascending: false })
      .limit(200)

    if (error) {
      logError(new Error(error.message), { source: 'GET /api/admin/pqls' })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const entries = (data || []).map((entry) => {
      const prof = entry.professionals as unknown as { full_name: string; slug: string } | null
      return {
        id: entry.id,
        professional_id: entry.professional_id,
        month: entry.billing_month,
        tracking_code: entry.tracking_code,
        created_at: entry.created_at,
        professional: {
          name: prof?.full_name ?? 'Desconocido',
          slug: prof?.slug ?? '',
        },
      }
    })

    return NextResponse.json({ entries })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'GET /api/admin/pqls' })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
