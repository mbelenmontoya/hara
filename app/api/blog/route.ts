// Hara Vital — Public Blog Submission API
// POST: Accept a blog post submission (multipart/form-data), validate and
//       sanitize it, generate a unique slug, auto-link to an active professional
//       by email match (tentative — confirmed only by admin), insert as
//       `submitted`, upload cover + optional secondary image, notify admin.
//
// Security: Rate-limited by IP. body_html sanitized before storage.
//           Professional email-link is tentative (professional_link_confirmed=false)
//           until an admin explicitly confirms in review.

import { NextRequest, NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ratelimit } from '@/lib/rate-limit'
import { sanitizeBlogHtml, htmlToExcerpt } from '@/lib/sanitize'
import { uploadBlogImage } from '@/lib/storage'
import { notifyNewBlogPost } from '@/lib/email'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

const MAX_BODY_CHARS = 50_000
const slugSuffix = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6)

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

export async function POST(request: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await ratelimit.limit(`blog-submit:ip:${ip}`, { limit: 3, window: '1 h' })
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intentá en una hora.' }, { status: 429 })
  }

  // ── Parse FormData ─────────────────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const title       = (formData.get('title') as string | null)?.trim() ?? ''
  const rawBodyHtml = (formData.get('body_html') as string | null) ?? ''
  const authorName  = (formData.get('author_name') as string | null)?.trim() ?? ''
  const authorEmail = (formData.get('author_email') as string | null)?.trim() ?? ''
  const coverFile   = formData.get('cover_image')
  const secondaryFile = formData.get('secondary_image')

  // ── Validate ──────────────────────────────────────────────────────────────────
  if (title.length < 4 || title.length > 140) {
    return NextResponse.json({ error: 'El título debe tener entre 4 y 140 caracteres.' }, { status: 400 })
  }

  if (!authorName) {
    return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 })
  }

  if (!validateEmail(authorEmail)) {
    return NextResponse.json({ error: 'El email no parece válido.' }, { status: 400 })
  }

  if (rawBodyHtml.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: 'El contenido es demasiado largo (límite: 50 000 caracteres).' }, { status: 400 })
  }

  if (!(coverFile instanceof File) || coverFile.size === 0) {
    return NextResponse.json({ error: 'La imagen de portada es requerida.' }, { status: 400 })
  }

  const bodyHtml = sanitizeBlogHtml(rawBodyHtml)
  if (!bodyHtml.trim()) {
    return NextResponse.json({ error: 'El contenido no puede estar vacío.' }, { status: 400 })
  }

  const excerpt = htmlToExcerpt(bodyHtml, 200)

  // ── Slug (unique) ─────────────────────────────────────────────────────────────
  // Use a nanoid suffix when the base slug is taken — avoids prefix-collision bugs
  // (e.g. 'reiki' and 'reiki-profundo' both match 'reiki%') and concurrent-submission
  // races that a counter approach can't handle without a retry loop.
  let slug = generateSlug(title)
  const { data: existing } = await supabaseAdmin
    .from('blog_posts')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${slugSuffix()}`
  }

  // ── Professional email match (tentative link) ──────────────────────────────────
  let professionalId: string | null = null
  const { data: matchedPro } = await supabaseAdmin
    .from('professionals')
    .select('id')
    .eq('email', authorEmail.toLowerCase())
    .eq('status', 'active')
    .maybeSingle()

  if (matchedPro?.id) {
    professionalId = matchedPro.id
  }

  // ── Insert blog post ──────────────────────────────────────────────────────────
  const { data: post, error: insertError } = await supabaseAdmin
    .from('blog_posts')
    .insert({
      slug,
      title,
      body_html: bodyHtml,
      excerpt,
      author_name: authorName,
      author_email: authorEmail.toLowerCase(),
      status: 'submitted',
      professional_id: professionalId,
      professional_link_confirmed: false,
    })
    .select('id, slug')
    .single()

  if (insertError || !post) {
    logError(new Error((insertError as { message?: string } | null)?.message ?? 'blog_posts insert failed'), {
      source: 'POST /api/blog',
    })
    return NextResponse.json({ error: 'Error al guardar la nota.' }, { status: 500 })
  }

  // ── Upload images (non-blocking) ───────────────────────────────────────────────
  const imageUpdates: Record<string, string> = {}

  const coverResult = await uploadBlogImage(coverFile, post.id, 'cover')
  if ('url' in coverResult) {
    imageUpdates.cover_image_url = coverResult.url
  } else {
    logError(new Error(coverResult.error), { source: 'POST /api/blog cover upload', postId: post.id })
  }

  if (secondaryFile instanceof File && secondaryFile.size > 0) {
    const secondaryResult = await uploadBlogImage(secondaryFile, post.id, 'secondary')
    if ('url' in secondaryResult) {
      imageUpdates.secondary_image_url = secondaryResult.url
    } else {
      logError(new Error(secondaryResult.error), { source: 'POST /api/blog secondary upload', postId: post.id })
    }
  }

  if (Object.keys(imageUpdates).length > 0) {
    await supabaseAdmin
      .from('blog_posts')
      .update(imageUpdates)
      .eq('id', post.id)
  }

  // ── Notify admin (fire and forget) ────────────────────────────────────────────
  notifyNewBlogPost({
    id: post.id,
    title,
    author_name: authorName,
    author_email: authorEmail,
  }).catch(() => {})

  return NextResponse.json({ success: true, slug: post.slug }, { status: 201 })
}
