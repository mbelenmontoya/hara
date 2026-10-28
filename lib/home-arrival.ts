// Data for the home page ("¿Cómo llegas hoy?"): turns the active professionals into the
// four most common curated specialties (the cards) and a ready-to-render row per professional.
// Specialties come from the practices catalog through resolveProfileSpecialties, never from free text.

import { SPECIALTY_MAP } from '@/lib/design-constants'
import { isEffectivelyDestacado } from '@/lib/ranking'
import { resolveProfileSpecialties } from '@/lib/profile-specialties'
import type { Practice } from '@/lib/practices'

const MAX_CARDS = 4

export interface HomeProfessional {
  slug: string
  full_name: string
  short_description: string | null
  profile_image_url: string | null
  city: string | null
  country: string
  online_only: boolean
  practices: string[] | null
  specialties: string[] | null
  price_range_min: number | null
  price_range_max: number | null
  currency: string | null
  rating_average: number | null
  rating_count: number | null
  subscription_tier: string | null
  tier_expires_at: string | null
  modality: string[] | null
  ranking_score: number | null
}

export interface ArrivalCard {
  key: string
  label: string
  count: number
}

export interface HomeRow {
  slug: string
  name: string
  quote: string | null
  photoUrl: string | null
  practice: string | null
  where: string
  price: string | null
  rating: number | null
  ratingCount: number
  specialtyKeys: string[]
  chips: Array<{ key: string; label: string }>
  /** Índice Hara, rounded, or null when the professional has none yet. */
  score: number | null
  /** "Online", "Presencial · Online", or null when nothing is set. */
  modality: string | null
  destacado: boolean
}

export interface HomeData {
  cards: ArrivalCard[]
  rows: HomeRow[]
}

/** "$850", "desde $850" for a range, "hasta $1.200", or null when no price is set. */
export function formatHomePrice(min: number | null, max: number | null, currency: string | null): string | null {
  if (min == null && max == null) return null
  const symbol = (currency ?? 'USD') === 'ARS' ? '$' : 'US$'
  const fmt = (n: number) => `${symbol}${n.toLocaleString('es-AR')}`
  if (min == null) return `hasta ${fmt(max as number)}`
  return max != null && max > min ? `desde ${fmt(min)}` : fmt(min)
}

function placeOf(p: HomeProfessional): string {
  if (p.online_only) return 'Solo online'
  return [p.city, p.country].filter(Boolean).join(', ')
}

const MODALITY_LABELS: Record<string, string> = { online: 'Online', presencial: 'Presencial' }

function modalityOf(p: HomeProfessional): string | null {
  if (p.online_only) return 'Online'
  const labels = (p.modality ?? []).map((m) => MODALITY_LABELS[m] ?? m)
  return labels.length > 0 ? labels.join(' · ') : null
}

/** The ready-to-render row for one professional (also used by the concierge Carta). */
export function toHomeRow(p: HomeProfessional, catalog: Practice[]): HomeRow {
  const resolved = resolveProfileSpecialties(
    { practiceKeys: p.practices ?? [], specialties: p.specialties ?? [] },
    catalog
  )
  const firstPractice = resolved.practiceKeys[0]
  return {
    slug: p.slug,
    name: p.full_name,
    quote: p.short_description,
    photoUrl: p.profile_image_url?.startsWith('http') ? p.profile_image_url : null,
    practice: firstPractice ? catalog.find((c) => c.key === firstPractice)?.label ?? null : null,
    where: placeOf(p),
    price: formatHomePrice(p.price_range_min, p.price_range_max, p.currency),
    rating: p.rating_average != null && (p.rating_count ?? 0) > 0 ? p.rating_average : null,
    ratingCount: p.rating_count ?? 0,
    specialtyKeys: resolved.specialtyKeys,
    chips: resolved.specialtyKeys.map((key) => ({ key, label: SPECIALTY_MAP[key] ?? key })),
    score: p.ranking_score != null && p.ranking_score > 0 ? Math.round(p.ranking_score) : null,
    modality: modalityOf(p),
    destacado: isEffectivelyDestacado(p.subscription_tier, p.tier_expires_at),
  }
}

/** Cards and rows, with rows in the order given (the directory ranking). */
export function buildHomeData(pros: HomeProfessional[], catalog: Practice[]): HomeData {
  const rows: HomeRow[] = pros.map((p) => toHomeRow(p, catalog))

  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const key of row.specialtyKeys) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const order = Object.keys(SPECIALTY_MAP)
  const cards = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
    .slice(0, MAX_CARDS)
    .map(([key, count]) => ({ key, label: SPECIALTY_MAP[key] ?? key, count }))

  return { cards, rows }
}

/** Rows whose professional has this specialty, keeping their order. */
export function rowsFor(rows: HomeRow[], key: string): HomeRow[] {
  return rows.filter((r) => r.specialtyKeys.includes(key))
}

/** Lowest Índice Hara that can be featured on the home. */
export const FEATURED_MIN_SCORE = 50

/** Slugs of everyone who can be featured, shuffled (Fisher-Yates) so each visit features someone else. */
export function featuredPicks(rows: HomeRow[], random: () => number = Math.random): string[] {
  const picks = rows.filter((r) => r.score != null && r.score >= FEATURED_MIN_SCORE).map((r) => r.slug)
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[picks[i], picks[j]] = [picks[j], picks[i]]
  }
  return picks
}

/** The first pick still among the rows (or nobody) and everyone else. */
export function splitFeatured(rows: HomeRow[], picks: string[]): { featured: HomeRow | null; rest: HomeRow[] } {
  const slug = picks.find((s) => rows.some((r) => r.slug === s))
  const featured = rows.find((r) => r.slug === slug) ?? null
  return { featured, rest: rows.filter((r) => r !== featured) }
}
