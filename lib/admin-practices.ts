// Hará Match — Admin Practices Catalog View
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
