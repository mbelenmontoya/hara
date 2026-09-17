// POST /api/admin/professionals/[id]/invite
// Re-sends the access invitation to an approved professional.
// Useful for professionals approved before the portal feature or who lost their link.
// Security: admin-gated by middleware (requires admin session).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateProAccessLink } from '@/lib/pro-invite'
import { notifyProfessionalApproved } from '@/lib/email'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  // Load the professional
  const { data: pro, error } = await supabaseAdmin
    .from('professionals')
    .select('id, email, full_name, slug')
    .eq('id', id)
    .single()

  if (error || !pro) {
    return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
  }

  // Generate the access link — returns null on failure
  const accessLink = await generateProAccessLink({
    email: pro.email,
    professionalId: pro.id,
  })

  if (!accessLink) {
    logError(new Error('generateProAccessLink returned null'), {
      source: 'POST /api/admin/professionals/[id]/invite',
      professionalId: id,
    })
    return NextResponse.json(
      { error: 'No se pudo generar el enlace de acceso. Intentá de nuevo.' },
      { status: 502 }
    )
  }

  // Re-send the approval email with the new access link (fire-and-forget)
  notifyProfessionalApproved({
    to: pro.email,
    full_name: pro.full_name,
    slug: pro.slug,
    setupUrl: accessLink.setupUrl,
  }).catch(() => {})

  return NextResponse.json({ success: true, kind: accessLink.kind })
}
