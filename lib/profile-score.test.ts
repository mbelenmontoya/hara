import { describe, it, expect } from 'vitest'
import { calculateProfileScore } from './profile-score'
import type { ScorableProfile } from './profile-score'

// Texts meet all thresholds: shortDesc 50+, bio 250+, experienceDesc 150+
const FULL_PROFILE: ScorableProfile = {
  profile_image_url: 'https://example.com/img.jpg',
  short_description: 'Te acompaño a lograr una vida con paz, bienestar y equilibrio energético desde adentro.',
  bio: 'Soy terapeuta holística con más de 6 años de experiencia acompañando procesos de sanación profunda. Después de una crisis personal encontré las terapias holísticas y mi gran amor: la biodecodificación. Trabajo con personas que buscan entender el origen emocional de sus síntomas físicos y transformar sus patrones de vida desde la raíz. Acompaño a mujeres y hombres en procesos de autoconocimiento y sanación.',
  experience_description: 'Especialista en biodecodificación, reiki y constelaciones familiares. Más de 200 sesiones individuales y grupales. Formación certificada en Argentina y México. Trabajo tanto online como presencial en Buenos Aires.',
  practices: ['reiki'],
  service_type: ['individual'],
  city: 'Buenos Aires',
  online_only: false,
  instagram: '@terapeuta',
  whatsapp: '+5491112345678',
  modality: ['online', 'in-person'],
}

const EMPTY_PROFILE: ScorableProfile = {
  profile_image_url: null,
  short_description: null,
  bio: null,
  experience_description: null,
  practices: [],
  service_type: [],
  city: null,
  online_only: false,
  instagram: null,
  whatsapp: null,
  modality: [],
}

describe('calculateProfileScore — weights sum to 100', () => {
  it('max possible is 100', () => {
    const { maxPossible } = calculateProfileScore(FULL_PROFILE)
    expect(maxPossible).toBe(100)
  })

  it('full profile scores 100', () => {
    const { total } = calculateProfileScore(FULL_PROFILE)
    expect(total).toBe(100)
  })

  it('empty profile scores 0', () => {
    const { total } = calculateProfileScore(EMPTY_PROFILE)
    expect(total).toBe(0)
  })
})

describe('calculateProfileScore — profileImage (10pts, optional)', () => {
  it('awards 10pts for a valid http URL', () => {
    const c = calculateProfileScore(FULL_PROFILE).breakdown.find(c => c.key === 'profileImage')!
    expect(c.earned).toBe(10)
    expect(c.weight).toBe(10)
  })

  it('awards 0pts for a raw filename (no http)', () => {
    const c = calculateProfileScore({ ...FULL_PROFILE, profile_image_url: 'foto.jpg' }).breakdown.find(c => c.key === 'profileImage')!
    expect(c.earned).toBe(0)
  })

  it('awards 0pts for null', () => {
    const c = calculateProfileScore({ ...FULL_PROFILE, profile_image_url: null }).breakdown.find(c => c.key === 'profileImage')!
    expect(c.earned).toBe(0)
  })
})

describe('calculateProfileScore — 3-tier text scoring', () => {
  it('bio 250+ chars → 5pts (full)', () => {
    const c = calculateProfileScore(FULL_PROFILE).breakdown.find(c => c.key === 'bio')!
    expect(c.earned).toBe(5)
    expect(c.met).toBe(true)
  })

  it('bio 100–249 chars → 2pts (mid)', () => {
    const c = calculateProfileScore({ ...FULL_PROFILE, bio: 'a'.repeat(150) }).breakdown.find(c => c.key === 'bio')!
    expect(c.earned).toBe(2)
    expect(c.met).toBe(false)
  })

  it('bio < 100 chars → 0pts', () => {
    const score = calculateProfileScore({ ...FULL_PROFILE, bio: 'Corto' })
    const c = score.breakdown.find(c => c.key === 'bio')!
    expect(c.earned).toBe(0)
  })

  it('shortDescription 50+ chars → 15pts (full)', () => {
    const score = calculateProfileScore(FULL_PROFILE)
    const c = score.breakdown.find(c => c.key === 'shortDescription')!
    expect(c.earned).toBe(15)
    expect(c.met).toBe(true)
  })

  it('shortDescription 25–49 chars → 7pts (mid)', () => {
    const score = calculateProfileScore({ ...FULL_PROFILE, short_description: 'a'.repeat(30) })
    const c = score.breakdown.find(c => c.key === 'shortDescription')!
    expect(c.earned).toBe(7)
    expect(c.met).toBe(false)
  })

  it('shortDescription < 25 chars → 0pts', () => {
    const score = calculateProfileScore({ ...FULL_PROFILE, short_description: 'Corto' })
    const c = score.breakdown.find(c => c.key === 'shortDescription')!
    expect(c.earned).toBe(0)
  })

  it('experienceDescription 150+ chars → 15pts (full)', () => {
    const c = calculateProfileScore(FULL_PROFILE).breakdown.find(c => c.key === 'experienceDescription')!
    expect(c.earned).toBe(15)
    expect(c.met).toBe(true)
  })

  it('experienceDescription 50–149 chars → 7pts (mid)', () => {
    const c = calculateProfileScore({ ...FULL_PROFILE, experience_description: 'a'.repeat(80) }).breakdown.find(c => c.key === 'experienceDescription')!
    expect(c.earned).toBe(7)
    expect(c.met).toBe(false)
  })

  it('experienceDescription < 50 chars → 0pts', () => {
    const score = calculateProfileScore({ ...FULL_PROFILE, experience_description: 'Poco' })
    const c = score.breakdown.find(c => c.key === 'experienceDescription')!
    expect(c.earned).toBe(0)
  })
})

