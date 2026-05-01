// Admin API — Single Professional
// GET:    Fetch professional by UUID (all fields for review)
// PATCH:  Update status (approve → 'active', reject → 'rejected' + reason)
//         Accepts optional `specialties` array for editing before/alongside approval.
//         Specialty-only updates (no `action`) work regardless of profile status.
// DELETE: Permanently remove the professional and dependent rows.
//         Order: pqls (FK without cascade — must go first) → professional
//         (cascade clears match_recommendations, subscription_payments, reviews,
//         review_requests). events have no FK so they remain as orphan analytics.
// Security: Gated by middleware (requires admin session)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

function validateSpecialties(specialties: unknown): string | null {
  if (!Array.isArray(specialties)) return 'specialties debe ser un array'
  if (specialties.length === 0) return 'specialties no puede estar vacío'
  for (const s of specialties) {
    if (typeof s !== 'string') return 'specialties debe contener solo strings'
    if (s.trim().length < 1 || s.trim().length > 50) return 'Cada especialidad debe tener entre 1 y 50 caracteres'
  }
  return null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('professionals')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Profesional no encontrado' },
      { status: 404 }
    )
  }

  return NextResponse.json({ professional: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  const body = await request.json()
  const { action, rejection_reason, specialties } = body as {
    action?: string
    rejection_reason?: string
    specialties?: unknown
  }

  // Validate specialties if provided
  if (specialties !== undefined) {
    const specialtiesError = validateSpecialties(specialties)
    if (specialtiesError) {
      return NextResponse.json({ error: specialtiesError }, { status: 400 })
    }
  }

  // Specialty-only update — no action, bypass status check
  if (!action && specialties !== undefined) {
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('professionals')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('professionals')
      .update({ specialties: (specialties as string[]).map(s => s.trim()), updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar especialidades' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // Action-based update (approve / reject) — requires submitted status
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json(
      { error: 'Acción inválida. Usar "approve" o "reject".' },
      { status: 400 }
    )
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('professionals')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
  }

  if (existing.status !== 'submitted') {
    return NextResponse.json(
      { error: `No se puede revisar un perfil con estado "${existing.status}"` },
      { status: 409 }
    )
  }

  if (action === 'reject') {
    if (!rejection_reason || rejection_reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un motivo de rechazo' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('professionals')
      .update({
        status: 'rejected',
        rejection_reason: rejection_reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Error al rechazar el perfil' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: 'rejected' })
  }

  // action === 'approve'
  const updatePayload: Record<string, unknown> = {
    status: 'active',
    rejection_reason: null,
    updated_at: new Date().toISOString(),
  }
  if (specialties !== undefined) {
    updatePayload.specialties = (specialties as string[]).map(s => s.trim())
  }

  const { error: updateError } = await supabaseAdmin
    .from('professionals')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Error al aprobar el perfil' }, { status: 500 })
  }

  return NextResponse.json({ success: true, status: 'active' })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  // Confirm the professional exists before doing destructive work.
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('professionals').select('id').eq('id', id).single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
  }

  // 1. pqls — FK without ON DELETE CASCADE, must be removed first.
  const { error: pqlsError } = await supabaseAdmin
    .from('pqls').delete().eq('professional_id', id)

  if (pqlsError) {
    logError(new Error(pqlsError.message), { source: 'DELETE /api/admin/professionals/[id]', step: 'pqls', id })
    return NextResponse.json({ error: 'Error al eliminar pqls del profesional' }, { status: 500 })
  }

  // 2. professional — cascade handles match_recommendations, subscription_payments,
  //    reviews, review_requests via ON DELETE CASCADE FKs.
  const { error: deleteError } = await supabaseAdmin
    .from('professionals').delete().eq('id', id)

  if (deleteError) {
    logError(new Error(deleteError.message), { source: 'DELETE /api/admin/professionals/[id]', step: 'professional', id })
    return NextResponse.json({ error: 'Error al eliminar el profesional' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
