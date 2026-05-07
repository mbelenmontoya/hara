// Hará Match — Holistic Practices Catalog
// Server-only helpers for the `practices` lookup table.
// Do NOT import from client components — use the Practice type only,
// and receive practices as a prop from the server-component parent.

import { supabaseAdmin } from '@/lib/supabase-admin'

/** One row from the `practices` table. */
export interface Practice {
  key: string
  label: string
  slug: string
  sort_order: number
  active: boolean
}

// Module-level cache shared by getActivePractices and validatePracticeKeys.
// Lives for the lifetime of the warm Node.js process (~5-15 min on serverless).
// TTL of 60s bounds staleness after cold starts.
let cache: { keys: Set<string>; rows: Practice[]; fetchedAt: number } | null = null
const TTL_MS = 60_000

async function loadCache(): Promise<{ keys: Set<string>; rows: Practice[] }> {
  const now = Date.now()
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return { keys: cache.keys, rows: cache.rows }
  }
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('key, label, slug, sort_order, active')
    .eq('active', true)
    .order('sort_order', { ascending: true })
  if (error) {
    throw new Error(`Failed to load practices catalog: ${error.message}`)
  }
  const rows = (data ?? []) as Practice[]
  const keys = new Set(rows.map(r => r.key))
  cache = { keys, rows, fetchedAt: now }
  return { keys, rows }
}

/** Returns all active practices ordered by sort_order. Server-side only. */
export async function getActivePractices(): Promise<Practice[]> {
  const { rows } = await loadCache()
  return rows
}

/** Validates that every key in the array exists in the active catalog.
 *  Returns { ok: true } or { ok: false, invalidKey: string } with the first bad key. */
export async function validatePracticeKeys(
  keys: string[]
): Promise<{ ok: true } | { ok: false; invalidKey: string }> {
  if (keys.length === 0) return { ok: true }
  const { keys: validKeys } = await loadCache()
  for (const k of keys) {
    if (!validKeys.has(k)) return { ok: false, invalidKey: k }
  }
  return { ok: true }
}
