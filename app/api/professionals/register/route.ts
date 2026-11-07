// API endpoint for professional registration
// Creates a new professional with 'submitted' status for admin review
// Accepts FormData (supports image upload) or JSON (backwards compatible)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyNewProfessional, notifyRegistrationReceived } from '@/lib/email'
import { uploadProfileImage } from '@/lib/storage'
import { validatePracticeKeys } from '@/lib/practices'
import { ratelimit } from '@/lib/rate-limit'
import { logError } from '@/lib/monitoring'

const PASSWORD_MIN = 8
const PASSWORD_MAX = 72
const EXISTING_ACCOUNT_MSG = 'Ya tenés una cuenta con este email. Entrá desde Hara o escribinos a centrovitalhara@gmail.com.'

// Validation
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateWhatsApp(whatsapp: string): boolean {
  // Accepts E.164 format from the form, or loose format with + prefix
  const cleaned = whatsapp.replace(/[\s\-()]/g, '')
  return /^\+\d{7,15}$/.test(cleaned)
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

function parseJsonArray(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function parseBody(request: NextRequest): Promise<{ fields: Record<string, unknown>; imageFile: File | null }> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const imageFile = formData.get('profile_image') as File | null
    const fields: Record<string, unknown> = {
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      whatsapp: formData.get('whatsapp'),
      instagram: formData.get('instagram') || null,
      country: formData.get('country'),
      city: formData.get('city') || null,
      online_only: formData.get('online_only') === 'true',
      modality: parseJsonArray(formData.get('modality')),
      specialties: parseJsonArray(formData.get('specialties')),
      practices: parseJsonArray(formData.get('practices')),
      service_type: parseJsonArray(formData.get('service_type')),
      price_range_min: formData.get('price_range_min') && formData.get('price_range_min') !== '' ? parseInt(formData.get('price_range_min') as string) : null,
      price_range_max: formData.get('price_range_max') && formData.get('price_range_max') !== '' ? parseInt(formData.get('price_range_max') as string) : null,
      currency: formData.get('currency') || 'USD',
      latitude: (() => { const v = parseFloat(formData.get('latitude') as string); return isNaN(v) ? null : v })(),
      longitude: (() => { const v = parseFloat(formData.get('longitude') as string); return isNaN(v) ? null : v })(),
      accepting_new_clients: formData.get('accepting_new_clients') !== 'false',
      short_description: formData.get('short_description') || null,
      bio: formData.get('bio'),
      experience_description: formData.get('experience_description') || null,
      password: formData.get('password'),
    }
    return { fields, imageFile: imageFile instanceof File && imageFile.size > 0 ? imageFile : null }
  }

  const json = await request.json()
  return { fields: json, imageFile: null }
}

/** Creates the applicant's login (role professional, already confirmed). Returns the user id or the response to send. */
async function createAccount(email: string, password: string): Promise<{ userId: string } | { response: NextResponse }> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'professional' },
  })
  if (error || !data.user) {
    const exists = error?.code === 'email_exists' || error?.code === 'user_already_exists'
    if (error?.code === 'weak_password') {
      return { response: NextResponse.json({ error: 'Elegí una contraseña más segura.' }, { status: 400 }) }
    }
    if (!exists) logError(new Error(error?.message ?? 'createUser returned no user'), { source: 'POST /api/professionals/register' })
    return { response: NextResponse.json({ error: exists ? EXISTING_ACCOUNT_MSG : 'No pudimos crear tu cuenta. Probá de nuevo.' }, { status: exists ? 409 : 500 }) }
  }
  return { userId: data.user.id }
}

async function rollbackAccount(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error
  } catch {
    logError(new Error('Could not roll back registration account'), { source: 'POST /api/professionals/register', userId })
  }
}

