// Hara Vital — Professional access-link generator
// Generates a branded invite/recovery link using Supabase Admin auth,
// WITHOUT sending Supabase's own email. The caller embeds the link in a
// Resend email. Writes back user_id to the professionals table on first invite.

import { supabaseAdmin } from '@/lib/supabase-admin'
import { emailBaseUrl } from '@/lib/email'
import { roleOf } from '@/lib/admin-auth'

export interface ProAccessLink {
  setupUrl: string
  kind: 'invite' | 'recovery'
}

/**
 * Generate a branded set-password link for the given professional.
 *
 * Flow:
 *  1. Try generateLink({ type: 'invite', email }) — creates Auth user if new.
 *  2. If invite fails (user already exists), retry with type: 'recovery'.
 *  3. On success, read data.properties.hashed_token and build the callback URL.
 *     NOTE: Supabase names the response field `hashed_token`; the verifyOtp
 *     argument and URL query param are both named `token_hash` — same value,
 *     different names on either side of the wire.
 *  4. Give the auth user app_metadata.role = 'professional' (unless already admin or professional).
 *  5. Write user_id back to the professionals row only when currently null.
 *
 * Returns null on total failure (caller treats as non-blocking).
 */
export async function generateProAccessLink({
  email,
  professionalId,
}: {
  email: string
  professionalId: string
}): Promise<ProAccessLink | null> {
  try {
    let kind: 'invite' | 'recovery' = 'invite'
    let result = await supabaseAdmin.auth.admin.generateLink({ type: 'invite', email })

    if (result.error) {
      // User already exists — fall back to recovery link
      kind = 'recovery'
      result = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email })
    }

    if (result.error || !result.data?.properties?.hashed_token) {
      return null
    }

    // hashed_token (Supabase response) becomes token_hash (verifyOtp / URL param)
    const token_hash = result.data.properties.hashed_token
    const setupUrl = `${emailBaseUrl()}/pro/set-password?token_hash=${token_hash}&type=${kind}`

    // The professional role is what lets this user into /pro (middleware.ts). Never downgrade the admin.
    const authUser = result.data.user
    if (authUser && roleOf(authUser) === null) {
      const { error: roleError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        app_metadata: { ...(authUser.app_metadata ?? {}), role: 'professional' },
      })
      // Without the role the link would open a login that sends them away, so report failure instead
      if (roleError) return null
    }

    // Write user_id back only when the row has none yet (avoid clobbering)
    const authUserId = result.data.user?.id
    if (authUserId) {
      const { data: proRow } = await supabaseAdmin
        .from('professionals')
        .select('user_id')
        .eq('id', professionalId)
        .maybeSingle()

      if (proRow && proRow.user_id === null) {
        await supabaseAdmin
          .from('professionals')
          .update({ user_id: authUserId })
          .eq('id', professionalId)
          .is('user_id', null)
      }
    }

    return { setupUrl, kind }
  } catch {
    return null
  }
}
