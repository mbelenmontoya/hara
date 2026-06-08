// Hara Vital — Blog Post Detail
// Public page. Only renders published posts; anything else → 404.
// body_html is sanitized at write time by POST /api/blog (sanitizeBlogHtml + DOMPurify).
// Professional link-back only shown when professional_link_confirmed=true (admin-confirmed).

export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { logError } from '@/lib/monitoring'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { slug } = params

  const { data: post, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title, body_html, cover_image_url, secondary_image_url, author_name, published_at, professional_id, professional_link_confirmed, is_hara_editorial')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error?.code === 'PGRST116' || (!error && !post)) notFound()
  if (error) {
    logError(new Error(error.message), { source: 'BlogPostPage', slug })
    notFound()
  }

  // body_html is pre-sanitized at storage time by POST /api/blog
  const safeBody = post.body_html ?? ''

  // Resolve professional for link-back — only when admin-confirmed
  let professional: { slug: string; full_name: string } | null = null
  if (post.professional_id && post.professional_link_confirmed) {
    const { data: pro } = await supabaseAdmin
      .from('professionals')
      .select('slug, full_name')
      .eq('id', post.professional_id)
      .eq('status', 'active')
      .single()
    if (pro) professional = pro
  }

  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 container-public pt-8 pb-16">
        {/* Breadcrumb */}
        <Link href="/blog" className="inline-flex items-center text-sm text-muted hover:text-foreground transition-colors mb-6">
          ← Notas de la comunidad
        </Link>

        {/* Cover image */}
        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt={`Portada: ${post.title}`}
            className="w-full max-h-80 object-cover rounded-3xl shadow-elevated mb-8"
          />
        )}

        {/* Title + meta */}
        <h1 className="text-3xl font-semibold text-foreground leading-tight mb-4">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-8">
          {post.is_hara_editorial ? (
            <span className="inline-flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo/isotipo.png" alt="Hara" className="w-4 h-4 object-contain" />
              <span className="font-medium text-foreground">Hara Vital</span>
            </span>
          ) : (
            <span>por <span className="font-medium text-foreground">{post.author_name}</span></span>
          )}
          {post.published_at && (
            <span>· {formatDate(post.published_at)}</span>
          )}
          {professional && (
            <Link
              href={`/p/${professional.slug}`}
              className="inline-flex items-center gap-1 text-brand font-medium hover:underline"
            >
              · Ver perfil de {professional.full_name} →
            </Link>
          )}
        </div>

        {/* Body */}
        <div
          className="prose prose-sm sm:prose max-w-none text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: safeBody }}
        />

        {/* Secondary image */}
        {post.secondary_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.secondary_image_url}
            alt="Imagen del post"
            className="w-full max-h-80 object-cover rounded-2xl shadow-elevated mt-8"
          />
        )}

        {/* Professional card (if confirmed link) */}
        {professional && (
          <div className="mt-10 liquid-glass rounded-2xl border border-outline/30 p-5 flex items-start gap-4">
            <div>
              <p className="text-xs text-muted mb-0.5">Escrito por</p>
              <p className="text-base font-semibold text-foreground">{professional.full_name}</p>
              <Link
                href={`/p/${professional.slug}`}
                className="text-sm text-brand hover:underline mt-1 inline-block"
              >
                Ver perfil en Hara →
              </Link>
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link href="/blog" className="text-sm text-muted hover:text-foreground transition-colors">
            ← Ver más notas
          </Link>
        </div>
      </div>
    </div>
  )
}