describe('calculateProfileScore — modality (5pts, binary)', () => {
  it('any modality → 5pts', () => {
    const c = calculateProfileScore({ ...FULL_PROFILE, modality: ['online'] }).breakdown.find(c => c.key === 'modality')!
    expect(c.earned).toBe(5)
    expect(c.met).toBe(true)
  })

  it('in-person only → 5pts', () => {
    const c = calculateProfileScore({ ...FULL_PROFILE, modality: ['in-person'] }).breakdown.find(c => c.key === 'modality')!
    expect(c.earned).toBe(5)
    expect(c.met).toBe(true)
  })

  it('both modalities → 5pts', () => {
    const c = calculateProfileScore({ ...FULL_PROFILE, modality: ['online', 'in-person'] }).breakdown.find(c => c.key === 'modality')!
    expect(c.earned).toBe(5)
    expect(c.met).toBe(true)
  })

  it('empty modality → 0pts', () => {
    const c = calculateProfileScore({ ...FULL_PROFILE, modality: [] }).breakdown.find(c => c.key === 'modality')!
    expect(c.earned).toBe(0)
  })
})

describe('calculateProfileScore — numeric overrides', () => {
  it('override with max weight awards full points', () => {
    // profileImage weight is 10 — pass 10 to get met:true
    const score = calculateProfileScore(
      { ...EMPTY_PROFILE, profile_image_url: 'raw-filename.jpg' },
      { profileImage: 10 }
    )
    const c = score.breakdown.find(c => c.key === 'profileImage')!
    expect(c.met).toBe(true)
    expect(c.earned).toBe(10)
  })

  it('override with 0 removes all points even when computed is true', () => {
    const c = calculateProfileScore(FULL_PROFILE, { profileImage: 0 }).breakdown.find(c => c.key === 'profileImage')!
    expect(c.met).toBe(false)
    expect(c.earned).toBe(0)
  })

  it('override with partial value gives partial score and met=false', () => {
    // shortDescription weight is 15 — partial override of 8
    const c = calculateProfileScore(FULL_PROFILE, { shortDescription: 8 }).breakdown.find(c => c.key === 'shortDescription')!
    expect(c.earned).toBe(8)
    expect(c.met).toBe(false)
  })

  it('override clamps to weight — cannot exceed max', () => {
    // profileImage weight is 10 — 99 clamps to 10
    const c = calculateProfileScore(FULL_PROFILE, { profileImage: 99 }).breakdown.find(c => c.key === 'profileImage')!
    expect(c.earned).toBe(10)
  })

  it('override affects total score', () => {
    const normal = calculateProfileScore(FULL_PROFILE)
    const overridden = calculateProfileScore(FULL_PROFILE, { profileImage: 0 })
    expect(overridden.total).toBe(normal.total - 10) // profileImage weight = 10
  })

  it('unrelated criteria are unaffected by override', () => {
    const score = calculateProfileScore(FULL_PROFILE, { profileImage: 0 })
    const bio = score.breakdown.find(c => c.key === 'bio')!
    expect(bio.met).toBe(true)
    expect(bio.earned).toBe(5) // bio weight = 5
  })
})
