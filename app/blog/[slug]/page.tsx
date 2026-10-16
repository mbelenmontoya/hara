// Hara Vital: Diario (blog) article
// Public page. Only renders published posts; anything else → 404.
// body_html is sanitized at write time by POST /api/blog (sanitizeBlogHtml + DOMPurify).
// Professional link-back only shown when professional_link_confirmed=true (admin-confirmed).

export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'
import { nextPost, readingMinutes } from '@/lib/diario'
import { DiarioArticle, type DiarioArticleProps } from './DiarioArticle'

async function findConfirmedProfessional(
  professionalId: string | null,
  confirmed: boolean,
): Promise<DiarioArticleProps['professional']> {
  if (!professionalId || !confirmed) return null
  const { data: pro } = await supabaseAdmin
    .from('professionals')
    .select('slug, full_name, profile_image_url')
    .eq('id', professionalId)
    .eq('status', 'active')
    .single()
  if (!pro) return null
  return { slug: pro.slug, fullName: pro.full_name, imageUrl: pro.profile_image_url ?? null }
}

async function findNextPost(slug: string): Promise<DiarioArticleProps['next']> {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('slug, title')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  if (error) {
    logError(new Error(error.message), { source: 'BlogPostPage.next', slug })
    return null
  }
  return nextPost(data ?? [], slug)
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { slug } = params

  const { data: post, error } = await supabaseAdmin
    .from('blog_posts')
    .select('slug, title, body_html, cover_image_url, secondary_image_url, author_name, professional_id, professional_link_confirmed, is_hara_editorial')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error?.code === 'PGRST116' || (!error && !post)) notFound()
  if (error) {
    logError(new Error(error.message), { source: 'BlogPostPage', slug })
    notFound()
  }

  const [professional, next] = await Promise.all([
    findConfirmedProfessional(post.professional_id, post.professional_link_confirmed),
    findNextPost(slug),
  ])

  // body_html is pre-sanitized at storage time by POST /api/blog
  const bodyHtml = post.body_html ?? ''

  return (
    <DiarioArticle
      title={post.title}
      bodyHtml={bodyHtml}
      minutes={readingMinutes(bodyHtml)}
      coverUrl={post.cover_image_url}
      secondaryImageUrl={post.secondary_image_url}
      authorLabel={post.is_hara_editorial ? 'Hara Vital' : post.author_name}
      isEditorial={post.is_hara_editorial}
      professional={professional}
      next={next}
    />
  )
}
