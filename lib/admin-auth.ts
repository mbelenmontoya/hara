// Hará Match - Admin Authentication Guard
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
