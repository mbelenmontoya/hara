// Admin — Upload profile image for a professional
// POST: Accepts multipart/form-data with `profile_image` file.
//       Uploads to Supabase Storage, updates profile_image_url in DB.
// Security: Admin-only via middleware.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { uploadProfileImage } from '@/lib/storage'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const file = formData.get('profile_image')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No se recibió ninguna imagen' }, { status: 400 })
  }

  // Confirm the professional exists
  const { data: pro, error: fetchError } = await supabaseAdmin
    .from('professionals')
    .select('id')
    .eq('id', id)
    .single()

  if (fetchError || !pro) {
    return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
  }

  const result = await uploadProfileImage(file, id)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('professionals')
    .update({ profile_image_url: result.url, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    logError(new Error(updateError.message), { source: 'POST /api/admin/professionals/[id]/image' })
    return NextResponse.json({ error: 'Error al guardar la URL de la imagen' }, { status: 500 })
  }

  return NextResponse.json({ url: result.url })
}
