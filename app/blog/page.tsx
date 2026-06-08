// Hara Vital — Blog Index
// Public listing of published blog posts, newest first.
// Only published posts are shown; admin-approved only.

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { EmptyState } from '@/app/components/ui/EmptyState'

export const metadata = {
  title: 'Notas de la comunidad | Hara Vital',
  description: 'Perspectivas sobre bienestar holístico de la comunidad de Hara.',
}

interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  author_name: string
  cover_image_url: string | null
  published_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function BlogIndexPage() {
  const { data } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title, excerpt, author_name, cover_image_url, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const posts: BlogPost[] = (data ?? []) as BlogPost[]

  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 container-public pt-8 pb-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Blog</p>
        <h1 className="text-3xl font-semibold text-foreground leading-tight mb-3">
          Notas de la comunidad
        </h1>
        <p className="text-base text-muted leading-relaxed mb-8">
          Perspectivas sobre bienestar holístico escritas por profesionales y personas de la comunidad de Hara.
        </p>

        {posts.length === 0 ? (
          <EmptyState
            title="Todavía no hay notas publicadas"
            description="Volvé pronto — la comunidad está escribiendo."
            action={
              <Link
                href="/blog/escribir"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium bg-brand text-white rounded-full"
              >
                Escribir una nota
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {posts.map(post => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                  <GlassCard>
                    <div className="flex gap-4 items-start">
                      {post.cover_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.cover_image_url}
                          alt=""
                          className="w-20 h-20 object-cover rounded-xl shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-foreground group-hover:text-brand transition-colors leading-snug mb-1">
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-2">
                            {post.excerpt}
                          </p>
                        )}
                        <p className="text-xs text-muted">
                          por {post.author_name} · {post.published_at ? formatDate(post.published_at) : ''}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/blog/escribir"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
              >
                ¿Tenés algo para compartir? Escribí una nota →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
