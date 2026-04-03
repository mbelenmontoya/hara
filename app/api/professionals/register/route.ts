// API endpoint for professional registration
// Creates a new professional with 'submitted' status for admin review
// Accepts FormData (supports image upload) or JSON (backwards compatible)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyNewProfessional } from '@/lib/email'
import { uploadProfileImage } from '@/lib/storage'

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
      style: parseJsonArray(formData.get('style')),
      service_type: parseJsonArray(formData.get('service_type')),
      price_range_min: formData.get('price_range_min') && formData.get('price_range_min') !== '' ? parseInt(formData.get('price_range_min') as string) : null,
      price_range_max: formData.get('price_range_max') && formData.get('price_range_max') !== '' ? parseInt(formData.get('price_range_max') as string) : null,
      currency: formData.get('currency') || 'USD',
      accepting_new_clients: formData.get('accepting_new_clients') !== 'false',
      short_description: formData.get('short_description') || null,
      bio: formData.get('bio'),
      experience_description: formData.get('experience_description') || null,
    }
    return { fields, imageFile: imageFile instanceof File && imageFile.size > 0 ? imageFile : null }
  }

  const json = await request.json()
  return { fields: json, imageFile: null }
}

export async function POST(request: NextRequest) {
  try {
    const { fields, imageFile } = await parseBody(request)

    const full_name = fields.full_name as string
    const email = fields.email as string
    const whatsapp = (fields.whatsapp as string) || ''
    const country = fields.country as string
    const modality = fields.modality as string[]
    const specialties = fields.specialties as string[]
    const bio = fields.bio as string

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

    if (!modality || modality.length === 0) {
      return NextResponse.json(
        { error: 'Seleccioná al menos una modalidad de atención' },
        { status: 400 }
      )
    }

    if (!specialties || specialties.length === 0) {
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

    // Generate unique slug
    let slug = generateSlug(full_name)

    const { data: existingSlugs } = await supabaseAdmin
      .from('professionals')
      .select('slug')
      .like('slug', `${slug}%`)

    if (existingSlugs && existingSlugs.length > 0) {
      slug = `${slug}-${existingSlugs.length + 1}`
    }

    // Insert professional (without image first — need the ID for the image path)
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
        online_only: (fields.online_only as boolean) || false,
        modality,
        specialties,
        style: (fields.style as string[]) || [],
        service_type: (fields.service_type as string[]) || [],
        price_range_min: (fields.price_range_min as number) || null,
        price_range_max: (fields.price_range_max as number) || null,
        currency: (fields.currency as string) || 'USD',
        accepting_new_clients: (fields.accepting_new_clients as boolean) ?? true,
        short_description: (fields.short_description as string) || null,
        bio,
        experience_description: (fields.experience_description as string) || null,
        instagram: (fields.instagram as string) || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)

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

    return NextResponse.json({
      success: true,
      message: 'Perfil enviado correctamente',
      slug: data.slug,
    })

  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
