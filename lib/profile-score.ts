// Hará Match — Profile Score Calculator
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
  specialties: string[] | null
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
  evaluate: (profile: ScorableProfile) => boolean
}

const CRITERIA: CriterionDef[] = [
  {
    key: 'profileImage',
    label: 'Foto de perfil',
    weight: 15,
    evaluate: (p) => !!p.profile_image_url && p.profile_image_url.trim().length > 0,
  },
  {
    key: 'shortDescription',
    label: 'Descripción corta',
    weight: 10,
    evaluate: (p) => !!p.short_description && p.short_description.trim().length > 0,
  },
  {
    key: 'bio',
    label: 'Biografía',
    weight: 15,
    evaluate: (p) => !!p.bio && p.bio.trim().length >= 50,
  },
  {
    key: 'experienceDescription',
    label: 'Descripción de experiencia',
    weight: 10,
    evaluate: (p) => !!p.experience_description && p.experience_description.trim().length > 0,
  },
  {
    key: 'specialties',
    label: 'Especialidades',
    weight: 15,
    evaluate: (p) => Array.isArray(p.specialties) && p.specialties.length >= 1,
  },
  {
    key: 'serviceType',
    label: 'Tipo de servicio',
    weight: 10,
    evaluate: (p) => Array.isArray(p.service_type) && p.service_type.length >= 1,
  },
  {
    key: 'locationClarity',
    label: 'Claridad de ubicación',
    weight: 10,
    evaluate: (p) => p.online_only || (!!p.city && p.city.trim().length > 0),
  },
  {
    key: 'instagram',
    label: 'Instagram',
    weight: 5,
    evaluate: (p) => !!p.instagram && p.instagram.trim().length > 0,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    weight: 5,
    evaluate: (p) => !!p.whatsapp && p.whatsapp.trim().length > 0,
  },
  {
    key: 'modality',
    label: 'Modalidad de atención',
    weight: 5,
    evaluate: (p) => Array.isArray(p.modality) && p.modality.length >= 1,
  },
]

// ============================================================================
// SCORING LOGIC
// ============================================================================

export function calculateProfileScore(profile: ScorableProfile): ProfileScore {
  const breakdown: ScoreCriterion[] = CRITERIA.map((c) => {
    const met = c.evaluate(profile)
    return {
      key: c.key,
      label: c.label,
      weight: c.weight,
      earned: met ? c.weight : 0,
      met,
    }
  })

  const total = breakdown.reduce((sum, c) => sum + c.earned, 0)
  const maxPossible = breakdown.reduce((sum, c) => sum + c.weight, 0)

  return { total, breakdown, maxPossible }
}
