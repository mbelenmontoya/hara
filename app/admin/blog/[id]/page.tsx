// Admin, Blog Post Review (design 13). Opening it marks the note read.
// Server component: loads post + active professionals for the link dropdown.
// Body rendered via sanitizeBlogHtml (defense-in-depth on render).

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { notFound } from 'next/navigation'
import { AdminLayout } from '@/app/components/AdminLayout'
import Link from 'next/link'
import { ADMIN_BACK_LINK, AdminCard, AdminCardTitle, AdminError, EmptyText, StatusBadge, formatAdminDate } from '@/app/admin/components/AdminUI'
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
        <AdminError text="Error al cargar la nota" />
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

  const STATUS_BADGE: Record<string, string> = { submitted: 'Pendiente', published: 'Publicada', rejected: 'Rechazada' }

  return (
    <AdminLayout markRead={{ kind: 'blog', id }}>
      <Link href="/admin/blog" className={ADMIN_BACK_LINK}>
        ← Blog
      </Link>
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Sanitized preview */}
        <article className="min-w-0 rounded-[22px] bg-gray-50 px-[34px] py-[30px]">
          <p className="almanac-label">Vista previa</p>
          <h1 className="font-almanac-serif mb-0 mt-2.5 text-[38px] leading-[1.04]">{post.title}</h1>
          {post.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.cover_image_url} alt="Portada" className="mt-5 max-h-64 w-full rounded-xl object-cover" />
          )}
          <div className="prose prose-sm mt-5 max-w-none text-[16px] leading-[1.7] text-foreground" dangerouslySetInnerHTML={{ __html: safeBody }} />
          {post.secondary_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.secondary_image_url} alt="Imagen secundaria" className="mt-4 max-h-64 w-full rounded-xl object-cover" />
          )}
        </article>

        <div className="flex min-w-0 flex-col gap-3">
          <AdminCard>
            <div className="flex items-center gap-2.5">
              <AdminCardTitle>Autor</AdminCardTitle>
              <StatusBadge label={STATUS_BADGE[post.status] ?? post.status} />
            </div>
            <AuthorRow k="Autor" v={post.author_name} empty="Sin nombre" />
            <AuthorRow k="Email" v={post.author_email} empty="Sin email" />
            <AuthorRow k="Enviada" v={formatAdminDate(post.created_at)} empty="" />
          </AdminCard>

          {/* Link, approve and reject: client component */}
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
      </div>
    </AdminLayout>
  )
}

function AuthorRow({ k, v, empty }: { k: string; v: string | null; empty: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-foreground/8 py-[11px] text-[14.5px] leading-[1.45]">
      <span className="flex-none text-muted">{k}</span>
      <span className="min-w-0 break-words text-right">{v ? v : <EmptyText>{empty}</EmptyText>}</span>
    </div>
  )
}
