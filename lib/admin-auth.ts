// Hara Vital - Roles for admin and professional access
// Purpose: one place that reads a user's role (middleware and requireAdmin both use it)

// Roles live in the Supabase Auth user's app_metadata.role. Only the service role can write
// app_metadata, so a user cannot give themselves a role. user_metadata is user-editable: never read it here.

export type Role = 'admin' | 'professional'

const ROLES: readonly Role[] = ['admin', 'professional']

/** The user's role from app_metadata, or null for no user, no role or an unknown value. */
export function roleOf(user: { app_metadata?: Record<string, unknown>; user_metadata?: unknown } | null | undefined): Role | null {
  const role = user?.app_metadata?.role
  return typeof role === 'string' && (ROLES as readonly string[]).includes(role) ? (role as Role) : null
}
