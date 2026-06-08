// Admin — Blog Post Review
// Server component: loads post + active professionals for the link dropdown.
// Body rendered via sanitizeBlogHtml (defense-in-depth on render).

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { notFound } from 'next/navigation'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Alert } from '@/app/components/ui/Alert'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sanitizeBlogHtml } from '@/lib/sanitize'
import { logError } from '@/lib/monitoring'
import { BlogReviewClient } from './BlogReviewClient'

interface Professional {
  id: string
  full_name: string
  slug: string
}

export default async function AdminBlogReviewPage({ params }: { params: { id: string } }) {
  const { id } = params

  // Load post
  const { data: post, error: postError } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title, body_html, excerpt, author_name, author_email, status, cover_image_url, secondary_image_url, professional_id, professional_link_confirmed, rejection_reason, created_at')
    .eq('id', id)
    .single()

  if (postError?.code === 'PGRST116' || (!postError && !post)) notFound()
  if (postError) {
    logError(new Error(postError.message), { source: 'AdminBlogReviewPage', id })
    return (
      <AdminLayout>
        <Alert variant="error">Error al cargar la nota</Alert>
      </AdminLayout>
    )
  }

  // Load active professionals for the link dropdown
  const { data: professionals } = await supabaseAdmin
    .from('professionals')
    .select('id, full_name, slug')
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  const safePros: Professional[] = (professionals ?? []) as Professional[]
  const safeBody = sanitizeBlogHtml(post.body_html)

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground truncate">{post.title}</h1>
          <a href="/admin/blog" className="text-sm text-muted hover:text-foreground shrink-0">
            ← Volver al listado
          </a>
        </div>

        {/* Sanitized preview */}
        <GlassCard>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Vista previa</p>
          {post.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.cover_image_url} alt="Portada" className="w-full max-h-64 object-cover rounded-xl mb-4" />
          )}
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: safeBody }}
          />
          {post.secondary_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.secondary_image_url} alt="Imagen secundaria" className="w-full max-h-64 object-cover rounded-xl mt-4" />
          )}
        </GlassCard>

        {/* Author info */}
        <GlassCard>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Autor</p>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted">Nombre: </span><span className="text-foreground font-medium">{post.author_name}</span></p>
            <p><span className="text-muted">Email: </span><span className="text-foreground">{post.author_email}</span></p>
            <p><span className="text-muted">Enviado: </span><span className="text-foreground">{new Date(post.created_at).toLocaleString('es-AR')}</span></p>
          </div>
        </GlassCard>

        {/* Review controls — client component */}
        <BlogReviewClient
          post={{
            id: post.id,
            status: post.status as 'submitted' | 'published' | 'rejected',
            professional_id: post.professional_id as string | null,
            professional_link_confirmed: post.professional_link_confirmed,
            rejection_reason: post.rejection_reason as string | null,
            author_name: post.author_name,
          }}
          professionals={safePros}
        />
      </div>
    </AdminLayout>
  )
}
