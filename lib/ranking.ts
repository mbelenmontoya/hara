// Hará Match — Ranking formula helper
// Mirrors the SQL recompute_ranking() trigger function.
// These constants and formulas must stay in sync with migrations/004_ranking_foundation.sql.
//
// Tuning weights: change the constants here AND update the SQL function in a new migration.

/** Weight applied to profile completeness score (0–100). */
export const COMPLETENESS_WEIGHT = 0.7

/** Weight applied to rating contribution (0–100). */
export const RATING_WEIGHT = 0.2

/** Weight applied to tier contribution (0 or 100). */
export const TIER_WEIGHT = 0.1

export type SubscriptionTier = 'basico' | 'destacado'

export interface RankingInput {
  /** Completeness score from lib/profile-score.ts, range 0–100. */
  completeness: number
  /** Average star rating on a 0–5 scale. */
  ratingAverage: number
  /** Number of reviews. Zero means no rating contribution. */
  ratingCount: number
  /** Subscription tier. Only 'destacado' adds a boost. */
  tier: SubscriptionTier
}

/**
 * Contribution of the rating to ranking, 0–100 (before weighting).
 * Returns 0 when ratingCount is 0 to avoid rewarding unreviewed profiles.
 */
export function computeRatingContribution(ratingAverage: number, ratingCount: number): number {
  if (ratingCount === 0) return 0
  return Math.min(ratingAverage * 20, 100)
}

/**
 * Contribution of subscription tier to ranking, 0 or 100 (before weighting).
 */
export function computeTierContribution(tier: SubscriptionTier): number {
  return tier === 'destacado' ? 100 : 0
}

/**
 * Compute ranking_score for a professional profile.
 * Result is rounded to 2 decimal places, matching the SQL ROUND(..., 2).
 *
 * Formula: round(0.7 * completeness + 0.2 * ratingContribution + 0.1 * tierContribution, 2)
 *
 * At launch (no reviews, no paid tier) this equals round(0.7 * completeness, 2).
 */
export function computeRankingScore(input: RankingInput): number {
  const ratingContrib = computeRatingContribution(input.ratingAverage, input.ratingCount)
  const tierContrib = computeTierContribution(input.tier)

  const raw =
    COMPLETENESS_WEIGHT * input.completeness +
    RATING_WEIGHT * ratingContrib +
    TIER_WEIGHT * tierContrib

  return Math.round(raw * 100) / 100
}
