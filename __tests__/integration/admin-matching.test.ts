// Hará Match - Week 3 Integration Tests
// Purpose: Verify admin matching + billing workflows
// QA Requirements:
// 1. Match creation with 3 distinct professionals (constraints enforced)
// 2. Token generation for each recommendation
// 3. tracking_code present in all responses
// 4. pql_adjustments append-only (no pqls mutations)

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { eventually } from '../helpers/eventually'
import { TRACKING_CODE_REGEX } from '@/lib/tracking-code'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Admin Matching & Billing (Week 3)', () => {
  let testLeadId: string
  let testPro1Id: string
  let testPro2Id: string
  let testPro3Id: string

  beforeAll(async () => {
    // Create 3 distinct professionals
    const timestamp = Date.now()
    const pros = []

    for (let i = 1; i <= 3; i++) {
      const { data } = await supabaseAdmin.from('professionals').insert({
        slug: `admin-test-pro-${timestamp}-${i}`,
        full_name: `Admin Test Pro ${i}`,
        email: `admin-test-${timestamp}-${i}@test.com`,
        whatsapp: `+549111234567${i}`,
        country: 'AR',
        modality: ['therapy'],
        specialties: ['anxiety'],
        status: 'active',
      }).select().single()

      pros.push(data)
    }

    testPro1Id = pros[0]!.id
    testPro2Id = pros[1]!.id
    testPro3Id = pros[2]!.id

    // Create test lead
    const { data: lead } = await supabaseAdmin.from('leads').insert({
      country: 'AR',
      intent_tags: ['anxiety'],
    }).select().single()

    testLeadId = lead!.id
  })

  // QA Requirement 1: Match with 3 distinct professionals (constraints enforced)
  it('creates match with 3 distinct professionals and enforces constraints', async () => {
    const response = await fetch('http://localhost:3000/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: testLeadId,
        recommendations: [
          { professional_id: testPro1Id, rank: 1, reasons: ['Reason 1'] },
          { professional_id: testPro2Id, rank: 2, reasons: ['Reason 2'] },
          { professional_id: testPro3Id, rank: 3, reasons: ['Reason 3'] },
        ],
      }),
    })

    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.match_id).toBeDefined()
    expect(json.tracking_code).toBeDefined()

    // Verify 3 recommendations created
    const { data: recs } = await supabaseAdmin
      .from('match_recommendations')
      .select('*')
      .eq('match_id', json.match_id)
      .order('rank')

    expect(recs).toHaveLength(3)

    // Verify distinct professionals
    const professionalIds = recs!.map(r => r.professional_id)
    const uniqueIds = new Set(professionalIds)
    expect(uniqueIds.size).toBe(3)

    // Verify ranks are 1, 2, 3
    expect(recs![0].rank).toBe(1)
    expect(recs![1].rank).toBe(2)
    expect(recs![2].rank).toBe(3)
  })

  // QA Requirement 1b: Constraint violation when same professional twice
  it('rejects match with duplicate professional', async () => {
    const response = await fetch('http://localhost:3000/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: testLeadId,
        recommendations: [
          { professional_id: testPro1Id, rank: 1, reasons: ['Reason 1'] },
          { professional_id: testPro1Id, rank: 2, reasons: ['Reason 2'] },  // Same pro!
          { professional_id: testPro3Id, rank: 3, reasons: ['Reason 3'] },
        ],
      }),
    })

    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('3 distinct professionals required')
  })

  // QA Requirement 2: Token generation for each recommendation
  it('generates valid attribution token for each recommendation', async () => {
    const response = await fetch('http://localhost:3000/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: testLeadId,
        recommendations: [
          { professional_id: testPro1Id, rank: 1, reasons: ['Test'] },
          { professional_id: testPro2Id, rank: 2, reasons: ['Test'] },
          { professional_id: testPro3Id, rank: 3, reasons: ['Test'] },
        ],
      }),
    })

    const json = await response.json()

    expect(json.recommendations).toHaveLength(3)

    // Verify each has attribution_token
    for (const rec of json.recommendations) {
      expect(rec.attribution_token).toBeDefined()
      expect(typeof rec.attribution_token).toBe('string')
      expect(rec.attribution_token.length).toBeGreaterThan(100)  // JWT format
      expect(rec.attribution_token.startsWith('eyJ')).toBe(true)  // JWT starts with eyJ
    }

    // Verify tokens are different (each has different professional_id)
    const tokens = json.recommendations.map((r: any) => r.attribution_token)
    const uniqueTokens = new Set(tokens)
    expect(uniqueTokens.size).toBe(3)
  })

  // QA Requirement 3: tracking_code present in responses
  it('includes tracking_code in match creation response', async () => {
    const response = await fetch('http://localhost:3000/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: testLeadId,
        recommendations: [
          { professional_id: testPro1Id, rank: 1, reasons: ['Test'] },
          { professional_id: testPro2Id, rank: 2, reasons: ['Test'] },
          { professional_id: testPro3Id, rank: 3, reasons: ['Test'] },
        ],
      }),
    })

    const json = await response.json()

    // tracking_code in response (exact format: M-<13digits>-<6chars>)
    expect(json.tracking_code).toBeDefined()
    expect(json.tracking_code).toMatch(TRACKING_CODE_REGEX)

    // Verify components
    const parts = json.tracking_code.split('-')
    expect(parts[0]).toBe('M')
    expect(parts[1]).toHaveLength(13)  // Timestamp
    expect(parts[2]).toHaveLength(6)   // Nanoid
    expect(parts[2]).toMatch(/^[A-Z0-9]+$/)  // Uppercase alphanumeric only

    // tracking_code in database
    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('tracking_code')
      .eq('id', json.match_id)
      .single()

    expect(match!.tracking_code).toBe(json.tracking_code)
  })

  // QA Requirement 4: pql_adjustments append-only (no UPDATE on pqls)
  it('creates adjustments without mutating pqls table', async () => {
    // Create match and event first (FK requirements)
    const { data: match } = await supabaseAdmin.from('matches').insert({
      lead_id: testLeadId,
      tracking_code: `ADJ-TEST-${Date.now()}`,
    }).select().single()

    const { data: event } = await supabaseAdmin.from('events').insert({
      event_type: 'contact_click',
      match_id: match!.id,
      professional_id: testPro1Id,
      lead_id: testLeadId,
      tracking_code: match!.tracking_code,
    }).select().single()

    // Wait for trigger to create PQL (poll until exists)
    const pql = await eventually(async () => {
      const { data } = await supabaseAdmin
        .from('pqls')
        .select('*')
        .eq('match_id', match!.id)
        .eq('professional_id', testPro1Id)
        .single()

      return data
    }, { timeout: 3000, errorMessage: 'PQL not created by trigger' })

    const pqlId = pql.id

    // Verify PQL status before adjustment
    const { data: beforePql } = await supabaseAdmin
      .from('pqls')
      .select('status')
      .eq('id', pqlId)
      .single()

    expect(beforePql!.status).toBe('active')

    // Create waive adjustment (created_by extracted from auth, not request)
    const response = await fetch(`http://localhost:3000/api/admin/pqls/${pqlId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adjustment_type: 'waive',
        reason: 'Test waive - user never contacted',
        billing_month: '2025-01-01',
        // created_by NOT sent (server extracts from auth)
      }),
    })

    const json = await response.json()

    if (response.status !== 200) {
      console.error('Adjustment failed:', json)
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.adjustment_id).toBeDefined()

    // Verify PQL status UNCHANGED (append-only)
    const { data: afterPql } = await supabaseAdmin
      .from('pqls')
      .select('status')
      .eq('id', pqlId)
      .single()

    expect(afterPql!.status).toBe('active')  // UNCHANGED

    // Verify adjustment recorded
    const { data: adjustments } = await supabaseAdmin
      .from('pql_adjustments')
      .select('*')
      .eq('pql_id', pqlId)

    expect(adjustments).toHaveLength(1)
    expect(adjustments![0].adjustment_type).toBe('waive')
    expect(adjustments![0].reason).toBe('Test waive - user never contacted')

    // Create restore adjustment (reverse waive)
    const restoreResponse = await fetch(`http://localhost:3000/api/admin/pqls/${pqlId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adjustment_type: 'restore',
        reason: 'Dispute resolved - charge reinstated',
        billing_month: '2025-01-01',
        // created_by NOT sent (server extracts from auth)
      }),
    })

    expect(restoreResponse.status).toBe(200)

    // Verify 2 adjustment rows exist (both preserved)
    const { data: allAdjustments } = await supabaseAdmin
      .from('pql_adjustments')
      .select('*')
      .eq('pql_id', pqlId)
      .order('created_at')

    expect(allAdjustments).toHaveLength(2)
    expect(allAdjustments![0].adjustment_type).toBe('waive')
    expect(allAdjustments![1].adjustment_type).toBe('restore')

    // Verify PQL table STILL unchanged
    const { data: finalPql } = await supabaseAdmin
      .from('pqls')
      .select('status')
      .eq('id', pqlId)
      .single()

    expect(finalPql!.status).toBe('active')  // Never mutated
  })

  // Test: billing_month normalization
  it('normalizes billing_month to YYYY-MM-01', async () => {
    const ts = Date.now()
    const { data: m } = await supabaseAdmin.from('matches').insert({
      lead_id: testLeadId,
      tracking_code: 'NORM-' + ts,
    }).select().single()

    await supabaseAdmin.from('events').insert({
      event_type: 'contact_click',
      match_id: m!.id,
      professional_id: testPro1Id,
      lead_id: testLeadId,
      tracking_code: m!.tracking_code,
    })

    const pql = await eventually(async () => {
      const { data } = await supabaseAdmin.from('pqls').select('*').eq('match_id', m!.id).single()
      return data
    })

    // Mid-month → first
    const r1 = await fetch('http://localhost:3000/api/admin/pqls/' + pql.id + '/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adjustment_type: 'dispute',
        reason: 'Test',
        billing_month: '2025-01-15',
      }),
    })

    expect(r1.status).toBe(200)

    const { data: a1 } = await supabaseAdmin.from('pql_adjustments')
      .select('billing_month').eq('pql_id', pql.id).single()

    expect(a1!.billing_month).toBe('2025-01-01')

    // YYYY-MM → first
    const r2 = await fetch('http://localhost:3000/api/admin/pqls/' + pql.id + '/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adjustment_type: 'waive',
        reason: 'Test',
        billing_month: '2025-02',
      }),
    })

    expect(r2.status).toBe(200)

    const { data: a2 } = await supabaseAdmin.from('pql_adjustments')
      .select('billing_month').order('created_at', { ascending: false }).limit(1).single()

    expect(a2!.billing_month).toBe('2025-02-01')
  })

  // Test: invalid billing_month rejected
  it('rejects invalid billing_month format with 400', async () => {
    const { data: m } = await supabaseAdmin.from('matches').insert({
      lead_id: testLeadId,
      tracking_code: 'INV-' + Date.now(),
    }).select().single()

    await supabaseAdmin.from('events').insert({
      event_type: 'contact_click',
      match_id: m!.id,
      professional_id: testPro1Id,
      lead_id: testLeadId,
      tracking_code: m!.tracking_code,
    })

    const pql = await eventually(async () => {
      const { data } = await supabaseAdmin.from('pqls').select('*').eq('match_id', m!.id).single()
      return data
    })

    // Invalid format: slash instead of dash
    const r1 = await fetch('http://localhost:3000/api/admin/pqls/' + pql.id + '/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adjustment_type: 'waive',
        reason: 'Test',
        billing_month: '2025/01',  // Invalid format
      }),
    })

    expect(r1.status).toBe(400)
    const json1 = await r1.json()
    expect(json1.error).toContain('Invalid billing_month')

    // Invalid format: text
    const r2 = await fetch('http://localhost:3000/api/admin/pqls/' + pql.id + '/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adjustment_type: 'waive',
        reason: 'Test',
        billing_month: 'January 2025',
      }),
    })

    expect(r2.status).toBe(400)
  })
})
