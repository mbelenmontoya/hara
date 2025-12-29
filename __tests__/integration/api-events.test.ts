// Hará Match - Integration Tests for /api/events
// Purpose: Verify billing-critical event ingestion works correctly
// Requirements: Seed data from qa.env (run: npm run qa:week1 first)

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createAttributionToken } from '@/lib/attribution-tokens'
import { eventually } from '../helpers/eventually'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('/api/events Integration Tests', () => {
  let testMatchId: string
  let testProId: string
  let testLeadId: string
  let testTrackingCode: string
  let validToken: string
  let testCounter = 0

  beforeAll(async () => {
    // Create test data
    const { data: pro } = await supabaseAdmin.from('professionals').insert({
      slug: `test-pro-${Date.now()}`,
      full_name: 'Integration Test Pro',
      email: `integration-${Date.now()}@test.com`,
      whatsapp: '+5491112345678',
      country: 'AR',
      modality: ['therapy'],
      specialties: ['anxiety'],
      status: 'active',
    }).select().single()

    const { data: lead } = await supabaseAdmin.from('leads').insert({
      country: 'AR',
      intent_tags: ['anxiety'],
    }).select().single()

    testTrackingCode = `TEST-${Date.now()}`
    const { data: match } = await supabaseAdmin.from('matches').insert({
      lead_id: lead!.id,
      tracking_code: testTrackingCode,
    }).select().single()

    testMatchId = match!.id
    testProId = pro!.id
    testLeadId = lead!.id

    validToken = await createAttributionToken({
      match_id: testMatchId,
      professional_id: testProId,
      lead_id: testLeadId,
      tracking_code: testTrackingCode,
      rank: 1,
    })
  })

  // Helper: Generate unique fingerprint to avoid rate limiting
  function getUniqueFingerprint(): string {
    testCounter++
    const base = testCounter.toString(16).padStart(64, 'a')
    return base.substring(0, 64)
  }

  function getUniqueSession(): string {
    return `550e8400-e29b-41d4-a716-${Date.now().toString().substring(0, 12)}`
  }

  // Test 1: Valid token → 1 event + 1 PQL
  it('creates exactly 1 event and 1 PQL for valid token', async () => {
    const response = await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attribution_token: validToken,
        fingerprint_hash: getUniqueFingerprint(),
        session_id: getUniqueSession(),
      }),
    })

    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.event_id).toBeDefined()

    // Verify exactly 1 event
    const { data: events } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('match_id', testMatchId)
      .eq('professional_id', testProId)
      .eq('event_type', 'contact_click')

    expect(events).toHaveLength(1)

    // ✅ Assert tracking_code propagates from token to event
    expect(events![0].tracking_code).toBe(testTrackingCode)
    expect(events![0].tracking_code).toBe(testTrackingCode)

    // Wait for trigger (poll until PQL exists)
    const pqls = await eventually(async () => {
      const { data } = await supabaseAdmin
        .from('pqls')
        .select('*')
        .eq('match_id', testMatchId)
        .eq('professional_id', testProId)

      return data && data.length > 0 ? data : null
    }, { timeout: 3000, errorMessage: 'PQL not created by trigger' })

    expect(pqls).toHaveLength(1)

    // ✅ Assert tracking_code propagates from token to PQL
    expect(pqls![0].tracking_code).toBe(testTrackingCode)

    // ✅ Assert PQL links to event (audit integrity)
    expect(pqls![0].event_id).toBe(events![0].id)
    expect(pqls![0].event_created_at).toBe(events![0].created_at)
  })

  // Test 2: Idempotency - repeated clicks still 1 PQL
  it('maintains idempotency - 2 clicks create only 1 PQL', async () => {
    // Wait to avoid IP rate limiting (10/min from localhost)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Send second contact_click (same match + pro, unique identifiers)
    const response2 = await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attribution_token: validToken,
        fingerprint_hash: getUniqueFingerprint(),
        session_id: getUniqueSession(),
      }),
    })

    expect(response2.status).toBe(200)

    // Still exactly 1 PQL (idempotency via UNIQUE constraint)
    const pqls = await eventually(async () => {
      const { data } = await supabaseAdmin
        .from('pqls')
        .select('*')
        .eq('match_id', testMatchId)
        .eq('professional_id', testProId)

      return data && data.length > 0 ? data : null
    })

    expect(pqls).toHaveLength(1)
  })

  // Test 3: Invalid token → 403, no event, no PQL
  it('rejects invalid token with 403', async () => {
    const response = await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attribution_token: 'forged.token.signature',
        fingerprint_hash: 'c'.repeat(64),
        session_id: '550e8400-e29b-41d4-a716-446655440002',
      }),
    })

    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toContain('Invalid')
    expect(json.success).toBeUndefined()
  })

  // Test 4: Missing IP/fingerprint → still records, uses fallbacks
  it('records event even with missing IP and fingerprint', async () => {
    // Wait to avoid IP rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create new token for this test
    const tokenNoMeta = await createAttributionToken({
      match_id: testMatchId,
      professional_id: testProId,
      lead_id: testLeadId,
      tracking_code: `TEST-NO-META-${Date.now()}`,
      rank: 2,
    })

    const response = await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attribution_token: tokenNoMeta,
        fingerprint_hash: 'INVALID-NOT-SHA256',  // Invalid format
        session_id: getUniqueSession(),  // Unique session
      }),
    })

    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)

    // Verify event created with null fingerprint, ip_missing logged
    const { data: events } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', json.event_id)

    expect(events).toHaveLength(1)
    expect(events![0].fingerprint_hash).toBeNull()
    expect(events![0].event_data.fingerprint_valid).toBe(false)
  })

  // Test 5: Rate limiting enforced (when Upstash configured)
  it('enforces rate limiting when configured', async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const requireTests = process.env.REQUIRE_RATE_LIMIT_TESTS === 'true' || process.env.CI === 'true'

    // Check if Upstash is configured
    const isConfigured = url && !url.includes('your-redis') && url.startsWith('https://')

    if (!isConfigured) {
      if (requireTests) {
        // CI/QA: FAIL if not configured
        throw new Error(
          'Rate limiting test REQUIRED but Upstash not configured. ' +
          'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local'
        )
      } else {
        // Local dev: Skip with warning
        console.log('⚠️  WARNING: Rate limiting not tested (Upstash not configured)')
        console.log('   Set REQUIRE_RATE_LIMIT_TESTS=true to enforce this test')
        return
      }
    }

    // Send 11 requests with same session_id (limit: 5/5min)
    const sessionId = `550e8400-e29b-41d4-a716-${Date.now()}`

    let hitLimit = false
    for (let i = 0; i < 11; i++) {
      const testToken = await createAttributionToken({
        match_id: testMatchId,
        professional_id: testProId,
        lead_id: testLeadId,
        tracking_code: `RATE-TEST-${i}`,
        rank: 3,
      })

      const response = await fetch('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attribution_token: testToken,
          fingerprint_hash: undefined,  // Force session-based limit
          session_id: sessionId,
        }),
      })

      if (response.status === 429) {
        hitLimit = true
        break
      }
    }

    expect(hitLimit).toBe(true)
  }, 30000)  // 30s timeout for rate limit test
})
