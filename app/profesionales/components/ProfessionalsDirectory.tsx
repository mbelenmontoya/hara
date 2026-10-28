// Directory data shape and the search and filter predicates the home page uses.

import type { Practice } from '@/lib/practices'
import { SPECIALTY_MAP } from '@/lib/design-constants'
import type { FilterState } from './DirectoryFilters'

export interface DirectoryProfessional {
  slug: string
  full_name: string
  specialties: string[] | null
  practices: string[] | null
  modality: string[] | null
  short_description: string | null
  city: string | null
  country: string
  latitude: number | null
  longitude: number | null
  online_only: boolean
  profile_image_url: string | null
  price_range_min: number | null
  price_range_max: number | null
  currency: string | null
  rating_average: number | null
  rating_count: number | null
  subscription_tier: string | null
  tier_expires_at: string | null
  ranking_score: number | null
}

// Lowercase + strip NFD diacritics — same logic as lib/admin-practices.ts:50
export function normalize(s: string): string {
  return s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Pre-computes normalized searchable terms per practice key (key + label + aliases + specialty labels)
export function buildPracticeIndex(practices: Practice[]): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const p of practices) {
    const terms = [
      normalize(p.key),
      normalize(p.label),
      ...(p.aliases ?? []).map(normalize),
      ...(p.specialties ?? []).map(key => normalize(SPECIALTY_MAP[key] ?? key)),
    ]
    index.set(p.key, terms)
  }
  return index
}

// Pure filter predicate — exported for unit testing
export function matchesProfessional(
  pro: DirectoryProfessional,
  query: string,
  practiceIndex: Map<string, string[]>
): boolean {
  if (!query) return true
  const q = normalize(query)
  if (normalize(pro.full_name).includes(q)) return true
  if (pro.specialties?.some((s) => normalize(s).includes(q))) return true
  if (pro.practices?.some((key) => practiceIndex.get(key)?.some((t) => t.includes(q)))) return true
  return false
}

// Chip-filter predicate — AND across dimensions, OR within each dimension.
// practiceIndex is used as a fallback for pros with sparse `practices` data:
// if the structured key is missing, we check practice terms against free-text specialties.
export function matchesFilters(
  pro: DirectoryProfessional,
  filters: FilterState,
  practiceIndex: Map<string, string[]> = new Map()
): boolean {
  if (filters.practices.length > 0) {
    const hasPracticeMatch = filters.practices.some(filterKey => {
      if (pro.practices?.includes(filterKey)) return true
      const terms = practiceIndex.get(filterKey) ?? []
      return terms.some(term => pro.specialties?.some(s => normalize(s).includes(term)))
    })
    if (!hasPracticeMatch) return false
  }
  if (filters.specialties.length > 0) {
    if (!pro.specialties?.some(s => filters.specialties.includes(s))) return false
  }
  if (filters.modality === 'online') {
    if (!pro.online_only && !pro.modality?.includes('online')) return false
  } else if (filters.modality === 'presencial') {
    if (pro.online_only) return false
    if (pro.modality && pro.modality.length > 0 && !pro.modality.includes('presencial')) return false
  }
  if (filters.location) {
    if (pro.online_only) return false
    if (!pro.city) return false
    if (normalize(pro.city) !== normalize(filters.location.city)) return false
  }
  return true
}
