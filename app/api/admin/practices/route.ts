// Hara Vital — Admin Practices Catalog API
// GET:  list all practices (active + inactive) with usage counts.
// POST: create a new practice (validates kebab-case key/slug, pre-checks
//       uniqueness, busts the in-process catalog cache on success).
// Security: Admin-only via getAdminUserId().

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminUserId } from '@/lib/admin-auth'
import { loadAdminPracticesView } from '@/lib/admin-practices'
import { bustPracticesCache } from '@/lib/practices'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

interface PracticeInput {
  key: string
  label: string
  slug: string
  sort_order: number
  active: boolean
}

function validatePracticeInput(
  raw: unknown
): { ok: true; value: PracticeInput } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Body inválido' }
  }
  const r = raw as Record<string, unknown>

  // key
  if (typeof r.key !== 'string' || r.key.trim().length === 0) {
    return { ok: false, error: 'El campo `key` es requerido' }
  }
  const key = r.key.trim()
  if (key.length < 2 || key.length > 60) {
    return { ok: false, error: '`key` debe tener entre 2 y 60 caracteres' }
  }
  if (!KEBAB_RE.test(key)) {
    return {
      ok: false,
      error: '`key` debe ser kebab-case (minúsculas, dígitos y guiones)',
    }
  }

  // label
  if (typeof r.label !== 'string' || r.label.trim().length === 0) {
    return { ok: false, error: 'El campo `label` es requerido' }
  }
  const label = r.label.trim()
  if (label.length < 2 || label.length > 80) {
    return { ok: false, error: '`label` debe tener entre 2 y 80 caracteres' }
  }

  // slug (defaults to key)
  let slug: string
  if (r.slug === undefined || r.slug === null || r.slug === '') {
    slug = key
  } else if (typeof r.slug !== 'string') {
    return { ok: false, error: '`slug` debe ser un string' }
  } else {
    slug = r.slug.trim()
    if (slug.length < 2 || slug.length > 60) {
      return { ok: false, error: '`slug` debe tener entre 2 y 60 caracteres' }
    }
    if (!KEBAB_RE.test(slug)) {
      return { ok: false, error: '`slug` debe ser kebab-case' }
    }
  }

  // sort_order
  if (typeof r.sort_order !== 'number' || !Number.isInteger(r.sort_order) || r.sort_order < 0) {
    return { ok: false, error: '`sort_order` debe ser un entero ≥ 0' }
  }

  // active (defaults to true)
  let active = true
  if (r.active !== undefined) {
    if (typeof r.active !== 'boolean') {
      return { ok: false, error: '`active` debe ser true o false' }
    }
    active = r.active
  }

  return { ok: true, value: { key, label, slug, sort_order: r.sort_order, active } }
}

export async function GET(_req: NextRequest) {
  const adminUserId = getAdminUserId()
  if (typeof adminUserId === 'object') {
    return NextResponse.json({ error: adminUserId.error }, { status: adminUserId.status })
  }

  try {
    const practices = await loadAdminPracticesView()
    return NextResponse.json({ practices })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      source: 'GET /api/admin/practices',
    })
    return NextResponse.json(
      { error: 'Error al cargar el catálogo de prácticas' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const adminUserId = getAdminUserId()
  if (typeof adminUserId === 'object') {
    return NextResponse.json({ error: adminUserId.error }, { status: adminUserId.status })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido (JSON)' }, { status: 400 })
  }

  const validation = validatePracticeInput(body)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  const input = validation.value

  // Pre-check key uniqueness
  const { data: existingByKey, error: keyPrecheckError } = await supabaseAdmin
    .from('practices')
    .select('key')
    .eq('key', input.key)
    .maybeSingle()
  if (keyPrecheckError) {
    logError(new Error(keyPrecheckError.message), {
      source: 'POST /api/admin/practices',
      step: 'precheck-key',
      key: input.key,
    })
    return NextResponse.json(
      { error: 'Error al verificar la unicidad de la clave' },
      { status: 500 }
    )
  }
  if (existingByKey) {
    return NextResponse.json(
      { error: `Ya existe una práctica con la clave '${input.key}'.` },
      { status: 400 }
    )
  }

  // Pre-check slug uniqueness
  const { data: existingBySlug, error: slugPrecheckError } = await supabaseAdmin
    .from('practices')
    .select('key')
    .eq('slug', input.slug)
    .maybeSingle()
  if (slugPrecheckError) {
    logError(new Error(slugPrecheckError.message), {
      source: 'POST /api/admin/practices',
      step: 'precheck-slug',
      slug: input.slug,
    })
    return NextResponse.json(
      { error: 'Error al verificar la unicidad del slug' },
      { status: 500 }
    )
  }
  if (existingBySlug) {
    return NextResponse.json(
      { error: `Ya existe una práctica con el slug '${input.slug}'.` },
      { status: 400 }
    )
  }

  // Insert
  const { data: practice, error: insertError } = await supabaseAdmin
    .from('practices')
    .insert({
      key: input.key,
      label: input.label,
      slug: input.slug,
      sort_order: input.sort_order,
      active: input.active,
    })
    .select('key, label, slug, sort_order, active')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      logError(new Error(insertError.message), {
        source: 'POST /api/admin/practices',
        step: 'insert-23505-race',
        input,
      })
      return NextResponse.json(
        { error: 'Conflicto de unicidad. Intentá de nuevo.' },
        { status: 400 }
      )
    }
    logError(new Error(insertError.message), {
      source: 'POST /api/admin/practices',
      step: 'insert',
      input,
    })
    return NextResponse.json({ error: 'Error al crear la práctica' }, { status: 500 })
  }

  bustPracticesCache()
  return NextResponse.json({ success: true, practice }, { status: 201 })
}
