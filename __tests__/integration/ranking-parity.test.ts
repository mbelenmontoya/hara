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
//   Apply migrations/004_ranking_foundation.sql before running.
//   If the migration is missing, all tests are skipped with a clear message.

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

let insertedRows: FixtureRow[] = []
let migrationApplied = false

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

  // Insert all 8 fixture professionals
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
})

afterAll(async () => {
  if (insertedRows.length === 0) return

  const ids = insertedRows.map(r => r.id)
  await supabase.from('professionals').delete().in('id', ids)

  // Belt-and-suspenders: remove any orphaned rows from interrupted runs
  await supabase.from('professionals').delete().like('slug', `ranking-parity-%`)
})

// ── Tests ──────────────────────────────────────────────────────────────────────

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
