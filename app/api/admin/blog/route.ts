// Admin Blog — GET list
// Returns all blog_posts ordered created_at DESC for the admin queue page.
// Protected by middleware (admin session required).

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title, author_name, author_email, status, created_at, professional_id, professional_link_confirmed, is_hara_editorial')
    .order('created_at', { ascending: false })

  if (error) {
    logError(new Error(error.message), { source: 'GET /api/admin/blog' })
    return NextResponse.json({ error: 'Error al cargar las notas' }, { status: 500 })
  }

  return NextResponse.json({ posts: data ?? [] })
}
