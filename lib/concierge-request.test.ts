import { describe, it, expect } from 'vitest'
import {
  EMPTY_CONCIERGE_STATE,
  buildAdditionalContext,
  countryFromWhatsapp,
  isStepComplete,
  toLeadInput,
  type ConciergeState,
} from './concierge-request'

const PLACE = { city: 'Rosario', country: 'Argentina', countryCode: 'AR', display: 'Rosario, Santa Fe, Argentina' }
const AR_WHATSAPP = '+5493414567890'
const MX_WHATSAPP = '+525512345678'

function state(overrides: Partial<ConciergeState> = {}): ConciergeState {
  return { ...EMPTY_CONCIERGE_STATE, ...overrides }
}

const FULL: ConciergeState = state({
  intents: ['estres-ansiedad', 'duelo-perdidas'],
  modality: 'presencial',
  place: PLACE,
  schedule: ['Mañana', 'Noche'],
  budgetMin: '15000',
  budgetMax: '30000',
  currency: 'ARS',
  words: 'Desde marzo duermo mal.',
  seenBefore: 'no',
  urgency: 'medium',
  name: 'Ana',
  whatsapp: AR_WHATSAPP,
  email: 'ana@test.com',
  consent: true,
})

describe('countryFromWhatsapp', () => {
  it('should read the country from an international number', () => {
    expect(countryFromWhatsapp(AR_WHATSAPP)).toBe('AR')
    expect(countryFromWhatsapp(MX_WHATSAPP)).toBe('MX')
  })

  it('should return null when the number has no readable country', () => {
    expect(countryFromWhatsapp('')).toBeNull()
    expect(countryFromWhatsapp('12345')).toBeNull()
  })
})

describe('buildAdditionalContext', () => {
  it('should write the labeled note in order, with the words after an empty line', () => {
    expect(buildAdditionalContext(FULL)).toBe(
      'Nombre: Ana\nHorario: Mañana, Noche\nFue con alguien antes: No\n\nDesde marzo duermo mal.',
    )
  })

  it('should skip the parts that were not filled', () => {
    expect(buildAdditionalContext(state({ name: ' Ana ', seenBefore: 'si' }))).toBe('Nombre: Ana\nFue con alguien antes: Sí')
    expect(buildAdditionalContext(state({ words: '  Solo esto.  ' }))).toBe('Solo esto.')
  })

  it('should return undefined when nothing was filled', () => {
    expect(buildAdditionalContext(state({ name: '   ', words: ' ' }))).toBeUndefined()
  })
})

describe('toLeadInput', () => {
  it('should map every answer onto the lead fields, with the country from the place', () => {
    expect(toLeadInput(FULL)).toEqual({
      intent_tags: ['estres-ansiedad', 'duelo-perdidas'],
      country: 'AR',
      city: 'Rosario',
      online_ok: false,
      modality_preference: ['presencial'],
      budget_min: 15000,
      budget_max: 30000,
      currency: 'ARS',
      urgency: 'medium',
      whatsapp: AR_WHATSAPP,
      email: 'ana@test.com',
      additional_context: 'Nombre: Ana\nHorario: Mañana, Noche\nFue con alguien antes: No\n\nDesde marzo duermo mal.',
    })
  })

  it('should take the country from the WhatsApp number for online requests and leave optional fields out', () => {
    const input = toLeadInput(state({ intents: ['pareja'], modality: 'online', whatsapp: MX_WHATSAPP, email: 'a@b.co' }))
    expect(input).toEqual({
      intent_tags: ['pareja'],
      country: 'MX',
      city: undefined,
      online_ok: true,
      modality_preference: ['online'],
      budget_min: undefined,
      budget_max: undefined,
      currency: 'USD',
      urgency: undefined,
      whatsapp: MX_WHATSAPP,
      email: 'a@b.co',
      additional_context: undefined,
    })
  })

  it('should treat "ambos" as open to online', () => {
    expect(toLeadInput({ ...FULL, modality: 'ambos' }).online_ok).toBe(true)
  })
})

describe('isStepComplete', () => {
  it('should require at least one intent on step 1', () => {
    expect(isStepComplete(state(), 1)).toBe(false)
    expect(isStepComplete(state({ intents: ['pareja'] }), 1)).toBe(true)
  })

  it('should require a format on step 2, and a place for presencial and ambos', () => {
    expect(isStepComplete(state(), 2)).toBe(false)
    expect(isStepComplete(state({ modality: 'online' }), 2)).toBe(true)
    expect(isStepComplete(state({ modality: 'presencial' }), 2)).toBe(false)
    expect(isStepComplete(state({ modality: 'ambos' }), 2)).toBe(false)
    expect(isStepComplete(state({ modality: 'ambos', place: PLACE }), 2)).toBe(true)
  })

  it('should always let step 3 continue', () => {
    expect(isStepComplete(state(), 3)).toBe(true)
  })

  it('should require name, valid WhatsApp, valid email, consent and a country on step 4', () => {
    expect(isStepComplete(FULL, 4)).toBe(true)
    expect(isStepComplete({ ...FULL, name: '  ' }, 4)).toBe(false)
    expect(isStepComplete({ ...FULL, consent: false }, 4)).toBe(false)
    expect(isStepComplete({ ...FULL, whatsapp: '+54911' }, 4)).toBe(false)
    expect(isStepComplete({ ...FULL, email: 'ana@test' }, 4)).toBe(false)
  })

  it('should block step 4 for an online request whose number has no readable country', () => {
    const online = { ...FULL, modality: 'online' as const, place: null }
    expect(isStepComplete(online, 4)).toBe(true)
    // +800 is a valid international freephone number that belongs to no country
    expect(isStepComplete({ ...online, whatsapp: '+80012345678' }, 4)).toBe(false)
  })
})
