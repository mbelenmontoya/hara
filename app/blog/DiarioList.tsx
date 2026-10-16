// The Diario (blog) list in the almanac design (Claude Design 9e):
// serif title, the newest post as a large featured article, and the rest as hairline rows.

import Link from 'next/link'
import { EmptyState } from '@/app/components/ui/EmptyState'

const ISOTIPO_SRC = '/assets/logo/isotipo.png'

export interface DiarioListPost {
  slug: string
  title: string
  excerpt: string | null
  authorLabel: string
  isEditorial: boolean
  coverUrl: string | null
  minutes: number
}

function ReadingTime({ minutes }: { minutes: number }) {
  return <span className="almanac-label block text-muted">{minutes} min de lectura</span>
}

function Author({ post, className }: { post: DiarioListPost; className: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      {post.isEditorial && (
        <img src={ISOTIPO_SRC} alt="" aria-hidden="true" className="h-3.5 w-3.5 flex-none object-contain" />
      )}
      <span>{post.authorLabel}</span>
    </span>
  )
}

function FeaturedPost({ post }: { post: DiarioListPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="mt-[18px] block">
      {post.coverUrl && (
        <img src={post.coverUrl} alt="" className="h-[240px] w-full rounded-3xl object-cover" />
      )}
      <span className={`block ${post.coverUrl ? 'mt-3.5' : ''}`}>
        <ReadingTime minutes={post.minutes} />
      </span>
      <h2
        className="font-almanac-serif mb-0 mt-2 text-[32px] text-foreground"
        style={{ lineHeight: 1.05, letterSpacing: '-0.3px' }}
      >
        {post.title}
      </h2>
      {post.excerpt && (
        <span className="mt-2 block text-[15px] leading-[1.55] text-gray-700">{post.excerpt}</span>
      )}
      <Author post={post} className="mt-3 text-[13px] text-gray-700" />
    </Link>
  )
}

function PostRow({ post }: { post: DiarioListPost }) {
  return (
    <li className="border-b border-foreground/12">
      <Link href={`/blog/${post.slug}`} className="flex gap-3.5 py-4">
        {post.coverUrl && (
          <img src={post.coverUrl} alt="" className="h-[98px] w-[86px] flex-none rounded-2xl object-cover" />
        )}
        <span className="block min-w-0 flex-1">
          <ReadingTime minutes={post.minutes} />
          <h2
            className="font-almanac-serif mb-0 mt-1.5 text-[21px] text-foreground"
            style={{ lineHeight: 1.12, letterSpacing: 'normal' }}
          >
            {post.title}
          </h2>
          <Author post={post} className="mt-2 text-xs text-muted" />
        </span>
      </Link>
    </li>
  )
}

/**
 * The Diario list: featured newest post, then the others; empty state when nothing is published.
 */
export function DiarioList({ posts }: { posts: DiarioListPost[] }) {
  const [featured, ...rest] = posts

  return (
    <main className="min-h-screen bg-background font-almanac text-foreground">
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-8 md:max-w-xl">
        <h1
          className="font-almanac-serif mb-0 text-[44px] text-foreground"
          style={{ lineHeight: 1, letterSpacing: '-0.6px' }}
        >
          Diario
        </h1>
        <span className="mt-2 block text-[14.5px] leading-[1.5] text-gray-700">
          Perspectivas sobre bienestar holístico escritas por profesionales y personas de la comunidad de Hara.
        </span>

        {featured ? (
          <>
            <FeaturedPost post={featured} />
            {rest.length > 0 && (
              <ul className="mt-[22px] border-t border-foreground/12">
                {rest.map((post) => (
                  <PostRow key={post.slug} post={post} />
                ))}
              </ul>
            )}
            <Link
              href="/blog/escribir"
              className="mt-8 block text-center text-sm font-medium text-brand hover:underline"
            >
              ¿Tenés algo para compartir? Escribí una nota →
            </Link>
          </>
        ) : (
          <EmptyState
            title="Todavía no hay notas publicadas"
            description="Volvé pronto, la comunidad está escribiendo."
            action={
              <Link
                href="/blog/escribir"
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white"
              >
                Escribir una nota
              </Link>
            }
          />
        )}
      </div>
    </main>
  )
}
