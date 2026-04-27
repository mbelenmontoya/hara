// Integration test for the reviews collection flow
//
// PURPOSE: Assert that submit_review() RPC:
//   1. Inserts a review row
//   2. Marks the token consumed
//   3. Updates professionals.rating_average + rating_count (via DB trigger)
//   4. Updates ranking_score (via recompute_ranking() trigger chain)
//
// PREREQUISITES: migrations 004, 005, and 006 applied to Supabase.
// Tests skip gracefully when migration 006 is not applied.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ts = Date.now()
const slug = `reviews-flow-${ts}`

let migration006Applied = false
let professionalId = ''
let reviewRequestId = ''
let testToken = 'reviews-flow-test-token-' + ts

beforeAll(async () => {
  // Probe migration 006 (reviews table)
  const { error: probe } = await supabase.from('reviews').select('id').limit(1)
  if (probe) {
    console.warn('\n⚠  Reviews integration tests skipping — migration 006 not applied.\n')
    return
  }

  migration006Applied = true

  // Seed an active professional
  const { data: pro, error: proErr } = await supabase
    .from('professionals')
    .insert({
      slug, status: 'active', full_name: 'Reviews Flow Test Pro',
      email: `${slug}@test.invalid`,
      whatsapp: '+5491112345678', country: 'AR', modality: ['online'], specialties: ['ansiedad'],
      accepting_new_clients: true,
    })
    .select('id')
    .single()

  if (proErr || !pro) { console.error('Failed to seed professional:', proErr?.message); return }
  professionalId = pro.id

  // Seed a review_request token
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: req, error: reqErr } = await supabase
    .from('review_requests')
    .insert({
      professional_id: professionalId,
      contact_event_id: '00000000-0000-0000-0000-' + ts.toString().padStart(12, '0'),
      email: 'reviewer@test.invalid',
      token: testToken,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (reqErr || !req) { console.error('Failed to seed review_request:', reqErr?.message); return }
  reviewRequestId = req.id
})

afterAll(async () => {
  if (professionalId) {
    // Cascade deletes reviews + review_requests via FK
    await supabase.from('professionals').delete().eq('id', professionalId)
  }
  // Belt-and-suspenders
  await supabase.from('professionals').delete().like('slug', `reviews-flow-%`)
})

describe('submit_review() RPC', () => {
  it('inserts a review and updates professional aggregates', async () => {
    if (!migration006Applied) return

    const { data, error } = await supabase.rpc('submit_review', {
      p_token:         testToken,
      p_rating:        4,
      p_text:          'Excelente profesional.',
      p_reviewer_name: 'Testing',
    })

    expect(error).toBeNull()
    expect(data?.review_id).toBeTruthy()
    expect(data?.professional_id).toBe(professionalId)

    // Verify review row exists
    const { data: review } = await supabase
      .from('reviews')
      .select('rating, text, reviewer_name')
      .eq('id', data.review_id)
      .single()

    expect(review?.rating).toBe(4)
    expect(review?.text).toBe('Excelente profesional.')

    // Verify token consumed
    const { data: req } = await supabase
      .from('review_requests')
      .select('consumed_at')
      .eq('id', reviewRequestId)
      .single()

    expect(req?.consumed_at).not.toBeNull()

    // Verify aggregate updated
    const { data: pro } = await supabase
      .from('professionals')
      .select('rating_average, rating_count, ranking_score')
      .eq('id', professionalId)
      .single()

    expect(Number(pro?.rating_count)).toBe(1)
    expect(Number(pro?.rating_average)).toBe(4)
    // ranking_score should include some rating contribution
    expect(Number(pro?.ranking_score)).toBeGreaterThan(0)
  })

  it('returns token_consumed error when token is reused', async () => {
    if (!migration006Applied) return

    const { error } = await supabase.rpc('submit_review', {
      p_token:  testToken,
      p_rating: 5,
      p_text:   null,
      p_reviewer_name: null,
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('token_consumed')
  })
})
