// Which curated specialties to show on a professional's profile.
// Source of truth is the `practices` catalog: each practice lists the curated specialties it helps with.
// A professional's practices come from their linked keys, or, when none are linked yet
// (needs_practice_review), from matching their free-text specialties against practice key, label and aliases.

import { CURATED_SPECIALTY_KEYS } from '@/lib/design-constants'
import type { Practice } from '@/lib/practices'

const MAX_SPECIALTIES = 6
// Shorter terms would match inside unrelated words ("sol" in "consolacion").
const MIN_MATCH_TERM_LENGTH = 4

export interface ProfileSpecialtyInput {
  practiceKeys: string[]
  specialties: string[]
}

export interface ResolvedProfileSpecialties {
  specialtyKeys: string[]
  practiceKeys: string[]
}

// Lowercase + strip diacritics, same rule the directory uses.
function normalize(s: string): string {
  return s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function practiceTerms(p: Practice): string[] {
  return [p.key.replace(/-/g, ' '), p.label, ...(p.aliases ?? [])]
    .map(normalize)
    .filter((t) => t.length >= MIN_MATCH_TERM_LENGTH)
}

function findPracticeKeys(freeText: string[], catalog: Practice[]): string[] {
  const texts = freeText.map(normalize)
  return catalog
    .filter((p) => practiceTerms(p).some((term) => texts.some((t) => t.includes(term))))
    .map((p) => p.key)
}

/** Curated specialty keys (and the practices behind them) for a profile, most relevant first. */
export function resolveProfileSpecialties(
  input: ProfileSpecialtyInput,
  catalog: Practice[]
): ResolvedProfileSpecialties {
  const ownCurated = input.specialties.filter((s) => CURATED_SPECIALTY_KEYS.includes(s))
  const matchedKeys =
    input.practiceKeys.length > 0 ? input.practiceKeys : findPracticeKeys(input.specialties, catalog)

  const byKey = new Map(catalog.map((p) => [p.key, p]))
  const practices = [...new Set(matchedKeys)].flatMap((k) => byKey.get(k) ?? [])

  const votes = new Map<string, number>()
  for (const p of practices) {
    for (const s of p.specialties ?? []) votes.set(s, (votes.get(s) ?? 0) + 1)
  }
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key)

  return {
    specialtyKeys: [...new Set([...ownCurated, ...ranked])].slice(0, MAX_SPECIALTIES),
    practiceKeys: practices.map((p) => p.key),
  }
}
