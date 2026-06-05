// Hara Vital — Dismiss Practice Suggestion
// POST: removes a free-text specialty entry from every professional who has it.
//       Uses the dismiss_specialty_suggestion Postgres function (migration 014).
//       Case-insensitive — "PNL", "pnl", "Pnl" are all removed in one call.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminUserId } from '@/lib/admin-auth'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const adminUserId = getAdminUserId()
  if (typeof adminUserId === 'object') {
    return NextResponse.json({ error: adminUserId.error }, { status: adminUserId.status })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido (JSON)' }, { status: 400 })
  }

  const raw = (body as Record<string, unknown>)?.entry
  if (typeof raw !== 'string' || !raw.trim()) {
    return NextResponse.json({ error: '`entry` debe ser un string no vacío' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.rpc('dismiss_specialty_suggestion', {
    p_entry: raw.trim(),
  })

  if (error) {
    logError(new Error(error.message), {
      source: 'POST /api/admin/practices/dismiss',
      entry: raw.trim(),
    })
    return NextResponse.json({ error: 'Error al eliminar la sugerencia' }, { status: 500 })
  }

  revalidatePath('/admin/practices')
  return NextResponse.json({ success: true })
}
