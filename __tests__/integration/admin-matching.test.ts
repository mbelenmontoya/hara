// Hara Vital - Admin Matching & Billing Integration Tests
// Purpose: Verify admin matching + billing workflows against real DB data.
// Requires: at least 3 active professionals and 1 lead already in the DB.
// If that data is not there yet, the tests fail with a clear message.
//
// QA Requirements:
// 1. Match creation with 3 distinct professionals (constraints enforced)
// 2. Token generation for each recommendation
// 3. tracking_code present in all responses
// 4. pql_adjustments append-only (no pqls mutations)

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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

  // Tracks every match this test run creates so afterAll can clean them up.
  // Professionals and leads are real pre-existing data — never touched.
  const createdMatchIds: string[] = []

  beforeAll(async () => {
    // Load real active professionals — need at least 3
    const { data: pros, error: prosErr } = await supabaseAdmin
      .from('professionals')
      .select('id')
      .eq('status', 'active')
      .limit(3)

    if (prosErr) throw new Error(`Could not load professionals: ${prosErr.message}`)
    if (!pros || pros.length < 3) {
      throw new Error(
        `Need at least 3 active professionals in DB. Found ${pros?.length ?? 0}. ` +
        `Approve a professional in /admin/professionals first, then re-run.`
      )
    }

    testPro1Id = pros[0].id
    testPro2Id = pros[1].id
    testPro3Id = pros[2].id

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
  })

  afterAll(async () => {
    if (createdMatchIds.length === 0) return

    // Get pql IDs so we can remove pql_adjustments (FK dependency)
    const { data: pqls } = await supabaseAdmin
      .from('pqls')
      .select('id')
      .in('match_id', createdMatchIds)
    const pqlIds = (pqls ?? []).map(p => p.id)

    if (pqlIds.length > 0) {
      await supabaseAdmin.from('pql_adjustments').delete().in('pql_id', pqlIds)
    }

    await supabaseAdmin.from('events').delete().in('match_id', createdMatchIds)
    await supabaseAdmin.from('pqls').delete().in('match_id', createdMatchIds)
    await supabaseAdmin.from('match_recommendations').delete().in('match_id', createdMatchIds)
    await supabaseAdmin.from('matches').delete().in('id', createdMatchIds)
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

    createdMatchIds.push(json.match_id)

    // Verify 3 recommendations created
    const { data: recs } = await supabaseAdmin
      .from('match_recommendations')
      .select('*')
      .eq('match_id', json.match_id)
      .order('rank')

    expect(recs).toHaveLength(3)

    const professionalIds = recs!.map(r => r.professional_id)
    expect(new Set(professionalIds).size).toBe(3)
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

    createdMatchIds.push(json.match_id)

    expect(json.recommendations).toHaveLength(3)

    for (const rec of json.recommendations) {
      expect(rec.attribution_token).toBeDefined()
      expect(typeof rec.attribution_token).toBe('string')
      expect(rec.attribution_token.length).toBeGreaterThan(100)
      expect(rec.attribution_token.startsWith('eyJ')).toBe(true)
    }

    const tokens = json.recommendations.map((r: { attribution_token: string }) => r.attribution_token)
    expect(new Set(tokens).size).toBe(3)
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

    createdMatchIds.push(json.match_id)

    expect(json.tracking_code).toBeDefined()
    expect(json.tracking_code).toMatch(TRACKING_CODE_REGEX)

    const parts = json.tracking_code.split('-')
    expect(parts[0]).toBe('M')
    expect(parts[1]).toHaveLength(13)
    expect(parts[2]).toHaveLength(6)
    expect(parts[2]).toMatch(/^[A-Z0-9]+$/)

    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('tracking_code')
      .eq('id', json.match_id)
      .single()

    expect(match!.tracking_code).toBe(json.tracking_code)
  })

  // QA Requirement 4: pql_adjustments append-only (no UPDATE on pqls)
  it('creates adjustments without mutating pqls table', async () => {
    const { data: match } = await supabaseAdmin.from('matches').insert({
      lead_id: testLeadId,
      tracking_code: `ADJ-TEST-${Date.now()}`,
    }).select().single()

    createdMatchIds.push(match!.id)

    await supabaseAdmin.from('events').insert({
      event_type: 'contact_click',
      match_id: match!.id,
      professional_id: testPro1Id,
      lead_id: testLeadId,
      tracking_code: match!.tracking_code,
    })

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

    const { data: beforePql } = await supabaseAdmin
      .from('pqls').select('status').eq('id', pqlId).single()

    expect(beforePql!.status).toBe('active')

    const response = await fetch(`http://localhost:3000/api/admin/pqls/${pqlId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adjustment_type: 'waive',
        reason: 'Test waive - user never contacted',
        billing_month: '2025-01-01',
      }),
    })

    const json = await response.json()
    if (response.status !== 200) console.error('Adjustment failed:', json)

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.adjustment_id).toBeDefined()

    const { data: afterPql } = await supabaseAdmin
      .from('pqls').select('status').eq('id', pqlId).single()

    expect(afterPql!.status).toBe('active')

    const { data: adjustments } = await supabaseAdmin
      .from('pql_adjustments').select('*').eq('pql_id', pqlId)

    expect(adjustments).toHaveLength(1)
    expect(adjustments![0].adjustment_type).toBe('waive')
    expect(adjustments![0].reason).toBe('Test waive - user never contacted')

    const restoreResponse = await fetch(`http://localhost:3000/api/admin/pqls/${pqlId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adjustment_type: 'restore',
        reason: 'Dispute resolved - charge reinstated',
        billing_month: '2025-01-01',
      }),
    })

    expect(restoreResponse.status).toBe(200)

    const { data: allAdjustments } = await supabaseAdmin
      .from('pql_adjustments').select('*').eq('pql_id', pqlId).order('created_at')

    expect(allAdjustments).toHaveLength(2)
    expect(allAdjustments![0].adjustment_type).toBe('waive')
    expect(allAdjustments![1].adjustment_type).toBe('restore')

    const { data: finalPql } = await supabaseAdmin
      .from('pqls').select('status').eq('id', pqlId).single()

    expect(finalPql!.status).toBe('active')
  })

  // Test: billing_month normalization
  it('normalizes billing_month to YYYY-MM-01', async () => {
    const { data: m } = await supabaseAdmin.from('matches').insert({
      lead_id: testLeadId,
      tracking_code: 'NORM-' + Date.now(),
    }).select().single()

    createdMatchIds.push(m!.id)

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

    const r1 = await fetch('http://localhost:3000/api/admin/pqls/' + pql.id + '/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment_type: 'dispute', reason: 'Test', billing_month: '2025-01-15' }),
    })

    expect(r1.status).toBe(200)

    const { data: a1 } = await supabaseAdmin.from('pql_adjustments')
      .select('billing_month').eq('pql_id', pql.id).single()

    expect(a1!.billing_month).toBe('2025-01-01')

    const r2 = await fetch('http://localhost:3000/api/admin/pqls/' + pql.id + '/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment_type: 'waive', reason: 'Test', billing_month: '2025-02' }),
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

    createdMatchIds.push(m!.id)

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

    const r1 = await fetch('http://localhost:3000/api/admin/pqls/' + pql.id + '/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment_type: 'waive', reason: 'Test', billing_month: '2025/01' }),
    })

    expect(r1.status).toBe(400)
    const json1 = await r1.json()
    expect(json1.error).toContain('Invalid billing_month')

    const r2 = await fetch('http://localhost:3000/api/admin/pqls/' + pql.id + '/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment_type: 'waive', reason: 'Test', billing_month: 'January 2025' }),
    })

    expect(r2.status).toBe(400)
  })
})
