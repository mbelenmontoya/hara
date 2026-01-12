// API endpoint for professional registration
// Creates a new professional with 'submitted' status for admin review

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Validation
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateWhatsApp(whatsapp: string): boolean {
  // Should start with + followed by 10-15 digits
  return /^\+\d{10,15}$/.test(whatsapp)
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Required fields validation
    const { full_name, email, whatsapp, country, modality, specialties, bio } = body

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
    
    // Check if slug exists and append number if needed
    const { data: existingSlugs } = await supabaseAdmin
      .from('professionals')
      .select('slug')
      .like('slug', `${slug}%`)

    if (existingSlugs && existingSlugs.length > 0) {
      slug = `${slug}-${existingSlugs.length + 1}`
    }

    // Insert professional
    const { data, error } = await supabaseAdmin
      .from('professionals')
      .insert({
        slug,
        status: 'submitted', // Requires admin approval
        full_name,
        email,
        whatsapp,
        country,
        city: body.city || null,
        online_only: body.online_only || false,
        modality,
        specialties,
        style: body.style || [],
        price_range_min: body.price_range_min || null,
        price_range_max: body.price_range_max || null,
        currency: body.currency || 'USD',
        accepting_new_clients: body.accepting_new_clients ?? true,
        bio,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      
      // Handle duplicate email
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
