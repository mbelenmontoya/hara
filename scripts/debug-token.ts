// Debug: Check if token creation/verification works
import { config } from 'dotenv'
import { resolve } from 'path'
import { createAttributionToken, verifyAttributionToken } from '../lib/attribution-tokens.js'

config({ path: resolve(process.cwd(), '.env.local') })

async function debug() {
  console.log('Secret exists:', !!process.env.ATTRIBUTION_TOKEN_SECRET)
  console.log('Secret length:', process.env.ATTRIBUTION_TOKEN_SECRET?.length)

  const token = await createAttributionToken({
    match_id: '550e8400-e29b-41d4-a716-446655440000',
    professional_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    lead_id: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
    tracking_code: 'TEST-001',
    rank: 1,
  })

  console.log('Token created:', token.substring(0, 50) + '...')

  const verified = await verifyAttributionToken(token)
  console.log('Token verified:', verified !== null)
  console.log('Verified payload:', verified)
}

debug()
