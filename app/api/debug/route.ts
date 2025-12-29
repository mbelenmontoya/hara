// Debug endpoint to check env vars
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function GET() {
  const secret = process.env.ATTRIBUTION_TOKEN_SECRET || ''
  const hash = createHash('sha256').update(secret).digest('hex').substring(0, 16)

  return NextResponse.json({
    has_supabase_url: !!process.env.SUPABASE_URL,
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_attribution_secret: !!process.env.ATTRIBUTION_TOKEN_SECRET,
    secret_length: process.env.ATTRIBUTION_TOKEN_SECRET?.length,
    secret_hash_prefix: hash,  // First 16 chars of SHA256(secret)
    secret_first_4: secret.substring(0, 4),  // First 4 chars of actual secret
  })
}
