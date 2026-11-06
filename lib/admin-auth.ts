// Hara Vital - Admin Authentication Guard
// Purpose: Shared auth check for all /api/admin/* routes
// Production: Fail-closed (503) until Clerk configured
// Development: Placeholder UUID allowed

export function getAdminUserId(): string | { error: string; status: number } {
  // Production: Fail-closed
  if (process.env.NODE_ENV === 'production') {
    // TODO (Week 4): Extract from Clerk session
    // import { auth } from '@clerk/nextjs'
    // const { userId } = auth()
    // if (!userId) return { error: 'Unauthorized', status: 401 }
    // return userId

    return {
      error: 'Service unavailable: Admin authentication required. Configure Clerk auth before production deployment.',
      status: 503,
    }
  }

  // Development: Placeholder allowed
  return '00000000-0000-0000-0000-000000000001'
}

// Who counts as the admin: the emails listed in ADMIN_EMAILS (comma-separated).
// An empty or missing list lets nobody in, so a missing env var fails closed.

/** True when the email is in ADMIN_EMAILS, ignoring case and spaces. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.trim().toLowerCase())
}
