// Hara Vital - Route Protection Middleware
// Purpose: Gate /admin/* routes with Supabase Auth
// Public routes (/r/, /p/, /solicitar, etc.) are not affected

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always refresh session cookies (needed for Supabase Auth to work)
  const { response, user } = await updateSession(request)

  // Check if this is a protected route.
  // ⛔ Use '/pro/' (with trailing slash) not '/pro' — the latter also matches
  //    /profesionales and /profesionales/registro (public routes).
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/debug') ||
    pathname.startsWith('/pro/') ||
    pathname.startsWith('/api/pro/')

  // /admin/login — redirect authenticated admins to the dashboard
  if (pathname === '/admin/login') {
    if (user) {
      return NextResponse.redirect(new URL('/admin/leads', request.url))
    }
    return response
  }

  // /pro/login — redirect authenticated pros to their profile
  if (pathname === '/pro/login') {
    if (user) {
      return NextResponse.redirect(new URL('/pro/perfil', request.url))
    }
    return response
  }

  // /pro/set-password and /api/pro/forgot-password are public
  // (verifyOtp and recovery flows have no session yet)
  if (pathname === '/pro/set-password' || pathname === '/api/pro/forgot-password') {
    return response
  }

  if (!isProtectedRoute) {
    return response
  }

  // Protected /pro/* without a session → redirect to /pro/login
  if (!user && pathname.startsWith('/pro/')) {
    const loginUrl = new URL('/pro/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Protected /admin/* or /api/* without a session → redirect to /admin/login
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
