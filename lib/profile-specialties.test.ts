import { describe, it, expect } from 'vitest'
import { resolveProfileSpecialties } from './profile-specialties'
import type { Practice } from './practices'

const practice = (p: Partial<Practice> & Pick<Practice, 'key' | 'label'>): Practice => ({
  slug: p.key,
  sort_order: 0,
  active: true,
  specialties: [],
  aliases: [],
  ...p,
})

const CATALOG: Practice[] = [
  practice({ key: 'reiki', label: 'Reiki', specialties: ['estres-ansiedad', 'duelo-perdidas', 'trauma-heridas'] }),
  practice({ key: 'terapia-floral', label: 'Terapia floral (Flores de Bach)', aliases: ['flores de bach'], specialties: ['estres-ansiedad', 'miedos-creencias'] }),
  practice({ key: 'acupuntura', label: 'Acupuntura', aliases: ['medicina tradicional china'], specialties: ['estres-ansiedad', 'equilibrio-energetico'] }),
  practice({ key: 'coaching', label: 'Coaching', specialties: [] }),
]

describe('resolveProfileSpecialties', () => {
  it('maps linked practice keys to the specialties set on the practice', () => {
    const r = resolveProfileSpecialties({ practiceKeys: ['reiki'], specialties: [] }, CATALOG)
    expect(r.specialtyKeys).toEqual(['estres-ansiedad', 'duelo-perdidas', 'trauma-heridas'])
    expect(r.practiceKeys).toEqual(['reiki'])
  })

  it('finds practices from free-text specialties by key, label or alias, ignoring case and accents', () => {
    const r = resolveProfileSpecialties(
      { practiceKeys: [], specialties: ['Reiki Usui', 'flores de bach', 'Medicina Tradicional China', 'detox'] },
      CATALOG
    )
    expect(r.practiceKeys.sort()).toEqual(['acupuntura', 'reiki', 'terapia-floral'])
  })

  it('shows nothing for free text that matches no practice, and never echoes the free text', () => {
    const r = resolveProfileSpecialties({ practiceKeys: [], specialties: ['detox', 'medicina natural'] }, CATALOG)
    expect(r).toEqual({ specialtyKeys: [], practiceKeys: [] })
  })

  it('ranks specialties shared by more practices first', () => {
    const catalog = [
      practice({ key: 'a', label: 'Practica a', specialties: ['pareja', 'estres-ansiedad'] }),
      practice({ key: 'b', label: 'Practica b', specialties: ['familia-linaje', 'estres-ansiedad'] }),
    ]
    const r = resolveProfileSpecialties({ practiceKeys: ['a', 'b'], specialties: [] }, catalog)
    expect(r.specialtyKeys).toEqual(['estres-ansiedad', 'pareja', 'familia-linaje'])
  })

  it('keeps specialties the professional already set from the curated list, first and without duplicates', () => {
    const r = resolveProfileSpecialties({ practiceKeys: ['reiki'], specialties: ['pareja', 'trauma-heridas'] }, CATALOG)
    expect(r.specialtyKeys.slice(0, 2)).toEqual(['pareja', 'trauma-heridas'])
    expect(r.specialtyKeys.filter((k) => k === 'trauma-heridas')).toHaveLength(1)
  })

  it('caps the list at 6 specialties', () => {
    const wide = practice({
      key: 'wide',
      label: 'Wide',
      specialties: ['estres-ansiedad', 'bloqueos-emocionales', 'autoconocimiento', 'duelo-perdidas', 'vinculos-relaciones', 'pareja', 'familia-linaje', 'miedos-creencias'],
    })
    const r = resolveProfileSpecialties({ practiceKeys: ['wide'], specialties: [] }, [wide])
    expect(r.specialtyKeys).toHaveLength(6)
  })

  it('does not treat a short word inside free text as a practice match', () => {
    const catalog = [practice({ key: 'sol', label: 'Sol', specialties: ['pareja'] })]
    const r = resolveProfileSpecialties({ practiceKeys: [], specialties: ['consolacion'] }, catalog)
    expect(r.practiceKeys).toEqual([])
  })
})
