// Hará Match - Route Protection Middleware
// Purpose: Gate /admin/* routes with Supabase Auth
// Public routes (/r/, /p/, /solicitar, etc.) are not affected

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always refresh session cookies (needed for Supabase Auth to work)
  const { response, user } = await updateSession(request)

  // Check if this is a protected route
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/debug')

  // The login page itself should not be protected
  if (pathname === '/admin/login') {
    // If already logged in, redirect to dashboard
    if (user) {
      return NextResponse.redirect(new URL('/admin/leads', request.url))
    }
    return response
  }

  if (!isProtectedRoute) {
    return response
  }

  // Protected route without session → redirect to login
  if (!user) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
