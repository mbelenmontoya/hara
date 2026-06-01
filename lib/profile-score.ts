// Hara Vital — Profile Score Calculator
// Scores a professional profile based on submission completeness.
// Pure function — no DB dependency, no side effects.
//
// Designed for reuse: the review page, future directory ranking,
// and professional self-service portal can all call this.

// ============================================================================
// TYPES
// ============================================================================

export interface ScorableProfile {
  profile_image_url: string | null
  short_description: string | null
  bio: string | null
  experience_description: string | null
  practices: string[] | null
  service_type: string[] | null
  city: string | null
  online_only: boolean
  instagram: string | null
  whatsapp: string | null
  modality: string[] | null
}

export interface ScoreCriterion {
  /** Machine-readable key */
  key: string
  /** Human-readable label (Spanish) */
  label: string
  /** Maximum points for this criterion */
  weight: number
  /** Points earned (0 to weight) */
  earned: number
  /** Whether this criterion is fully satisfied */
  met: boolean
}

export interface ProfileScore {
  /** Overall score (0-100) */
  total: number
  /** Per-criterion breakdown */
  breakdown: ScoreCriterion[]
  /** Sum of all weights (should equal 100) */
  maxPossible: number
}

// ============================================================================
// CRITERIA DEFINITIONS
// ============================================================================

interface CriterionDef {
  key: string
  label: string
  weight: number
  /** Returns a fraction 0–1. Binary criteria return 0 or 1; tiered criteria return 0, 0.5, or 1. */
  evaluate: (profile: ScorableProfile) => number
}

/** 3-tier scoring for text fields: 0 below min, 0.5 between min and max, 1 at max+. */
function textTier(text: string | null, minChars: number, fullChars: number): number {
  const len = text?.trim().length ?? 0
  if (len >= fullChars) return 1
  if (len >= minChars)  return 0.5
  return 0
}

const CRITERIA: CriterionDef[] = [
  // ── Mandatory fields (5pts each) ────────────────────────────────────────────
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    weight: 5,
    evaluate: (p) => (!!p.whatsapp && p.whatsapp.trim().length > 0) ? 1 : 0,
  },
  {
    key: 'modality',
    label: 'Modalidad de atención',
    weight: 5,
    evaluate: (p) => (Array.isArray(p.modality) && p.modality.length >= 1) ? 1 : 0,
  },
  {
    key: 'practices',
    label: 'Prácticas',
    weight: 5,
    evaluate: (p) => (Array.isArray(p.practices) && p.practices.length >= 1) ? 1 : 0,
  },
  {
    key: 'bio',
    label: 'Biografía',
    // 0–99 chars → 0pts | 100–249 chars → 2pts | 250+ chars → 5pts
    weight: 5,
    evaluate: (p) => textTier(p.bio, 100, 250),
  },

  // ── Optional fields (10–15pts each) ──────────────────────────────────────────
  {
    key: 'profileImage',
    label: 'Foto de perfil',
    weight: 10,
    evaluate: (p) => (!!p.profile_image_url && p.profile_image_url.startsWith('http')) ? 1 : 0,
  },
  {
    key: 'shortDescription',
    label: 'Descripción corta',
    // 0–24 chars → 0pts | 25–49 chars → 7pts | 50+ chars → 15pts
    weight: 15,
    evaluate: (p) => textTier(p.short_description, 25, 50),
  },
  {
    key: 'experienceDescription',
    label: 'Descripción de experiencia',
    // 0–49 chars → 0pts | 50–149 chars → 7pts | 150+ chars → 15pts
    weight: 15,
    evaluate: (p) => textTier(p.experience_description, 50, 150),
  },
  {
    key: 'serviceType',
    label: 'Tipo de servicio',
    weight: 15,
    evaluate: (p) => (Array.isArray(p.service_type) && p.service_type.length >= 1) ? 1 : 0,
  },
  {
    key: 'locationClarity',
    label: 'Claridad de ubicación',
    weight: 15,
    evaluate: (p) => (p.online_only || (!!p.city && p.city.trim().length > 0)) ? 1 : 0,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    weight: 10,
    evaluate: (p) => (!!p.instagram && p.instagram.trim().length > 0) ? 1 : 0,
  },
]

// ============================================================================
// SCORING LOGIC
// ============================================================================

/**
 * Calculate profile completeness score.
 * @param overrides - Admin corrections keyed by criterion key. Value is the
 *   exact points to award (0 to criterion.weight). Replaces computed value.
 */
export function calculateProfileScore(
  profile: ScorableProfile,
  overrides: Record<string, number> = {}
): ProfileScore {
  const breakdown: ScoreCriterion[] = CRITERIA.map((c) => {
    const computed = Math.floor(c.evaluate(profile) * c.weight)
    const earned = c.key in overrides
      ? Math.min(c.weight, Math.max(0, overrides[c.key]))
      : computed
    const met = earned === c.weight
    return {
      key: c.key,
      label: c.label,
      weight: c.weight,
      earned,
      met,
    }
  })

  const total = breakdown.reduce((sum, c) => sum + c.earned, 0)
  const maxPossible = breakdown.reduce((sum, c) => sum + c.weight, 0)

  return { total, breakdown, maxPossible }
}
