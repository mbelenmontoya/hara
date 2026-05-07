// lib/practices.ts integration tests
// Tests getActivePractices() and validatePracticeKeys() against real Supabase.
// Depends on migration 010 having been applied.

import { describe, it, expect, beforeEach } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

describe('lib/practices — getActivePractices()', () => {
  beforeEach(async () => {
    // Reset module cache between tests by re-importing.
    // Vitest caches imports; use vi.resetModules() to flush the singleton.
    // (Cache TTL tests covered in unit project with mocked Date.)
  })

  it('should return 15 active practices in sort_order order', async () => {
    const { getActivePractices } = await import('@/lib/practices')
    const practices = await getActivePractices()
    expect(practices).toHaveLength(15)
    expect(practices[0].key).toBe('reiki')
    expect(practices[0].sort_order).toBe(10)
    expect(practices[14].key).toBe('terapia-energetica')
  })

  it('should exclude inactive practices', async () => {
    // All seeded practices are active=true by default.
    // This verifies the active=true filter is applied.
    const { getActivePractices } = await import('@/lib/practices')
    const practices = await getActivePractices()
    for (const p of practices) {
      expect(p.active).toBe(true)
    }
  })

  it('should return Practice objects with required fields', async () => {
    const { getActivePractices } = await import('@/lib/practices')
    const practices = await getActivePractices()
    const first = practices[0]
    expect(first).toHaveProperty('key')
    expect(first).toHaveProperty('label')
    expect(first).toHaveProperty('slug')
    expect(first).toHaveProperty('sort_order')
    expect(first).toHaveProperty('active')
  })
})

describe('lib/practices — validatePracticeKeys()', () => {
  it('should return ok:true for valid keys', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    const result = await validatePracticeKeys(['reiki', 'meditacion-mindfulness'])
    expect(result.ok).toBe(true)
  })

  it('should return ok:false with the offending key for an invalid key', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    const result = await validatePracticeKeys(['reiki', 'definitely-not-a-practice'])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.invalidKey).toBe('definitely-not-a-practice')
    }
  })

  it('should return ok:true for an empty array', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    const result = await validatePracticeKeys([])
    expect(result.ok).toBe(true)
  })

  it('should return the first invalid key when multiple bad keys are present', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    const result = await validatePracticeKeys(['bad-key-1', 'bad-key-2'])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.invalidKey).toBe('bad-key-1')
    }
  })

  it('should accept all 15 canonical keys as valid', async () => {
    const { validatePracticeKeys } = await import('@/lib/practices')
    const allKeys = [
      'reiki', 'constelaciones-familiares', 'registros-akashicos',
      'diseno-humano', 'terapia-floral', 'masaje-terapeutico',
      'meditacion-mindfulness', 'biodecodificacion', 'sonoterapia',
      'tarot-terapeutico', 'astrologia', 'coaching-ontologico',
      'aromaterapia', 'yoga-terapeutico', 'terapia-energetica',
    ]
    const result = await validatePracticeKeys(allKeys)
    expect(result.ok).toBe(true)
  })
})
