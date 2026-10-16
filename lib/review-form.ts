// Shared pieces of the review link (/r/review/[token], design 9d): the "¿Qué fue cierto?" tags,
// the label under the stars, and the public name a review is shown with.

export interface ReviewTag {
  key: string
  label: string
}

/** The tags a person can mark as true about their session. Keys are what the database stores. */
export const REVIEW_TAGS: readonly ReviewTag[] = [
  { key: 'me-explico-todo', label: 'Me explicó todo antes' },
  { key: 'puntual', label: 'Puntual' },
  { key: 'me-senti-escuchada', label: 'Me sentí escuchada' },
  { key: 'precio-justo', label: 'Precio justo' },
  { key: 'espacio-tranquilo', label: 'Espacio tranquilo' },
  { key: 'volveria', label: 'Volvería' },
]

/** Label under the stars, indexed by the number of stars (0 = none picked yet). */
export const STAR_LABELS = ['Tocá para calificar', 'No me ayudó', 'Poco', 'Bien', 'Muy bien', 'Me cambió algo'] as const

const TAG_LABEL = new Map(REVIEW_TAGS.map((t) => [t.key, t.label]))

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)

/** "prueba claude" → "Prueba C."; a single name stays whole; blank → null. */
export function publicReviewerName(name: string | null | undefined): string | null {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return null
  const first = capitalize(words[0])
  if (words.length === 1) return first
  return `${first} ${words[words.length - 1].charAt(0).toUpperCase()}.`
}

/** Known tag keys without duplicates, [] when missing, or null when the value is not a list of known keys. */
export function cleanTagList(value: unknown): string[] | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return null
  if (!value.every((v) => typeof v === 'string' && TAG_LABEL.has(v))) return null
  return [...new Set(value as string[])]
}

/** Labels for stored tag keys, skipping any key that is no longer offered. */
export function tagLabels(keys: readonly string[]): string[] {
  return keys.flatMap((k) => {
    const label = TAG_LABEL.get(k)
    return label ? [label] : []
  })
}
