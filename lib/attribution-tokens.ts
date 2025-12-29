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

    console.log('JWT verified, payload:', JSON.stringify(payload, null, 2))

    // Validate UUIDs
    if (!UUID_REGEX.test(payload.match_id as string)) {
      console.warn('Invalid match_id in token:', payload.match_id)
      return null
    }
    if (!UUID_REGEX.test(payload.professional_id as string)) {
      console.warn('Invalid professional_id in token:', payload.professional_id)
      return null
    }
    if (!UUID_REGEX.test(payload.lead_id as string)) {
      console.warn('Invalid lead_id in token:', payload.lead_id)
      return null
    }

    // Validate rank
    if (typeof payload.rank !== 'number' || payload.rank < 1 || payload.rank > 3) {
      console.warn('Invalid rank in token:', payload.rank, typeof payload.rank)
      return null
    }

    // Validate tracking_code
    if (!TRACKING_CODE_REGEX.test(payload.tracking_code as string)) {
      console.warn('Invalid tracking_code in token:', payload.tracking_code)
      return null
    }

    console.log('All validations passed')

    return {
      match_id: payload.match_id as string,
      professional_id: payload.professional_id as string,
      lead_id: payload.lead_id as string,
      tracking_code: payload.tracking_code as string,
      rank: payload.rank as number,
    }
  } catch (err) {
    console.error('JWT verification failed:', err)
    return null
  }
}
