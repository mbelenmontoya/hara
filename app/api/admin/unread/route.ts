// Admin API: Unread numbers for the admin menu
// GET: unread count per section. POST { kind, id? }: mark one row read (reviews: all, when no id).
// Security: Gated by middleware (requires an admin session)

import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/monitoring'
import { countUnread, isUnreadKind, markRead } from '@/lib/admin-unread'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(await countUnread())
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'GET /api/admin/unread' })
    return NextResponse.json({ error: 'No pudimos contar los pendientes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null)
  const kind = body && typeof body === 'object' ? (body as Record<string, unknown>).kind : undefined
  const id = body && typeof body === 'object' ? (body as Record<string, unknown>).id : undefined

  if (!isUnreadKind(kind)) {
    return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })
  }
  // Only reviews can be marked read all at once (the page has no detail view)
  if (id === undefined ? kind !== 'reviews' : typeof id !== 'string' || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    await markRead(kind, typeof id === 'string' ? id : undefined)
    return NextResponse.json({ ok: true })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'POST /api/admin/unread', kind })
    return NextResponse.json({ error: 'No pudimos marcarlo como leído' }, { status: 500 })
  }
}
