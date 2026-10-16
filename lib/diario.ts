// Small helpers for the Diario (blog) pages: reading time and the "Seguí leyendo" pick.

const WORDS_PER_MINUTE = 200

/** Minutes to read an article's HTML, rounded up, never less than 1. */
export function readingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ')
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

/** The post after `slug` in a newest-first list, wrapping to the first; null if there is no other post. */
export function nextPost<T extends { slug: string }>(posts: readonly T[], slug: string): T | null {
  if (posts.length < 2) return null
  const index = posts.findIndex((post) => post.slug === slug)
  if (index === -1) return null
  return posts[(index + 1) % posts.length]
}