export async function POST(request: NextRequest) {
  let accountToRollback: string | null = null
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { success: allowed } = await ratelimit.limit(`register:ip:${ip}`, { limit: 5, window: '1 h' })
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en un rato.' }, { status: 429 })
    }

    const { fields, imageFile } = await parseBody(request)

    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return NextResponse.json({ error: 'Los datos del registro no son válidos' }, { status: 400 })
    }

    const full_name = typeof fields.full_name === 'string' ? fields.full_name.trim() : ''
    const email = typeof fields.email === 'string' ? fields.email : ''
    const whatsapp = typeof fields.whatsapp === 'string' ? fields.whatsapp : ''
    const country = typeof fields.country === 'string' ? fields.country.trim() : ''
    const modality = fields.modality
    const specialties = fields.specialties
    const bio = typeof fields.bio === 'string' ? fields.bio.trim() : ''

    if (!full_name || !email || !whatsapp || !country) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, email, whatsapp, país' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'El email no es válido' },
        { status: 400 }
      )
    }

    if (!validateWhatsApp(whatsapp)) {
      return NextResponse.json(
        { error: 'El WhatsApp debe contener solo números (10-15 dígitos)' },
        { status: 400 }
      )
    }

    if (!Array.isArray(modality) || modality.length === 0 ||
        !modality.every(value => typeof value === 'string' && value.trim().length > 0)) {
      return NextResponse.json(
        { error: 'Seleccioná al menos una modalidad de atención' },
        { status: 400 }
      )
    }

    if (!Array.isArray(specialties) || specialties.length === 0 ||
        !specialties.every(value => typeof value === 'string' && value.trim().length > 0)) {
      return NextResponse.json(
        { error: 'Seleccioná al menos una especialidad' },
        { status: 400 }
      )
    }

    if (!bio || bio.length < 50) {
      return NextResponse.json(
        { error: 'La biografía debe tener al menos 50 caracteres' },
        { status: 400 }
      )
    }

    const password = typeof fields.password === 'string' ? fields.password : ''
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return NextResponse.json(
        { error: `La contraseña tiene que tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres` },
        { status: 400 }
      )
    }

    const practices = (fields.practices as string[]) || []
    if (practices.length > 0) {
      const validation = await validatePracticeKeys(practices)
      if (!validation.ok) {
        return NextResponse.json(
          { error: `Práctica inválida: ${validation.invalidKey}` },
          { status: 400 }
        )
      }
    }

    // Cooldown check — block re-applications from rejected pros within their
    // 60-day cooldown window. Looks up the most recent rejected row for this
    // email and short-circuits with a 403 if `resubmit_after > NOW()`.
    // Race note: parallel re-applications at expiry can both pass this SELECT;
    // the partial UNIQUE on (email) WHERE status != 'rejected' (migration 011)
    // catches the second INSERT with 23505 — the existing dup-email guard at
    // the bottom of this handler returns the appropriate error.
    const { data: priorRejected } = await supabaseAdmin
      .from('professionals')
      .select('id, created_at, resubmit_after')
      .eq('email', email)
      .eq('status', 'rejected')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (priorRejected?.resubmit_after && new Date(priorRejected.resubmit_after) > new Date()) {
      // TODO(bel): `previous_application_at` is the original submission date,
      // not the rejection date. PRD copy "Ya aplicaste el [fecha]" maps to
      // created_at literally. If we'd rather show the rejection date, surface
      // updated_at or add a rejected_at column. See plan Open Questions.
      const fmt = (d: string) =>
        new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
      const previousAppliedAt = fmt(priorRejected.created_at)
      const resubmitAfterFmt = fmt(priorRejected.resubmit_after)
      return NextResponse.json(
        {
          error: `Ya aplicaste a Hara el ${previousAppliedAt}. Podés volver a aplicar a partir del ${resubmitAfterFmt}. Si tenés preguntas, escribinos a centrovitalhara@gmail.com.`,
          resubmit_after: priorRejected.resubmit_after,
          previous_application_at: priorRejected.created_at,
        },
        { status: 403 }
      )
    }

    // Generate unique slug
    let slug = generateSlug(full_name)

    const { data: existingSlugs } = await supabaseAdmin
      .from('professionals')
      .select('slug')
      .like('slug', `${slug}%`)

    if (existingSlugs && existingSlugs.length > 0) {
      slug = `${slug}-${existingSlugs.length + 1}`
    }

    // The login comes first so the row can point at it; it is deleted again if the row cannot be saved
    const account = await createAccount(email, password)
    if ('response' in account) return account.response
    accountToRollback = account.userId

    // Insert professional (without image first: need the ID for the image path)
    const { data, error } = await supabaseAdmin
      .from('professionals')
      .insert({
        slug,
        status: 'submitted',
        full_name,
        email,
        whatsapp,
        country,
        city: (fields.city as string) || null,
        latitude: (fields.latitude as number | null) ?? null,
        longitude: (fields.longitude as number | null) ?? null,
        online_only: (fields.online_only as boolean) || false,
        modality,
        specialties,
        practices: (fields.practices as string[]) || [],
        service_type: (fields.service_type as string[]) || [],
        price_range_min: (fields.price_range_min as number) || null,
        price_range_max: (fields.price_range_max as number) || null,
        currency: (fields.currency as string) || 'USD',
        accepting_new_clients: (fields.accepting_new_clients as boolean) ?? true,
        short_description: (fields.short_description as string) || null,
        bio,
        experience_description: (fields.experience_description as string) || null,
        instagram: (fields.instagram as string) || null,
        user_id: account.userId,
      })
      .select()
      .single()

    if (error) {
      await rollbackAccount(account.userId)
      accountToRollback = null
      logError(new Error('Could not save registration profile'), { source: 'POST /api/professionals/register', code: error.code })

      if (error.code === '23505' && error.message.includes('email')) {
        return NextResponse.json(
          { error: 'Ya existe una cuenta con este email' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Error al guardar el perfil' },
        { status: 500 }
      )
    }
    accountToRollback = null

    // Upload image if provided — now we have the professional ID
    if (imageFile) {
      const uploadResult = await uploadProfileImage(imageFile, data.id)

      if ('url' in uploadResult) {
        await supabaseAdmin
          .from('professionals')
          .update({ profile_image_url: uploadResult.url })
          .eq('id', data.id)
      }
      // Image upload failure is non-blocking — profile is already saved
    }

    // Notify admin — fire and forget
    notifyNewProfessional({
      id: data.id,
      full_name,
      email,
      whatsapp,
      country,
      specialties,
    }).catch(() => {})

    // Confirmation to the pro — fire and forget. Closes the silence between
    // submit and admin decision. Email failure must not block the response.
    notifyRegistrationReceived({
      to: email,
      full_name,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Perfil enviado correctamente',
      slug: data.slug,
    })

  } catch (err) {
    if (accountToRollback) await rollbackAccount(accountToRollback)
    logError(new Error('Registration failed'), { source: 'POST /api/professionals/register' })
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
