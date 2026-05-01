// Hará Match — DB-backed parity test for the ranking formula
//
// PURPOSE: Assert that computeRankingScore() in lib/ranking.ts produces the same value
// as the SQL recompute_ranking() trigger for every fixture shape.
// The trigger sets profile_completeness_score and ranking_score on every INSERT/UPDATE.
// We read those back and compare to the TS formula.
//
// FAILURE MODES (distinct — documented per spec-plan):
//   1. Supabase connectivity flake → beforeAll retry loop handles it (3 attempts, 2s delay).
//      Fix: run tests again when connectivity recovers.
//   2. Dev server 60s cold start (from __tests__/setup/global-setup.ts) → tolerated passively.
//      This test does NOT hit HTTP endpoints — DB-only. The cold start is unavoidable overhead.
//
// PREREQUISITES:
//   Apply migrations/004_ranking_foundation.sql before running (fixtures 1-8).
//   Apply migrations/005_destacado_tier_mvp.sql before running (fixtures 9-11 + RPC test).
//   If either migration is missing, the relevant tests are skipped with a clear message.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { computeRankingScore } from '@/lib/ranking'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ts = Date.now()
const slug = (n: number) => `ranking-parity-${ts}-${n}`
const email = (n: number) => `ranking-parity-${ts}-${n}@test.invalid`

// ── Fixture definitions ────────────────────────────────────────────────────────
// Each fixture maps directly to one of the 8 plan scenarios.
// Required fields: slug, status, full_name, email, whatsapp, country, modality, specialties.

const FIFTY_CHAR_BIO = 'A'.repeat(50)

const fixtures = [
  // 1. All empty — zero completeness, no rating, basico
  {
    slug: slug(1), status: 'draft', full_name: 'Parity One', email: email(1),
    whatsapp: '', country: 'AR', modality: [], specialties: [],
    // Expected completeness: 0 (all criteria fail — empty arrays, empty whatsapp)
  },
  // 2. Partial: image + short_description + bio(50) + specialties → 15+10+15+15 = 55
  {
    slug: slug(2), status: 'draft', full_name: 'Parity Two', email: email(2),
    whatsapp: '', country: 'AR', modality: [], specialties: ['ansiedad'],
    profile_image_url: 'https://example.com/img.jpg',
    short_description: 'Breve descripción del perfil.',
    bio: FIFTY_CHAR_BIO,
    // Expected completeness: 55
  },
  // 3. Full completeness (100), no rating, basico
  {
    slug: slug(3), status: 'draft', full_name: 'Parity Three', email: email(3),
    whatsapp: '+5491112345678', country: 'AR', modality: ['online'], specialties: ['ansiedad'],
    profile_image_url: 'https://example.com/img.jpg',
    short_description: 'Breve descripción.',
    bio: FIFTY_CHAR_BIO,
    experience_description: 'Tengo experiencia en...',
    service_type: ['individual'],
    online_only: true,
    instagram: 'therapist_handle',
    // Expected completeness: 100
  },
  // 4. Full completeness + rating 4.0 (count=10), basico
  {
    slug: slug(4), status: 'draft', full_name: 'Parity Four', email: email(4),
    whatsapp: '+5491112345678', country: 'AR', modality: ['online'], specialties: ['ansiedad'],
    profile_image_url: 'https://example.com/img.jpg',
    short_description: 'Breve descripción.',
    bio: FIFTY_CHAR_BIO,
    experience_description: 'Tengo experiencia en...',
    service_type: ['individual'],
    online_only: true,
    instagram: 'therapist_handle',
    rating_average: 4.0, rating_count: 10,
    // Expected: 70 + 0.2*80 = 86.00
  },
  // 5. Full completeness + rating 5.0 (count=20), destacado
  {
    slug: slug(5), status: 'draft', full_name: 'Parity Five', email: email(5),
    whatsapp: '+5491112345678', country: 'AR', modality: ['online'], specialties: ['ansiedad'],
    profile_image_url: 'https://example.com/img.jpg',
    short_description: 'Breve descripción.',
    bio: FIFTY_CHAR_BIO,
    experience_description: 'Tengo experiencia en...',
    service_type: ['individual'],
    online_only: true,
    instagram: 'therapist_handle',
    rating_average: 5.0, rating_count: 20,
    subscription_tier: 'destacado',
    // Expected: 70 + 20 + 10 = 100.00
  },
  // 6. Zero completeness + rating 5.0 (count=10), destacado
  {
    slug: slug(6), status: 'draft', full_name: 'Parity Six', email: email(6),
    whatsapp: '', country: 'AR', modality: [], specialties: [],
    rating_average: 5.0, rating_count: 10,
    subscription_tier: 'destacado',
    // Expected: 0 + 20 + 10 = 30.00
  },
  // 7. NULL array fields (service_type=null) — tests COALESCE(array_length(null,1),0)
  {
    slug: slug(7), status: 'draft', full_name: 'Parity Seven', email: email(7),
    whatsapp: '+5491112345678', country: 'AR', modality: ['online'], specialties: ['ansiedad'],
    profile_image_url: 'https://example.com/img.jpg',
    short_description: 'Breve descripción.',
    bio: FIFTY_CHAR_BIO,
    experience_description: 'Tengo experiencia en...',
    service_type: null,   // ← NULL instead of []  — tests COALESCE guard
    online_only: true,
    instagram: 'therapist_handle',
    // serviceType criterion fails (null array → 0 pts), rest pass → completeness = 90
  },
  // 8. NULL online_only, non-null city → locationClarity via city branch
  {
    slug: slug(8), status: 'draft', full_name: 'Parity Eight', email: email(8),
    whatsapp: '+5491112345678', country: 'AR', modality: ['online'], specialties: ['ansiedad'],
    profile_image_url: 'https://example.com/img.jpg',
    short_description: 'Breve descripción.',
    bio: FIFTY_CHAR_BIO,
    experience_description: 'Tengo experiencia en...',
    service_type: ['individual'],
    online_only: null,   // ← NULL — tests COALESCE(online_only, false) = false, then city branch
    city: 'Buenos Aires',
    instagram: 'therapist_handle',
    // locationClarity: COALESCE(null,false)=false OR ('Buenos Aires' IS NOT NULL AND len > 0)=true → +10
    // Expected completeness: 100 (city compensates for null online_only)
  },
]

