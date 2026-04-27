// Tests for lib/ranking.ts — ranking formula
// These are unit tests (pure functions, no DB access).

import { describe, it, expect } from 'vitest'
import {
  computeRankingScore,
  computeRatingContribution,
  computeTierContribution,
  isEffectivelyDestacado,
  COMPLETENESS_WEIGHT,
  RATING_WEIGHT,
  TIER_WEIGHT,
} from './ranking'

describe('constants', () => {
  it('weights sum to 1.0', () => {
    expect(COMPLETENESS_WEIGHT + RATING_WEIGHT + TIER_WEIGHT).toBeCloseTo(1.0)
  })

  it('completeness weight is 0.7', () => {
    expect(COMPLETENESS_WEIGHT).toBe(0.7)
  })
})

describe('computeRatingContribution', () => {
  it('returns 0 when ratingCount is 0 regardless of average', () => {
    expect(computeRatingContribution(5.0, 0)).toBe(0)
    expect(computeRatingContribution(4.5, 0)).toBe(0)
  })

  it('scales average × 20 when count > 0', () => {
    expect(computeRatingContribution(3.5, 1)).toBe(70)
  })

  it('caps contribution at 100 (5-star = 100, not 5×20=100 which is already 100)', () => {
    expect(computeRatingContribution(5.0, 1)).toBe(100)
  })

  it('caps contribution at 100 even with above-max hypothetical average', () => {
    // Defensive: 6.0 * 20 = 120, should cap at 100
    expect(computeRatingContribution(6.0, 1)).toBe(100)
  })
})

describe('computeTierContribution', () => {
  it('returns 100 for destacado tier', () => {
    expect(computeTierContribution('destacado')).toBe(100)
  })

  it('returns 0 for basico tier', () => {
    expect(computeTierContribution('basico')).toBe(0)
  })

  // Expiry-aware cases (migration 005)
  it('returns 100 for destacado with no expiry (backward compat, legacy rows)', () => {
    expect(computeTierContribution('destacado', null)).toBe(100)
  })

  it('returns 100 for destacado with future expiry', () => {
    const future = new Date(Date.now() + 30 * 86400000)
    expect(computeTierContribution('destacado', future)).toBe(100)
  })

  it('returns 0 for destacado with past expiry', () => {
    const past = new Date(Date.now() - 86400000)
    expect(computeTierContribution('destacado', past)).toBe(0)
  })

  it('returns 0 for basico regardless of expiry (basico never gets tier boost)', () => {
    const future = new Date(Date.now() + 86400000)
    const past   = new Date(Date.now() - 86400000)
    expect(computeTierContribution('basico', null)).toBe(0)
    expect(computeTierContribution('basico', future)).toBe(0)
    expect(computeTierContribution('basico', past)).toBe(0)
  })
})

describe('isEffectivelyDestacado', () => {
  it('destacado + future expiry → true', () => {
    expect(isEffectivelyDestacado('destacado', new Date(Date.now() + 86400000))).toBe(true)
  })

  it('destacado + past expiry → false', () => {
    expect(isEffectivelyDestacado('destacado', new Date(Date.now() - 86400000))).toBe(false)
  })

  it('destacado + null expiry → true (backward compat — legacy destacado rows)', () => {
    expect(isEffectivelyDestacado('destacado', null)).toBe(true)
  })

  it('basico + future expiry → false (tier wins, not expiry)', () => {
    expect(isEffectivelyDestacado('basico', new Date(Date.now() + 86400000))).toBe(false)
  })

  it('accepts ISO string expiry (Supabase returns strings)', () => {
    const futureISO = new Date(Date.now() + 86400000).toISOString()
    const pastISO   = new Date(Date.now() - 86400000).toISOString()
    expect(isEffectivelyDestacado('destacado', futureISO)).toBe(true)
    expect(isEffectivelyDestacado('destacado', pastISO)).toBe(false)
  })
})

describe('computeRankingScore', () => {
  it('all zeros → 0', () => {
    expect(computeRankingScore({ completeness: 0, ratingAverage: 0, ratingCount: 0, tier: 'basico' })).toBe(0)
  })

  it('completeness=100, no rating, no tier → 70.00', () => {
    expect(computeRankingScore({ completeness: 100, ratingAverage: 0, ratingCount: 0, tier: 'basico' })).toBe(70.00)
  })

  it('completeness=100, rating=5 (count=10), basico → 90.00', () => {
    // 0.7*100 + 0.2*LEAST(5*20,100) = 70 + 20 = 90
    expect(computeRankingScore({ completeness: 100, ratingAverage: 5.0, ratingCount: 10, tier: 'basico' })).toBe(90.00)
  })

  it('completeness=100, rating=5 (count=10), destacado → 100.00', () => {
    // 70 + 20 + 10 = 100
    expect(computeRankingScore({ completeness: 100, ratingAverage: 5.0, ratingCount: 10, tier: 'destacado' })).toBe(100.00)
  })

  it('completeness=0, rating=5 (count=10), destacado → 30.00', () => {
    // 0 + 20 + 10 = 30
    expect(computeRankingScore({ completeness: 0, ratingAverage: 5.0, ratingCount: 10, tier: 'destacado' })).toBe(30.00)
  })

  it('rating count=0 with non-zero average → rating contributes nothing', () => {
    expect(computeRankingScore({ completeness: 100, ratingAverage: 5.0, ratingCount: 0, tier: 'basico' })).toBe(70.00)
  })

  it('partial rating (3.5 avg, count=1), no completeness, no tier → 14.00', () => {
    // 0 + 0.2 * (3.5 * 20) = 0.2 * 70 = 14
    expect(computeRankingScore({ completeness: 0, ratingAverage: 3.5, ratingCount: 1, tier: 'basico' })).toBe(14.00)
  })

  it('partial completeness=55, no rating, no tier → 38.50', () => {
    // round(0.7 * 55, 2) = 38.50
    expect(computeRankingScore({ completeness: 55, ratingAverage: 0, ratingCount: 0, tier: 'basico' })).toBe(38.50)
  })

  it('rounds correctly: completeness=33 → 23.10', () => {
    // round(0.7 * 33, 2) = round(23.1, 2) = 23.10
    expect(computeRankingScore({ completeness: 33, ratingAverage: 0, ratingCount: 0, tier: 'basico' })).toBe(23.10)
  })

  it('full scenario: completeness=70, rating=4.0 (count=5), basico', () => {
    // 0.7*70 + 0.2*LEAST(4*20,100) + 0 = 49 + 0.2*80 = 49 + 16 = 65.00
    expect(computeRankingScore({ completeness: 70, ratingAverage: 4.0, ratingCount: 5, tier: 'basico' })).toBe(65.00)
  })

  // Expiry-aware cases (migration 005)
  it('destacado + past expiry → tier contribution is 0, score = 70.00 (completeness only)', () => {
    const past = new Date(Date.now() - 86400000)
    expect(computeRankingScore({ completeness: 100, ratingAverage: 0, ratingCount: 0, tier: 'destacado', tierExpiresAt: past })).toBe(70.00)
  })

  it('destacado + future expiry → tier contribution is 10, score = 80.00', () => {
    const future = new Date(Date.now() + 30 * 86400000)
    // 0.7*100 + 0.2*0 + 0.1*100 = 70 + 0 + 10 = 80.00
    expect(computeRankingScore({ completeness: 100, ratingAverage: 0, ratingCount: 0, tier: 'destacado', tierExpiresAt: future })).toBe(80.00)
  })
})
