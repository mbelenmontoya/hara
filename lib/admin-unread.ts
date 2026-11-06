// Unread numbers for the admin menu (migration 025).
// A row is unread while admin_read_at is NULL; it is marked read when the admin opens it.

import { supabaseAdmin } from '@/lib/supabase-admin'

export const UNREAD_KINDS = ['leads', 'professionals', 'blog', 'reviews'] as const
export type UnreadKind = (typeof UNREAD_KINDS)[number]
export type UnreadCounts = Record<UnreadKind, number>

const TABLE: Record<UnreadKind, string> = {
  leads: 'leads',
  professionals: 'professionals',
  blog: 'blog_posts',
  reviews: 'reviews',
}

/** True when the value is one of the menu sections that track unread rows. */
export function isUnreadKind(value: unknown): value is UnreadKind {
  return typeof value === 'string' && (UNREAD_KINDS as readonly string[]).includes(value)
}

/** Count the unread rows per section. Throws when the database fails. */
export async function countUnread(): Promise<UnreadCounts> {
  const results = await Promise.all(
    UNREAD_KINDS.map((kind) =>
      supabaseAdmin.from(TABLE[kind]).select('id', { count: 'exact', head: true }).is('admin_read_at', null)
    )
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)
  return Object.fromEntries(UNREAD_KINDS.map((kind, i) => [kind, results[i].count ?? 0])) as UnreadCounts
}

/** Mark one row read, or every unread row when no id is given. Throws when the database fails. */
export async function markRead(kind: UnreadKind, id?: string): Promise<void> {
  let query = supabaseAdmin
    .from(TABLE[kind])
    .update({ admin_read_at: new Date().toISOString() })
    .is('admin_read_at', null)
  if (id) query = query.eq('id', id)
  const { error } = await query
  if (error) throw new Error(error.message)
}
