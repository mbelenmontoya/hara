// Admin check for /api/admin route handlers: reads the signed-in user from the Supabase session
// and requires app_metadata.role = 'admin'. Same rule in every environment: no NODE_ENV branch,
// because a production-only branch is what broke the live admin before (see admin-auth.production.test.ts).

import { createClient } from '@/lib/supabase/server'
import { roleOf } from '@/lib/admin-auth'

export type AdminCheck = { userId: string } | { error: string; status: 401 | 403 }

/** The signed-in admin's user id, or the error to return (401 no session, 403 not admin). */
export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (roleOf(user) !== 'admin') return { error: 'Forbidden', status: 403 }
  return { userId: user.id }
}
