// Hara Match — Holistic Practices Catalog
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

// Module-level caches shared by getActivePractices, validatePracticeKeys,
// and getAllPractices. Live for the lifetime of the warm Node.js process
// (~5-15 min on serverless). TTL of 60s bounds staleness after cold starts.
//
// Two caches because the active-only set is the hot path for picker reads,
// while the all-practices set is needed by /p/[slug] (so deactivated
// practices on existing pros still render with their human label) and by
// admin reads. Both are cleared by bustPracticesCache() on every admin write.
//
// Cache invalidation: `bustPracticesCache()` clears THIS process's caches.
// On Vercel serverless, multiple cold processes mean other processes serve
// stale data until their TTL expires (≤ 60s). For zero-latency global
// invalidation, replace with `revalidateTag('practices')` once the catalog
// reads through Next.js fetch cache. Out of scope for v1.
let cache: { keys: Set<string>; rows: Practice[]; fetchedAt: number } | null = null
let allCache: { rows: Practice[]; fetchedAt: number } | null = null
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
    .order('key', { ascending: true })
  if (error) {
    throw new Error(`Failed to load practices catalog: ${error.message}`)
  }
  const rows = (data ?? []) as Practice[]
  const keys = new Set(rows.map(r => r.key))
  cache = { keys, rows, fetchedAt: now }
  return { keys, rows }
}

/** Returns all active practices ordered by sort_order ASC, key ASC. Server-side only. */
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

/** Clears both in-process practice caches (active-only and all). Call after
 *  admin writes (POST/PATCH on /api/admin/practices) so this process picks
 *  up changes immediately. Other serverless processes refresh on their own TTL. */
export function bustPracticesCache(): void {
  cache = null
  allCache = null
}

/** Returns ALL practices (active + inactive) ordered by sort_order ASC, key ASC.
 *  Cached separately from getActivePractices() with the same 60s TTL — the
 *  catalog rarely changes and /p/[slug] reads it on every page render.
 *  Server-side only. */
export async function getAllPractices(): Promise<Practice[]> {
  const now = Date.now()
  if (allCache && now - allCache.fetchedAt < TTL_MS) {
    return allCache.rows
  }
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('key, label, slug, sort_order, active')
    .order('sort_order', { ascending: true })
    .order('key', { ascending: true })
  if (error) {
    throw new Error(`Failed to load practices catalog: ${error.message}`)
  }
  const rows = (data ?? []) as Practice[]
  allCache = { rows, fetchedAt: now }
  return rows
}
