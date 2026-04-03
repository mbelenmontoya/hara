// Hará Match — Supabase Storage helper
// Handles profile image uploads to the 'profile-images' bucket.
// Uses the service role client so uploads work server-side.

import { supabaseAdmin } from '@/lib/supabase-admin'

const BUCKET = 'profile-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface UploadResult {
  url: string
}

export interface UploadError {
  error: string
}

/**
 * Upload a profile image to Supabase Storage.
 * Stores as `{professionalId}.{ext}` — one image per professional, overwrites on re-upload.
 */
export async function uploadProfileImage(
  file: File,
  professionalId: string
): Promise<UploadResult | UploadError> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Formato no soportado. Usá JPG, PNG o WebP.' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'La imagen no puede pesar más de 5 MB.' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${professionalId}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    })

  if (error) {
    console.error('Storage upload error:', error)
    return { error: 'Error al subir la imagen.' }
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(path)

  return { url: urlData.publicUrl }
}
