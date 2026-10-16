// Hara Vital: Diario (blog) index
// Public listing of published blog posts, newest first, in the almanac design.
// Only published posts are shown; admin-approved only.

export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'
import { readingMinutes } from '@/lib/diario'
import { DiarioList, type DiarioListPost } from './DiarioList'

export const metadata = {
  title: 'Diario | Hara Vital',
  description: 'Perspectivas sobre bienestar holístico de la comunidad de Hara.',
}

interface BlogPostRow {
  slug: string
  title: string
  excerpt: string | null
  author_name: string
  cover_image_url: string | null
  body_html: string | null
  is_hara_editorial: boolean
}

function toListPost(row: BlogPostRow): DiarioListPost {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    authorLabel: row.is_hara_editorial ? 'Hara Vital' : row.author_name,
    isEditorial: row.is_hara_editorial,
    coverUrl: row.cover_image_url,
    minutes: readingMinutes(row.body_html ?? ''),
  }
}

export default async function BlogIndexPage() {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('slug, title, excerpt, author_name, cover_image_url, body_html, is_hara_editorial')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) logError(new Error(error.message), { source: 'BlogIndexPage' })

  const posts = ((data ?? []) as BlogPostRow[]).map(toListPost)

  return <DiarioList posts={posts} />
}
