// Hara Vital - Route Protection Middleware
// Purpose: Gate /admin/* and /pro/* routes with Supabase Auth roles (app_metadata.role)
// Public routes (/r/, /p/, /solicitar, etc.) are not affected

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { roleOf } from '@/lib/admin-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always refresh session cookies (needed for Supabase Auth to work)
  const { response, user } = await updateSession(request)
  const role = roleOf(user)

  // Check if this is a protected route.
  // ⛔ Use '/pro/' (with trailing slash) not '/pro': the latter also matches
  //    /profesionales (public redirect to the home) and any other /pro... public route.
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/debug') ||
    pathname.startsWith('/pro/') ||
    pathname.startsWith('/api/pro/')

  // /admin/login: redirect admins to the dashboard.
  // Anyone else signed in sees the login, otherwise /admin would bounce them back here forever.
  if (pathname === '/admin/login') {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/leads', request.url))
    }
    return response
  }

  // /pro/login: redirect professionals to their profile (anyone else sees the login: no loop)
  if (pathname === '/pro/login') {
    if (role === 'professional') {
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

  const isProRoute = pathname.startsWith('/pro/') || pathname.startsWith('/api/pro/')

  // /pro is for the professional role only. The admin goes back to the admin; no role goes to the pro login.
  if (isProRoute && role !== 'professional') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const target = role === 'admin' ? '/admin/leads' : '/pro/login'
    return NextResponse.redirect(new URL(target, request.url))
  }

  // Everything else protected (/admin, /api/admin, /api/debug) is for the admin role only
  if (!isProRoute && role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('error', 'no-access')
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
