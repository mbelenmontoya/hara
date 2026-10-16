// Data for the concierge Carta (/r/[tracking_code], design 9c): the person's first name from
// their request note, and one ready-to-render card per recommended professional.

import { isValidReason } from '@/lib/design-constants'
import { toHomeRow, type HomeProfessional } from '@/lib/home-arrival'
import type { Practice } from '@/lib/practices'

/** One match_recommendations row with its professional, as the public API loads it. */
export interface CartaRecommendationRow {
  id: string
  rank: number
  reasons: string[] | null
  attribution_token: string
  professional: HomeProfessional & { whatsapp: string }
}

export interface CartaPick {
  id: string
  rank: number
  attributionToken: string
  slug: string
  name: string
  firstName: string
  whatsapp: string
  photoUrl: string | null
  practice: string | null
  specialtyKey: string | null
  where: string
  price: string | null
  rating: number | null
  reasons: string[]
}

const NAME_LINE = /^Nombre:\s*(\S+)/m

/** First word of the "Nombre: …" line that the concierge form writes into the lead note, or null. */
export function firstNameFromContext(note: string | null): string | null {
  return note?.match(NAME_LINE)?.[1] ?? null
}

/** The card for one recommended professional; only meaningful reasons are kept. */
export function toCartaPick(rec: CartaRecommendationRow, catalog: Practice[]): CartaPick {
  const row = toHomeRow(rec.professional, catalog)
  return {
    id: rec.id,
    rank: rec.rank,
    attributionToken: rec.attribution_token,
    slug: row.slug,
    name: row.name,
    firstName: row.name.split(/\s+/)[0] ?? row.name,
    whatsapp: rec.professional.whatsapp,
    photoUrl: row.photoUrl,
    practice: row.practice,
    specialtyKey: row.specialtyKeys[0] ?? null,
    where: row.where,
    price: row.price,
    rating: row.rating,
    reasons: (rec.reasons ?? []).filter(isValidReason).map((r) => r.trim()),
  }
}