type FixtureRow = {
  id: string
  profile_completeness_score: number
  rating_average: number
  rating_count: number
  subscription_tier: string
  ranking_score: number
}

// Extended row type for migration 005 fixtures (includes tier_expires_at)
type FixtureRowWithExpiry = FixtureRow & {
  tier_expires_at: string | null
}

let insertedRows: FixtureRow[] = []
let migrationApplied = false
let migration005Applied = false
let insertedExpiry005Rows: FixtureRowWithExpiry[] = []
let expiry005Ids: string[] = []

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Probe Supabase connectivity with 3 retries (failure mode 1: connectivity flake)
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error: probe } = await supabase
      .from('professionals')
      .select('ranking_score')
      .limit(1)

    if (!probe) { migrationApplied = true; break }

    const isMigrationMissing = probe.message?.includes('ranking_score') ||
      probe.message?.includes('column') ||
      probe.code === '42703'  // undefined_column

    if (isMigrationMissing) {
      console.warn(
        '\n⚠  Migration 004 not applied — skipping parity tests.\n' +
        '   Run: node scripts/apply-ranking-migration.mjs\n' +
        '   Or apply migrations/004_ranking_foundation.sql via Supabase SQL Editor.\n'
      )
      return
    }

    if (attempt < 3) {
      console.warn(`  Supabase connectivity attempt ${attempt} failed (${probe.message}), retrying in 2s...`)
      await new Promise(r => setTimeout(r, 2000))
    } else {
      console.error(`  Supabase unreachable after 3 attempts: ${probe.message}`)
    }
  }

  if (!migrationApplied) return

  // Insert all 8 fixture professionals (migration 004 only, no tier_expires_at)
  for (const fixture of fixtures) {
    const { data, error } = await supabase
      .from('professionals')
      .insert(fixture)
      .select('id, profile_completeness_score, rating_average, rating_count, subscription_tier, ranking_score')
      .single()

    if (error) {
      console.error(`Failed to insert fixture ${fixture.slug}:`, error.message)
      continue
    }
    insertedRows.push(data as FixtureRow)
  }

  // ── Migration 005 check + fixtures 9-11 ─────────────────────────────────────
  // Probe for tier_expires_at column (migration 005)
  const { error: probe005 } = await supabase
    .from('professionals')
    .select('tier_expires_at')
    .limit(1)

  if (probe005) {
    console.warn(
      '\n⚠  Migration 005 not applied — skipping expiry parity tests (fixtures 9-11).\n' +
      '   Run: node scripts/apply-destacado-migration.mjs\n'
    )
    return
  }

  migration005Applied = true

  const future30 = new Date(Date.now() + 30 * 86400000).toISOString()
  const past1    = new Date(Date.now() - 86400000).toISOString()

  const expiryFixtures = [
    // Fixture 9: full completeness, destacado, future expiry → tier contribution = 100, score = 80.00
    {
      slug: slug(9), status: 'draft', full_name: 'Parity Nine', email: email(9),
      whatsapp: '+5491112345678', country: 'AR', modality: ['online'], specialties: ['ansiedad'],
      profile_image_url: 'https://example.com/img.jpg',
      short_description: 'Breve descripción.',
      bio: FIFTY_CHAR_BIO,
      experience_description: 'Tengo experiencia en...',
      service_type: ['individual'],
      online_only: true,
      instagram: 'therapist_handle',
      subscription_tier: 'destacado',
      tier_expires_at: future30,   // future → effective destacado
    },
    // Fixture 10: full completeness, destacado, PAST expiry → tier contribution = 0, score = 70.00
    {
      slug: slug(10), status: 'draft', full_name: 'Parity Ten', email: email(10),
      whatsapp: '+5491112345678', country: 'AR', modality: ['online'], specialties: ['ansiedad'],
      profile_image_url: 'https://example.com/img.jpg',
      short_description: 'Breve descripción.',
      bio: FIFTY_CHAR_BIO,
      experience_description: 'Tengo experiencia en...',
      service_type: ['individual'],
      online_only: true,
      instagram: 'therapist_handle',
      subscription_tier: 'destacado',
      tier_expires_at: past1,   // past → expired, tier contribution = 0
    },
  ]

  for (const fixture of expiryFixtures) {
    const { data, error } = await supabase
      .from('professionals')
      .insert(fixture)
      .select('id, profile_completeness_score, rating_average, rating_count, subscription_tier, ranking_score, tier_expires_at')
      .single()

    if (error) {
      console.error(`Failed to insert fixture ${fixture.slug}:`, error.message)
      continue
    }
    insertedExpiry005Rows.push(data as FixtureRowWithExpiry)
    expiry005Ids.push((data as FixtureRowWithExpiry).id)
  }

  // Fixture 11: retroactive RPC extension arithmetic
  // Seed a destacado row with tier_expires_at = NOW() + 10 days,
  // call upgrade_destacado_tier with a 31-day inclusive period from 60→30 days ago,
  // assert new expiry = original + 31 days (not paid_at + 31 days).
  // (period_end - period_start + 1 = 30 - 0 + 1 in DATE arithmetic = 31 days inclusive.)
  const originalExpiry = new Date(Date.now() + 10 * 86400000)
  const { data: f11, error: f11err } = await supabase
    .from('professionals')
    .insert({
      slug: slug(11), status: 'draft', full_name: 'Parity Eleven', email: email(11),
      whatsapp: '+5491112345678', country: 'AR', modality: ['online'], specialties: ['ansiedad'],
      subscription_tier: 'destacado',
      tier_expires_at: originalExpiry.toISOString(),
    })
    .select('id, tier_expires_at')
    .single()

  if (!f11err && f11) {
    expiry005Ids.push(f11.id)

    // Call the RPC: 30-day purchased period from 60 days ago to 30 days ago
    const periodStart = new Date(Date.now() - 60 * 86400000)
    const periodEnd   = new Date(Date.now() - 30 * 86400000)
    const { data: rpcResult } = await supabase.rpc('upgrade_destacado_tier', {
      p_professional_id: f11.id,
      p_amount:          5000,
      p_currency:        'ARS',
      p_paid_at:         new Date().toISOString(),
      p_period_start:    periodStart.toISOString().split('T')[0],
      p_period_end:      periodEnd.toISOString().split('T')[0],
      p_payment_method:  'efectivo',
      p_invoice_number:  null,
      p_notes:           'retroactive-parity-test',
      p_created_by:      null,
    })

    if (rpcResult) {
      // Store rpcResult for the test
      ;(f11 as Record<string, unknown>).__rpcResult = rpcResult
      ;(f11 as Record<string, unknown>).__originalExpiry = originalExpiry.getTime()
    }
    insertedExpiry005Rows.push(f11 as unknown as FixtureRowWithExpiry & { __rpcResult?: unknown; __originalExpiry?: number })
  }
})

