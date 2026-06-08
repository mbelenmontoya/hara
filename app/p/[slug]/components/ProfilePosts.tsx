// ProfilePosts — shows a professional's published blog posts on their profile.
// Renders nothing when empty (no noise on profiles without posts).
// Only shows posts with professional_link_confirmed=true (query is done in page.tsx).

import Link from 'next/link'
import { GlassCard } from '@/app/components/ui/GlassCard'

interface Post {
  id: string
  slug: string
  title: string
  published_at: string | null
}

interface Props {
  posts: Post[]
  firstName: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ProfilePosts({ posts, firstName }: Props) {
  if (posts.length === 0) return null

  return (
    <GlassCard>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Notas de {firstName}
      </h2>
      <div className="flex flex-col gap-2">
        {posts.map(post => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group flex items-center justify-between gap-3 py-2 border-b border-outline last:border-0"
          >
            <span className="text-sm text-foreground group-hover:text-brand transition-colors leading-snug">
              {post.title}
            </span>
            {post.published_at && (
              <span className="text-xs text-muted shrink-0">{formatDate(post.published_at)}</span>
            )}
          </Link>
        ))}
      </div>
    </GlassCard>
  )
}
