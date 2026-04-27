// Hará Match — Ranking formula helper
// Mirrors the SQL recompute_ranking() trigger function.
// These constants and formulas must stay in sync with migrations/004_ranking_foundation.sql
// (originally) and migrations/005_destacado_tier_mvp.sql (expiry-aware update).
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
  /**
   * Expiry date for the Destacado tier (added in migration 005).
   * Optional for backward compatibility — existing callers that omit this
   * field receive the legacy behavior: destacado always contributes 100.
   * Pass null explicitly to indicate "no expiry set" (same as legacy).
   * Supabase returns TIMESTAMPTZ as an ISO 8601 string; pass it directly.
   */
  tierExpiresAt?: Date | string | null
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
 * Mirrors the SQL expression:
 *   CASE WHEN subscription_tier = 'destacado'
 *     AND (tier_expires_at IS NULL OR tier_expires_at > NOW())
 *   THEN 100 ELSE 0 END
 *
 * tierExpiresAt is optional for backward compatibility:
 *   - omitted or null → destacado contributes 100 (legacy/no-expiry rows)
 *   - future Date/string → contributes 100 (active subscription)
 *   - past Date/string → contributes 0 (expired subscription)
 */
export function computeTierContribution(
  tier: SubscriptionTier,
  tierExpiresAt?: Date | string | null,
): number {
  if (tier !== 'destacado') return 0
  if (tierExpiresAt == null) return 100  // null/undefined → legacy destacado, always effective
  const expires = typeof tierExpiresAt === 'string' ? new Date(tierExpiresAt) : tierExpiresAt
  return expires > new Date() ? 100 : 0
}

/**
 * Returns true when a professional's Destacado tier is currently effective.
 * Use this in app code (directory page, profile page, admin UI) to drive chip visibility.
 *
 * tier is typed as string (not SubscriptionTier) because app code reads it directly
 * from Supabase without narrowing. The function is safe with any string value.
 */
export function isEffectivelyDestacado(
  tier: string | null | undefined,
  tierExpiresAt?: Date | string | null,
): boolean {
  if (tier !== 'destacado') return false
  if (tierExpiresAt == null) return true  // legacy destacado rows without expiry
  const expires = typeof tierExpiresAt === 'string' ? new Date(tierExpiresAt) : tierExpiresAt
  return expires > new Date()
}

/**
 * Compute ranking_score for a professional profile.
 * Result is rounded to 2 decimal places, matching the SQL ROUND(..., 2).
 *
 * Formula: round(0.7 * completeness + 0.2 * ratingContribution + 0.1 * tierContribution, 2)
 */
export function computeRankingScore(input: RankingInput): number {
  const ratingContrib = computeRatingContribution(input.ratingAverage, input.ratingCount)
  const tierContrib = computeTierContribution(input.tier, input.tierExpiresAt)

  const raw =
    COMPLETENESS_WEIGHT * input.completeness +
    RATING_WEIGHT * ratingContrib +
    TIER_WEIGHT * tierContrib

  return Math.round(raw * 100) / 100
}
