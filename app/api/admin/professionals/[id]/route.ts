// Admin API — Single Professional
// GET: Fetch professional by UUID (all fields for review)
// PATCH: Update status (approve → 'active', reject → 'rejected' + reason)
// Security: Gated by middleware (requires admin session)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

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
  const { action, rejection_reason } = body as {
    action: string
    rejection_reason?: string
  }

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json(
      { error: 'Acción inválida. Usar "approve" o "reject".' },
      { status: 400 }
    )
  }

  // Verify the professional exists and is in a reviewable state
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('professionals')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: 'Profesional no encontrado' },
      { status: 404 }
    )
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
      console.error('Reject error:', updateError)
      return NextResponse.json(
        { error: 'Error al rechazar el perfil' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, status: 'rejected' })
  }

  // action === 'approve'
  const { error: updateError } = await supabaseAdmin
    .from('professionals')
    .update({
      status: 'active',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error('Approve error:', updateError)
    return NextResponse.json(
      { error: 'Error al aprobar el perfil' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, status: 'active' })
}
