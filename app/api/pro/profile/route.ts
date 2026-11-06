// POST /api/pro/profile — professional self-edit endpoint
// Resolves the professional by session user_id (ownership at data layer).
// Never writes email or id — ignores any client-supplied values for those fields.
// Mirrors the registration parser (app/api/professionals/register/route.ts) for field handling.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { uploadProfileImage } from '@/lib/storage'
import { validatePracticeKeys } from '@/lib/practices'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

function validateWhatsApp(whatsapp: string): boolean {
  const cleaned = whatsapp.replace(/[\s\-()]/g, '')
  return /^\+\d{7,15}$/.test(cleaned)
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

interface ParsedBody {
  full_name: string | null
  whatsapp: string
  country: string | null
  city: string | null
  bio: string
  modality: string[]
  specialties: string[]
  practices: string[]
  service_type: string[]
  online_only: boolean
  accepting_new_clients: boolean
  short_description: string | null
  experience_description: string | null
  instagram: string | null
  price_range_min: number | null
  price_range_max: number | null
  currency: string
  latitude: number | null
  longitude: number | null
  imageFile: File | null
}

async function parseBody(request: NextRequest): Promise<ParsedBody> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const fd = await request.formData()
    const imageFile = fd.get('profile_image') as File | null
    const minRaw = fd.get('price_range_min'), maxRaw = fd.get('price_range_max')
    return {
      full_name: fd.get('full_name') as string | null,
      whatsapp: (fd.get('whatsapp') as string | null) ?? '',
      country: fd.get('country') as string | null,
      city: (fd.get('city') as string | null) || null,
      bio: (fd.get('bio') as string | null) ?? '',
      modality: parseJsonArray(fd.get('modality')),
      specialties: parseJsonArray(fd.get('specialties')),
      practices: parseJsonArray(fd.get('practices')),
      service_type: parseJsonArray(fd.get('service_type')),
      online_only: fd.get('online_only') === 'true',
      accepting_new_clients: fd.get('accepting_new_clients') !== 'false',
      short_description: (fd.get('short_description') as string | null) || null,
      experience_description: (fd.get('experience_description') as string | null) || null,
      instagram: (fd.get('instagram') as string | null) || null,
      price_range_min: minRaw && minRaw !== '' ? parseInt(minRaw as string) : null,
      price_range_max: maxRaw && maxRaw !== '' ? parseInt(maxRaw as string) : null,
      currency: (fd.get('currency') as string | null) || 'USD',
      latitude: (() => { const v = parseFloat(fd.get('latitude') as string); return isNaN(v) ? null : v })(),
      longitude: (() => { const v = parseFloat(fd.get('longitude') as string); return isNaN(v) ? null : v })(),
      imageFile: imageFile instanceof File && imageFile.size > 0 ? imageFile : null,
    }
  }

  // JSON fallback (used by unit tests — same field names, no JSON-encoded arrays)
  const json = await request.json() as Record<string, unknown>
  return {
    full_name: (json.full_name as string | null) ?? null,
    whatsapp: (json.whatsapp as string | null) ?? '',
    country: (json.country as string | null) ?? null,
    city: (json.city as string | null) || null,
    bio: (json.bio as string | null) ?? '',
    modality: parseJsonArray(json.modality),
    specialties: parseJsonArray(json.specialties),
    practices: parseJsonArray(json.practices),
    service_type: parseJsonArray(json.service_type),
    online_only: json.online_only === true || json.online_only === 'true',
    accepting_new_clients: json.accepting_new_clients !== false && json.accepting_new_clients !== 'false',
    short_description: (json.short_description as string | null) || null,
    experience_description: (json.experience_description as string | null) || null,
    instagram: (json.instagram as string | null) || null,
    price_range_min: typeof json.price_range_min === 'number' ? json.price_range_min : null,
    price_range_max: typeof json.price_range_max === 'number' ? json.price_range_max : null,
    currency: (json.currency as string | null) || 'USD',
    latitude: typeof json.latitude === 'number' ? json.latitude : null,
    longitude: typeof json.longitude === 'number' ? json.longitude : null,
    imageFile: null,
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get session user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 2. Resolve professional by user_id — proves ownership at data layer
    const { data: pro } = await supabaseAdmin
      .from('professionals')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!pro?.id) {
      return NextResponse.json({ error: 'No tenés un perfil asociado' }, { status: 403 })
    }

    if (pro.status !== 'active') {
      return NextResponse.json({ error: 'Solo podés editar tu perfil cuando esté aprobado.' }, { status: 403 })
    }

    // 3. Parse body — accepts multipart/form-data (browser) or JSON (tests/API)
    const {
      full_name, whatsapp, country, city, bio,
      modality, specialties, practices, service_type,
      online_only, accepting_new_clients,
      short_description, experience_description, instagram,
      price_range_min, price_range_max, currency,
      latitude, longitude, imageFile,
    } = await parseBody(request)

    // NOTE: email and id are intentionally not read from the body — never written

    // 4. Validate required fields
    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    if (!validateWhatsApp(whatsapp)) {
      return NextResponse.json({ error: 'El WhatsApp debe contener solo números (7-15 dígitos con código de país)' }, { status: 400 })
    }

    if (!country?.trim()) {
      return NextResponse.json({ error: 'El país es requerido' }, { status: 400 })
    }

    if (!modality || modality.length === 0) {
      return NextResponse.json({ error: 'Seleccioná al menos una modalidad de atención' }, { status: 400 })
    }

    if (!specialties || specialties.length === 0) {
      return NextResponse.json({ error: 'Seleccioná al menos una especialidad' }, { status: 400 })
    }

    if (!bio || bio.length < 50) {
      return NextResponse.json({ error: 'La biografía debe tener al menos 50 caracteres' }, { status: 400 })
    }

    if (practices.length > 0) {
      const validation = await validatePracticeKeys(practices)
      if (!validation.ok) {
        return NextResponse.json({ error: `Práctica inválida: ${validation.invalidKey}` }, { status: 400 })
      }
    }

    // 5. Build update payload — never include email or id
    const updatePayload: Record<string, unknown> = {
      full_name: full_name.trim(),
      whatsapp,
      country,
      city,
      bio,
      modality,
      specialties,
      practices,
      service_type,
      online_only,
      accepting_new_clients,
      short_description,
      experience_description,
      instagram,
      price_range_min,
      price_range_max,
      currency,
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    }

    // 6. Handle image upload — non-blocking on failure
    if (imageFile instanceof File && imageFile.size > 0) {
      const uploadResult = await uploadProfileImage(imageFile, pro.id)
      if ('url' in uploadResult) {
        updatePayload.profile_image_url = uploadResult.url
      }
    }

    // 7. Write — using the resolved id (never a client-supplied one)
    const { error: updateError } = await supabaseAdmin
      .from('professionals')
      .update(updatePayload)
      .eq('id', pro.id)

    if (updateError) {
      logError(new Error(updateError.message), { source: 'POST /api/pro/profile', professionalId: pro.id })
      return NextResponse.json({ error: 'Error al guardar los cambios' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'POST /api/pro/profile' })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
