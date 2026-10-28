// Logic behind the home search bar: apply search and filters,
// and count the options the Prácticas, Modalidad and Ciudad panels show.
// All matching goes through the directory's own predicates so counts agree with the list.

import {
  buildPracticeIndex,
  matchesFilters,
  matchesProfessional,
  normalize,
  type DirectoryProfessional,
} from '@/app/profesionales/components/ProfessionalsDirectory'
import { DEFAULT_FILTERS, type FilterState } from '@/app/profesionales/components/DirectoryFilters'
import type { Practice } from '@/lib/practices'
import type { HomeRow } from '@/lib/home-arrival'

export interface HomeQuery {
  search: string
  filters: FilterState
}

export interface PracticeOption {
  key: string
  label: string
  count: number
}

export interface CityOption {
  city: string
  count: number
}

export interface ModalityCounts {
  all: number
  online: number
  presencial: number
}

/** Professionals that match the search text and every filter, keeping their order. */
export function filterProfessionals(
  professionals: DirectoryProfessional[],
  practices: Practice[],
  { search, filters }: HomeQuery
): DirectoryProfessional[] {
  const index = buildPracticeIndex(practices)
  return professionals.filter((p) => matchesProfessional(p, search, index) && matchesFilters(p, filters, index))
}

/** The rows of the given professionals, keeping the rows' order. */
export function filterRows(rows: HomeRow[], matched: DirectoryProfessional[]): HomeRow[] {
  const slugs = new Set(matched.map((p) => p.slug))
  return rows.filter((r) => slugs.has(r.slug))
}

/** Active practices with how many professionals offer each. */
export function practiceOptions(professionals: DirectoryProfessional[], practices: Practice[]): PracticeOption[] {
  const index = buildPracticeIndex(practices)
  return practices
    .filter((p) => p.active)
    .map((p) => ({
      key: p.key,
      label: p.label,
      count: professionals.filter((pro) => matchesFilters(pro, { ...DEFAULT_FILTERS, practices: [p.key] }, index)).length,
    }))
}

export function modalityCounts(professionals: DirectoryProfessional[]): ModalityCounts {
  const count = (modality: FilterState['modality']) =>
    professionals.filter((p) => matchesFilters(p, { ...DEFAULT_FILTERS, modality })).length
  return { all: professionals.length, online: count('online'), presencial: count('presencial') }
}

/** Cities that really exist in the data (online-only people have none), most people first. */
export function cityOptions(professionals: DirectoryProfessional[]): CityOption[] {
  const labels = new Map<string, string>()
  for (const p of professionals) {
    if (p.online_only || !p.city) continue
    const key = normalize(p.city)
    if (!labels.has(key)) labels.set(key, p.city)
  }
  return [...labels.values()]
    .map((city) => ({
      city,
      count: professionals.filter((p) =>
        matchesFilters(p, { ...DEFAULT_FILTERS, location: { city, country: '', lat: null, lng: null } })
      ).length,
    }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, 'es'))
}
