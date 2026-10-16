// Concierge request form (/solicitar, almanac design 9a): the form state, when each step is complete,
// and how the answers map onto the existing lead fields that createLead writes.

import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js'
import type { CreateLeadInput } from '@/app/actions/create-lead'

export type ConciergeModality = '' | 'online' | 'presencial' | 'ambos'
export type ConciergeUrgency = '' | 'low' | 'medium' | 'high'
export type ConciergeStep = 1 | 2 | 3 | 4

export interface ConciergePlace {
  city: string
  country: string
  countryCode: string
  display: string
}

export interface ConciergeState {
  intents: string[]
  modality: ConciergeModality
  place: ConciergePlace | null
  schedule: string[]
  budgetMin: string
  budgetMax: string
  currency: string
  words: string
  seenBefore: '' | 'si' | 'no'
  urgency: ConciergeUrgency
  name: string
  whatsapp: string
  email: string
  consent: boolean
}

/** The latest Diario post, shown as "Mientras tanto" on the confirmation. */
export interface ConciergeLatestPost {
  slug: string
  title: string
  coverUrl: string | null
  minutes: number
}

export const EMPTY_CONCIERGE_STATE: ConciergeState = {
  intents: [],
  modality: '',
  place: null,
  schedule: [],
  budgetMin: '',
  budgetMax: '',
  currency: 'USD',
  words: '',
  seenBefore: '',
  urgency: '',
  name: '',
  whatsapp: '',
  email: '',
  consent: false,
}

export const SCHEDULE_OPTIONS = ['Mañana', 'Tarde', 'Noche', 'Fines de semana'] as const

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Country code (e.g. "AR") read from an international WhatsApp number, or null. */
export function countryFromWhatsapp(whatsapp: string): string | null {
  return parsePhoneNumberFromString(whatsapp)?.country ?? null
}

/** True when the person must pick a place (Zona): presencial or both. */
export function needsPlace(modality: ConciergeModality): boolean {
  return modality === 'presencial' || modality === 'ambos'
}

/** The lead's country: from the chosen place, otherwise from the WhatsApp number. */
function leadCountry(state: ConciergeState): string | null {
  return state.place?.countryCode || countryFromWhatsapp(state.whatsapp)
}

/** The short labeled note saved in leads.additional_context, or undefined when nothing was filled. */
export function buildAdditionalContext(state: ConciergeState): string | undefined {
  const lines: string[] = []
  if (state.name.trim()) lines.push(`Nombre: ${state.name.trim()}`)
  if (state.schedule.length > 0) lines.push(`Horario: ${state.schedule.join(', ')}`)
  if (state.seenBefore) lines.push(`Fue con alguien antes: ${state.seenBefore === 'si' ? 'Sí' : 'No'}`)
  const words = state.words.trim()
  if (words) return lines.length > 0 ? `${lines.join('\n')}\n\n${words}` : words
  return lines.length > 0 ? lines.join('\n') : undefined
}

/** Maps the form answers onto the input createLead expects. */
export function toLeadInput(state: ConciergeState): CreateLeadInput {
  return {
    intent_tags: state.intents,
    country: leadCountry(state) ?? '',
    city: state.place?.city || undefined,
    online_ok: state.modality !== 'presencial',
    modality_preference: state.modality ? [state.modality] : undefined,
    budget_min: state.budgetMin ? parseInt(state.budgetMin, 10) : undefined,
    budget_max: state.budgetMax ? parseInt(state.budgetMax, 10) : undefined,
    currency: state.currency,
    urgency: state.urgency || undefined,
    whatsapp: state.whatsapp,
    email: state.email,
    additional_context: buildAdditionalContext(state),
  }
}

function isContactComplete(state: ConciergeState): boolean {
  return (
    state.name.trim().length > 0 &&
    state.consent &&
    EMAIL_PATTERN.test(state.email) &&
    state.whatsapp.startsWith('+') &&
    isValidPhoneNumber(state.whatsapp) &&
    leadCountry(state) !== null
  )
}

/** Whether "Continuar" (or "Enviar") can be used on this step. */
export function isStepComplete(state: ConciergeState, step: ConciergeStep): boolean {
  switch (step) {
    case 1:
      return state.intents.length > 0
    case 2:
      return state.modality !== '' && (!needsPlace(state.modality) || state.place !== null)
    case 3:
      return true
    case 4:
      return isContactComplete(state)
  }
}