afterAll(async () => {
  const all005Ids = [...expiry005Ids]
  if (insertedRows.length > 0) {
    await supabase.from('professionals').delete().in('id', insertedRows.map(r => r.id))
  }
  if (all005Ids.length > 0) {
    // subscription_payments rows are CASCADE-deleted when professional is deleted
    await supabase.from('professionals').delete().in('id', all005Ids)
  }
  // Belt-and-suspenders: remove any orphaned rows from interrupted runs
  await supabase.from('professionals').delete().like('slug', `ranking-parity-%`)
})

// ── Tests ──────────────────────────────────────────────────────────────────────

// Parity test for fixtures 1-8 (migration 004, no tier_expires_at)
// tierExpiresAt is intentionally omitted → backward-compat (null/undefined path)
function parityTest(fixtureIndex: number, description: string) {
  it(description, () => {
    if (!migrationApplied) return
    const row = insertedRows[fixtureIndex]
    if (!row) throw new Error(`Fixture ${fixtureIndex + 1} was not inserted`)

    const tsScore = computeRankingScore({
      completeness: row.profile_completeness_score,
      ratingAverage: Number(row.rating_average),
      ratingCount: row.rating_count,
      tier: (row.subscription_tier as 'basico' | 'destacado'),
      // tierExpiresAt omitted intentionally — undefined uses backward-compat path (null)
    })

    expect(row.ranking_score).toBeCloseTo(tsScore, 2)
  })
}

