// Hará Match - Attribution Token Library
// Purpose: Create and verify signed JWT tokens for PQL attribution
// Security: HS256 signature with 30-day expiration

import { SignJWT, jwtVerify } from 'jose'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TRACKING_CODE_REGEX = /^[A-Za-z0-9_-]{1,64}$/

function getSecret(): Uint8Array {
  if (!process.env.ATTRIBUTION_TOKEN_SECRET) {
    throw new Error('ATTRIBUTION_TOKEN_SECRET not configured')
  }
  return new TextEncoder().encode(process.env.ATTRIBUTION_TOKEN_SECRET)
}

export interface AttributionPayload {
  match_id: string
  professional_id: string
  lead_id: string
  tracking_code: string
  rank: number
}

export async function createAttributionToken(payload: AttributionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function verifyAttributionToken(token: string): Promise<AttributionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())

    // Validate UUIDs
    if (!UUID_REGEX.test(payload.match_id as string)) return null
    if (!UUID_REGEX.test(payload.professional_id as string)) return null
    if (!UUID_REGEX.test(payload.lead_id as string)) return null

    // Validate rank
    if (typeof payload.rank !== 'number' || payload.rank < 1 || payload.rank > 3) return null

    // Validate tracking_code
    if (!TRACKING_CODE_REGEX.test(payload.tracking_code as string)) return null

    return {
      match_id: payload.match_id as string,
      professional_id: payload.professional_id as string,
      lead_id: payload.lead_id as string,
      tracking_code: payload.tracking_code as string,
      rank: payload.rank as number,
    }
  } catch (err) {
    // Expected auth failures (invalid/expired tokens) - log without stacktrace
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.warn('Token verification rejected:', message)
    return null
  }
}
