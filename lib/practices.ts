// Hara Vital — Holistic Practices Catalog
// Server-only helpers for the `practices` lookup table.
// Do NOT import from client components — use the Practice type only,
// and receive practices as a prop from the server-component parent.
//
// No caching — supabaseAdmin uses cache: 'no-store' so every call is fresh.
// The DB is the single source of truth.

import { supabaseAdmin } from '@/lib/supabase-admin'

/** One row from the `practices` table. */
export interface Practice {
  key: string
  label: string
  slug: string
  sort_order: number
  active: boolean
  specialties?: string[]
  aliases?: string[]
}

/** Returns all active practices ordered by sort_order ASC, key ASC. Server-side only. */
export async function getActivePractices(): Promise<Practice[]> {
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('key, label, slug, sort_order, active, aliases')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('key', { ascending: true })
  if (error) throw new Error(`Failed to load practices catalog: ${error.message}`)
  return (data ?? []) as Practice[]
}

/** Validates that every key in the array exists in the active catalog.
 *  Returns { ok: true } or { ok: false, invalidKey: string } with the first bad key. */
export async function validatePracticeKeys(
  keys: string[]
): Promise<{ ok: true } | { ok: false; invalidKey: string }> {
  if (keys.length === 0) return { ok: true }
  const practices = await getActivePractices()
  const validKeys = new Set(practices.map(p => p.key))
  for (const k of keys) {
    if (!validKeys.has(k)) return { ok: false, invalidKey: k }
  }
  return { ok: true }
}

/** No-op — kept for call-site compatibility. Cache was removed; DB is always fresh. */
export function bustPracticesCache(): void {}

/** Returns ALL practices (active + inactive) ordered by sort_order ASC, key ASC.
 *  Server-side only. */
export async function getAllPractices(): Promise<Practice[]> {
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('key, label, slug, sort_order, active')
    .order('sort_order', { ascending: true })
    .order('key', { ascending: true })
  if (error) throw new Error(`Failed to load practices catalog: ${error.message}`)
  return (data ?? []) as Practice[]
}
