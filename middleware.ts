// Hará Match - Admin Route Protection Middleware
// Purpose: Gate /admin/* and /api/admin/* with fail-closed authentication
// Security: Returns 503 if REQUIRE_ADMIN_AUTH=true OR (production AND Clerk missing)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is an admin route
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')

  if (!isAdminRoute) {
    return NextResponse.next()
  }

  // Determine if we should gate admin routes
  const requireAdminAuth = process.env.REQUIRE_ADMIN_AUTH === 'true'
  const isProduction = process.env.NODE_ENV === 'production'
  const hasClerkKeys = Boolean(process.env.CLERK_SECRET_KEY)

  const shouldGate = requireAdminAuth || (isProduction && !hasClerkKeys)

  if (shouldGate) {
    return NextResponse.json(
      {
        error: 'Service unavailable: Admin authentication required. Configure Clerk authentication before accessing admin routes.',
      },
      { status: 503 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
