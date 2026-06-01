// Hara Vital — Admin Practices Catalog View
// Server-only helper that joins the `practices` lookup with usage counts
// from `professionals.practices[]`. Used by the /admin/practices list page
// and GET /api/admin/practices.
//
// Lives separately from `lib/practices.ts` to keep that file focused on
// the lookup table itself; this file is the only one that crosses into
// professionals data for an admin-facing view.
//
// Usage count semantics:
// - Counts professionals where status IN ('active', 'submitted') only.
//   Rejected/paused/draft pros are excluded — they're not "real" usage signals
//   when an admin is deciding whether to deactivate a practice.
// - Does NOT count `leads.practice_preference[]`. Leads are transient
//   (admin re-categorizes them during matching); including them would
//   inflate the count with stale signals.

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAllPractices, type Practice } from '@/lib/practices'

export interface PracticeWithCount extends Practice {
  usage_count: number
}

export interface PracticeSuggestion {
  entry: string   // original free-text value as written by the professional
  count: number   // how many active/submitted professionals wrote this
}

/**
 * Returns free-text entries from professionals.specialties that don't already
 * exist in the practices catalog, sorted by frequency descending.
 */
export async function loadPracticeSuggestions(): Promise<PracticeSuggestion[]> {
  const [{ data: pros, error: prosError }, { data: existingPractices, error: practicesError }] =
    await Promise.all([
      supabaseAdmin
        .from('professionals')
        .select('specialties')
        .in('status', ['active', 'submitted']),
      supabaseAdmin
        .from('practices')
        .select('key, label, aliases'),
    ])

  if (prosError) throw new Error(`Suggestions: failed to load professionals: ${prosError.message}`)
  if (practicesError) throw new Error(`Suggestions: failed to load practices: ${practicesError.message}`)

  // Normalize: lowercase + strip accents so "yoga terapeutico" matches "yoga terapéutico"
  function normalize(s: string): string {
    return s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
  }

  // Build exclusion set from existing practice keys, labels, and aliases
  const excluded = new Set<string>()
  for (const p of existingPractices ?? []) {
    excluded.add(normalize(p.key))
    excluded.add(normalize(p.label))
    for (const alias of p.aliases ?? []) {
      excluded.add(normalize(alias))
    }
  }

  // Count occurrences of each free-text entry
  const counts = new Map<string, { display: string; count: number }>()
  for (const row of (pros ?? []) as Array<{ specialties: string[] | null }>) {
    for (const raw of row.specialties ?? []) {
      const normalized = normalize(raw)
      if (!normalized || excluded.has(normalized)) continue
      const existing = counts.get(normalized)
      if (existing) {
        existing.count++
      } else {
        counts.set(normalized, { display: raw.trim(), count: 1 })
      }
    }
  }

  return Array.from(counts.values())
    .map(({ display, count }) => ({ entry: display, count }))
    .sort((a, b) => b.count - a.count || a.entry.localeCompare(b.entry))
}

/** Returns all practices (active + inactive) with per-practice usage counts. */
export async function loadAdminPracticesView(): Promise<PracticeWithCount[]> {
  const all = await getAllPractices()

  const { data: pros, error } = await supabaseAdmin
    .from('professionals')
    .select('practices')
    .in('status', ['active', 'submitted'])

  if (error) {
    throw new Error(`Failed to load professionals usage counts: ${error.message}`)
  }

  const counts = new Map<string, number>()
  for (const row of (pros ?? []) as Array<{ practices: string[] | null }>) {
    for (const key of row.practices ?? []) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return all.map(p => ({ ...p, usage_count: counts.get(p.key) ?? 0 }))
}
