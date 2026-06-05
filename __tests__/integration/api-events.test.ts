// Hara Vital - Integration Tests for /api/events
// Purpose: Verify billing-critical event ingestion works correctly.
// Requires: at least 1 active professional and 1 lead already in the DB.
// If that data is not there yet, the tests fail with a clear message.
//
// The match created in beforeAll is test infrastructure for the events under test.
// The professional and lead it references are real pre-existing data — never touched.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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
    // Load real active professional
    const { data: pro, error: proErr } = await supabaseAdmin
      .from('professionals')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single()

    if (proErr || !pro) {
      throw new Error(
        'Need at least 1 active professional in DB. ' +
        'Approve a professional in /admin/professionals first, then re-run.'
      )
    }

    testProId = pro.id

    // Load most recent real lead
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (leadErr || !lead) {
      throw new Error(
        'Need at least 1 lead in DB. Submit a /solicitar request first, then re-run.'
      )
    }

    testLeadId = lead.id

    // Create the test match — this is the container the events API operates on.
    // It references real professional + lead but is itself test-only and cleaned up in afterAll.
    testTrackingCode = `TEST-${Date.now()}`
    const { data: match, error: matchErr } = await supabaseAdmin
      .from('matches')
      .insert({ lead_id: testLeadId, tracking_code: testTrackingCode })
      .select()
      .single()

    if (matchErr || !match) {
      throw new Error(`Could not create test match: ${matchErr?.message}`)
    }

    testMatchId = match.id

    validToken = await createAttributionToken({
      match_id: testMatchId,
      professional_id: testProId,
      lead_id: testLeadId,
      tracking_code: testTrackingCode,
      rank: 1,
    })
  })

  afterAll(async () => {
    if (!testMatchId) return

    await supabaseAdmin.from('pql_adjustments').delete().in(
      'pql_id',
      (await supabaseAdmin.from('pqls').select('id').eq('match_id', testMatchId)).data?.map(p => p.id) ?? []
    )
    await supabaseAdmin.from('events').delete().eq('match_id', testMatchId)
    await supabaseAdmin.from('pqls').delete().eq('match_id', testMatchId)
    await supabaseAdmin.from('match_recommendations').delete().eq('match_id', testMatchId)
    await supabaseAdmin.from('matches').delete().eq('id', testMatchId)
  })

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

    const { data: events } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('match_id', testMatchId)
      .eq('professional_id', testProId)
      .eq('event_type', 'contact_click')

    expect(events).toHaveLength(1)
    expect(events![0].tracking_code).toBe(testTrackingCode)

    const pqls = await eventually(async () => {
      const { data } = await supabaseAdmin
        .from('pqls')
        .select('*')
        .eq('match_id', testMatchId)
        .eq('professional_id', testProId)
      return data && data.length > 0 ? data : null
    }, { timeout: 3000, errorMessage: 'PQL not created by trigger' })

    expect(pqls).toHaveLength(1)
    expect(pqls![0].tracking_code).toBe(testTrackingCode)
    expect(pqls![0].event_id).toBe(events![0].id)
    expect(pqls![0].event_created_at).toBe(events![0].created_at)
  })

  // Test 2: Idempotency - repeated clicks still 1 PQL
  it('maintains idempotency - 2 clicks create only 1 PQL', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000))

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
    await new Promise(resolve => setTimeout(resolve, 1000))

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
        fingerprint_hash: 'INVALID-NOT-SHA256',
        session_id: getUniqueSession(),
      }),
    })

    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)

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
    const isConfigured = url && !url.includes('your-redis') && url.startsWith('https://')

    if (!isConfigured) {
      if (requireTests) {
        throw new Error(
          'Rate limiting test REQUIRED but Upstash not configured. ' +
          'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local'
        )
      } else {
        console.log('⚠️  Rate limiting not tested (Upstash not configured)')
        return
      }
    }

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
          fingerprint_hash: undefined,
          session_id: sessionId,
        }),
      })

      if (response.status === 429) {
        hitLimit = true
        break
      }
    }

    expect(hitLimit).toBe(true)
  }, 30000)
})
