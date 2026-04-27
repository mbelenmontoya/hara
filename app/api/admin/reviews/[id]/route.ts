// Admin API — Toggle review visibility
// PATCH { is_hidden: boolean }: updates review, trigger fires, aggregates recompute
// Security: Gated by middleware

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body requerido' }, { status: 400 })
  }

  const { is_hidden } = body as Record<string, unknown>
  if (typeof is_hidden !== 'boolean') {
    return NextResponse.json({ error: 'is_hidden debe ser boolean' }, { status: 400 })
  }

  try {
    const { error } = await supabaseAdmin
      .from('reviews')
      .update({ is_hidden })
      .eq('id', id)

    if (error) {
      logError(new Error(error.message), { source: 'PATCH /api/admin/reviews/[id]', id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_hidden })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'PATCH /api/admin/reviews/[id]' })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
