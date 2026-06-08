// Admin Blog — Single post PATCH (approve/reject/link)
// Protected by middleware (admin session required).
//
// State machine:
//   submitted → published (approve) | submitted → rejected (reject)
//   Re-approving published or re-rejecting rejected → 409 Conflict (no mutation)
//
// professional_id semantics:
//   absent/undefined → leave existing value unchanged
//   explicit null    → clear link (professional_id=null, professional_link_confirmed=false)
//   UUID string      → set/replace link + set professional_link_confirmed=true (admin confirmed)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyBlogPostPublished, notifyBlogPostRejected } from '@/lib/email'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { action, rejection_reason, professional_id } =
    (body as Record<string, unknown>)

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Acción inválida. Usar: approve | reject' }, { status: 400 })
  }

  // Load the current post
  const { data: post, error: fetchError } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title, status, author_email, professional_id, professional_link_confirmed')
    .eq('id', id)
    .single()

  if (fetchError?.code === 'PGRST116' || (!fetchError && !post)) {
    return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
  }
  if (fetchError) {
    logError(new Error(fetchError.message), { source: 'PATCH /api/admin/blog/[id]', id })
    return NextResponse.json({ error: 'Error al cargar la nota' }, { status: 500 })
  }

  // State-machine guard — idempotency
  if (action === 'approve' && post.status === 'published') {
    return NextResponse.json({ error: 'La nota ya está publicada' }, { status: 409 })
  }
  if (action === 'reject' && post.status === 'rejected') {
    return NextResponse.json({ error: 'La nota ya está rechazada' }, { status: 409 })
  }

  // ── Build update payload ───────────────────────────────────────────────────

  // Resolve professional_id update:
  //   - absent/undefined → no change (keep existing)
  //   - null (explicit) → clear link
  //   - UUID string → set link + confirm it
  type UpdatePayload = {
    status: string
    published_at?: string
    updated_at?: string
    rejection_reason?: string
    professional_id?: string | null
    professional_link_confirmed?: boolean
  }
  const update: UpdatePayload = {
    status: action === 'approve' ? 'published' : 'rejected',
  }

  if (action === 'approve') {
    update.published_at = new Date().toISOString()
  }
  update.updated_at = new Date().toISOString()

  if (action === 'reject') {
    update.rejection_reason = typeof rejection_reason === 'string' ? rejection_reason.trim() : ''
  }

  if ('professional_id' in (body as object)) {
    if (professional_id === null) {
      update.professional_id = null
      update.professional_link_confirmed = false
    } else if (typeof professional_id === 'string' && professional_id) {
      // Validate that the professional exists
      const { data: pro, error: proErr } = await supabaseAdmin
        .from('professionals')
        .select('id')
        .eq('id', professional_id)
        .single()
      if (proErr?.code === 'PGRST116' || (!proErr && !pro)) {
        return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 400 })
      }
      if (proErr) {
        logError(new Error(proErr.message), { source: 'PATCH /api/admin/blog/[id] pro-lookup', id })
        return NextResponse.json({ error: 'Error al verificar el profesional' }, { status: 500 })
      }
      update.professional_id = professional_id
      update.professional_link_confirmed = true
    }
  }

  // Apply update
  const { error: updateError } = await supabaseAdmin
    .from('blog_posts')
    .update(update)
    .eq('id', id)

  if (updateError) {
    logError(new Error(updateError.message), { source: 'PATCH /api/admin/blog/[id]', id })
    return NextResponse.json({ error: 'Error al actualizar la nota' }, { status: 500 })
  }

  // ── Notify author (fire and forget) ───────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  if (action === 'approve') {
    notifyBlogPostPublished({
      to:    post.author_email,
      title: post.title,
      url:   `${baseUrl}/blog/${post.slug}`,
    }).catch(() => {})
  } else {
    notifyBlogPostRejected({
      to:     post.author_email,
      title:  post.title,
      reason: typeof rejection_reason === 'string' ? rejection_reason : '',
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
