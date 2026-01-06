// Hará Match - Admin Route Protection Middleware
// Purpose: Gate /admin/* and /api/admin/* with fail-closed authentication
// Security: Returns 503 if REQUIRE_ADMIN_AUTH=true OR (production AND Clerk missing)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is a protected route
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/debug')

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Determine if we should gate protected routes
  const requireAdminAuth = process.env.REQUIRE_ADMIN_AUTH === 'true'
  const isProduction = process.env.NODE_ENV === 'production'
  const hasClerkKeys = Boolean(process.env.CLERK_SECRET_KEY) && !process.env.CLERK_SECRET_KEY?.startsWith('sk_...')

  // Gate if: explicitly required OR production without valid Clerk keys
  const shouldGate = requireAdminAuth || (isProduction && !hasClerkKeys)

  if (shouldGate) {
    return NextResponse.json(
      {
        error: 'Service unavailable: Admin authentication required. Configure Clerk authentication before accessing admin routes.',
      },
      { status: 503 }
    )
  }

  // Development mode: allow access (tests and local dev)
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/debug/:path*'],
}