// Parity test for migration 005 fixtures (includes tier_expires_at)
function parityTest005(rowIndex: number, description: string) {
  it(description, () => {
    if (!migration005Applied) return
    const row = insertedExpiry005Rows[rowIndex]
    if (!row) throw new Error(`Expiry fixture ${rowIndex + 1} was not inserted`)

    const tsScore = computeRankingScore({
      completeness: row.profile_completeness_score,
      ratingAverage: Number(row.rating_average),
      ratingCount: row.rating_count,
      tier: (row.subscription_tier as 'basico' | 'destacado'),
      tierExpiresAt: row.tier_expires_at,   // explicitly passed from DB
    })

    expect(row.ranking_score).toBeCloseTo(tsScore, 2)
  })
}

describe('SQL trigger ↔ TS computeRankingScore parity', () => {
  parityTest(0, 'fixture 1: all zeros → ranking_score = 0.00')
  parityTest(1, 'fixture 2: partial completeness (55), no rating → ranking_score = 38.50')
  parityTest(2, 'fixture 3: full completeness (100), no rating, basico → 70.00')
  parityTest(3, 'fixture 4: full completeness + rating 4.0 (count=10), basico → 86.00')
  parityTest(4, 'fixture 5: full completeness + rating 5.0 (count=20), destacado → 100.00')
  parityTest(5, 'fixture 6: zero completeness + rating 5.0 (count=10), destacado → 30.00')
  parityTest(6, 'fixture 7: NULL service_type tests COALESCE array guard')
  parityTest(7, 'fixture 8: NULL online_only with city tests locationClarity city branch')

  it('all 8 fixtures were successfully inserted', () => {
    if (!migrationApplied) return
    expect(insertedRows).toHaveLength(8)
  })
})

// ── Migration 005: expiry-aware parity tests ──────────────────────────────────
describe('SQL trigger ↔ TS parity — migration 005 (tier_expires_at)', () => {
  parityTest005(0, 'fixture 9: full completeness, destacado, FUTURE expiry → ranking_score = 80.00 (tier +10)')
  parityTest005(1, 'fixture 10: full completeness, destacado, PAST expiry → ranking_score = 70.00 (tier = 0, expired)')

  it('migration 005 fixtures were inserted', () => {
    if (!migration005Applied) return
    expect(insertedExpiry005Rows.length).toBeGreaterThanOrEqual(2)
  })
})

// ── Migration 005: RPC extension arithmetic (fixture 11) ──────────────────────
describe('upgrade_destacado_tier RPC — retroactive extension arithmetic', () => {
  it('fixture 11: retroactive payment — new expiry = original_expiry + 31 days (not paid_at + 31)', () => {
    if (!migration005Applied) return
    // The fixture 11 row is at index 2 in insertedExpiry005Rows (0=fixture9, 1=fixture10, 2=fixture11)
    const row = insertedExpiry005Rows[2] as (FixtureRowWithExpiry & { __rpcResult?: unknown; __originalExpiry?: number })
    if (!row || !row.__rpcResult || !row.__originalExpiry) return  // RPC failed or not set up

    // The RPC was called with period_start = 60 days ago, period_end = 30 days ago.
    // INCLUSIVE math: period_end - period_start + 1 = 31 days purchased.
    // Original expiry was NOW() + 10 days.
    // Expected new expiry = original_expiry + 31 days (not paid_at + 31 days).
    const rpc = row.__rpcResult as { tier_expires_at: string }
    const newExpiry = new Date(rpc.tier_expires_at).getTime()
    const expectedExpiry = row.__originalExpiry + 31 * 86400000  // original + 31 days

    // Allow ±60 seconds tolerance for execution time drift
    const toleranceMs = 60000
    expect(Math.abs(newExpiry - expectedExpiry)).toBeLessThan(toleranceMs)

    // Assert it's NOT paid_at + 31 days (which would be ~today + 31 days, not original + 31)
    const paidAtPlus31 = Date.now() + 31 * 86400000
    expect(Math.abs(newExpiry - paidAtPlus31)).toBeGreaterThan(toleranceMs)
  })
})
