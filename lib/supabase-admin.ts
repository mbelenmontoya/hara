// Hará Match - Supabase Admin Client
// Purpose: Service role client for server-side operations
// Security: NEVER expose service role key to client
//
// Note: SUPABASE_SERVICE_ROLE_KEY accepts both:
// - Legacy: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service_role JWT)
// - New: sb_secret_xxx (secret key format, same permissions)

import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
