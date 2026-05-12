// Hara Vital — Admin Practices Catalog API (single resource)
// PATCH: update label/slug/sort_order/active. `key` is immutable —
//        any body.key that differs from params.key returns 400.
// Security: Admin-only via getAdminUserId().

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminUserId } from '@/lib/admin-auth'
import { bustPracticesCache } from '@/lib/practices'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

interface UpdateInput {
  label?: string
  slug?: string
  sort_order?: number
  active?: boolean
}

function validateUpdate(
  raw: unknown
): { ok: true; value: UpdateInput; bodyKey?: string } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Body inválido' }
  }
  const r = raw as Record<string, unknown>
  const out: UpdateInput = {}

  if (r.label !== undefined) {
    if (typeof r.label !== 'string') return { ok: false, error: '`label` debe ser un string' }
    const label = r.label.trim()
    if (label.length < 2 || label.length > 80) {
      return { ok: false, error: '`label` debe tener entre 2 y 80 caracteres' }
    }
    out.label = label
  }

  if (r.slug !== undefined) {
    if (typeof r.slug !== 'string') return { ok: false, error: '`slug` debe ser un string' }
    const slug = r.slug.trim()
    if (slug.length < 2 || slug.length > 60) {
      return { ok: false, error: '`slug` debe tener entre 2 y 60 caracteres' }
    }
    if (!KEBAB_RE.test(slug)) {
      return { ok: false, error: '`slug` debe ser kebab-case' }
    }
    out.slug = slug
  }

  if (r.sort_order !== undefined) {
    if (typeof r.sort_order !== 'number' || !Number.isInteger(r.sort_order) || r.sort_order < 0) {
      return { ok: false, error: '`sort_order` debe ser un entero ≥ 0' }
    }
    out.sort_order = r.sort_order
  }

  if (r.active !== undefined) {
    if (typeof r.active !== 'boolean') {
      return { ok: false, error: '`active` debe ser true o false' }
    }
    out.active = r.active
  }

  // Coerce empty/whitespace body.key to undefined; the immutability check
  // only matters when the client actively tried to change it.
  const bodyKey = typeof r.key === 'string' && r.key.trim().length > 0 ? r.key.trim() : undefined
  return { ok: true, value: out, bodyKey }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  const adminUserId = getAdminUserId()
  if (typeof adminUserId === 'object') {
    return NextResponse.json({ error: adminUserId.error }, { status: adminUserId.status })
  }

  const urlKey = params.key
  if (!urlKey || !KEBAB_RE.test(urlKey)) {
    return NextResponse.json({ error: 'Clave inválida' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido (JSON)' }, { status: 400 })
  }

  const validation = validateUpdate(body)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Key-immutability: 400 if body.key is present and != URL key.
  // body.key === urlKey is allowed (idempotent no-op; not added to update payload).
  if (validation.bodyKey !== undefined && validation.bodyKey !== urlKey) {
    return NextResponse.json(
      { error: 'El campo `key` es inmutable. Para renombrar, deactivate + recreate.' },
      { status: 400 }
    )
  }

  const update = validation.value
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No hay cambios para guardar.' }, { status: 400 })
  }

  // Pre-check slug uniqueness if slug is being changed
  if (update.slug !== undefined) {
    const { data: collision, error: precheckError } = await supabaseAdmin
      .from('practices')
      .select('key')
      .eq('slug', update.slug)
      .neq('key', urlKey)
      .maybeSingle()
    if (precheckError) {
      logError(new Error(precheckError.message), {
        source: 'PATCH /api/admin/practices/[key]',
        step: 'precheck-slug',
        urlKey,
        slug: update.slug,
      })
      return NextResponse.json(
        { error: 'Error al verificar la unicidad del slug' },
        { status: 500 }
      )
    }
    if (collision) {
      return NextResponse.json(
        { error: `Ya existe otra práctica con el slug '${update.slug}'.` },
        { status: 400 }
      )
    }
  }

  // Single-query update + select to avoid TOCTOU
  const { data, error } = await supabaseAdmin
    .from('practices')
    .update(update)
    .eq('key', urlKey)
    .select('key')
    .single()

  if (error || !data) {
    // PostgREST returns code='PGRST116' for "no rows"
    if (error?.code === 'PGRST116' || (!error && !data)) {
      return NextResponse.json({ error: 'Práctica no encontrada' }, { status: 404 })
    }
    if (error?.code === '23505') {
      logError(new Error(error.message), {
        source: 'PATCH /api/admin/practices/[key]',
        step: 'update-23505-race',
        urlKey,
        update,
      })
      return NextResponse.json(
        { error: 'Conflicto de unicidad. Intentá de nuevo.' },
        { status: 400 }
      )
    }
    if (error) {
      logError(new Error(error.message), {
        source: 'PATCH /api/admin/practices/[key]',
        step: 'update',
        urlKey,
        update,
      })
    }
    return NextResponse.json({ error: 'Error al actualizar la práctica' }, { status: 500 })
  }

  bustPracticesCache()
  return NextResponse.json({ success: true })
}
