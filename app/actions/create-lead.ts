'use server'

// Hara Match - Lead Creation Server Action
// Purpose: Create lead using service role (RLS-safe)
// Note: leads table RLS denies public INSERT, must use service role

import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyNewLead } from '@/lib/email'
import { validatePracticeKeys } from '@/lib/practices'

export interface CreateLeadInput {
  country: string
  intent_tags: string[]
  city?: string
  online_ok?: boolean
  modality_preference?: string[]
  budget_min?: number
  budget_max?: number
  currency?: string
  practice_preference?: string[]
  urgency?: string
  email?: string
  whatsapp?: string
  additional_context?: string
}

export async function createLead(input: CreateLeadInput) {
  if (!input.country || !input.intent_tags || input.intent_tags.length === 0) {
    throw new Error('Country and intent tags are required')
  }

  if (input.practice_preference && input.practice_preference.length > 0) {
    const validation = await validatePracticeKeys(input.practice_preference)
    if (!validation.ok) {
      throw new Error(`Práctica inválida: ${validation.invalidKey}`)
    }
  }

  const { data, error } = await supabaseAdmin.from('leads').insert({
    country: input.country,
    city: input.city,
    online_ok: input.online_ok ?? true,
    modality_preference: input.modality_preference,
    budget_min: input.budget_min,
    budget_max: input.budget_max,
    currency: input.currency || 'USD',
    intent_tags: input.intent_tags,
    practice_preference: input.practice_preference,
    urgency: input.urgency,
    email: input.email,
    whatsapp: input.whatsapp,
    additional_context: input.additional_context,
    status: 'new',
  }).select().single()

  if (error) {
    console.error('Failed to create lead:', error)
    throw new Error('Failed to create lead')
  }

  notifyNewLead({
    intent_tags: input.intent_tags,
    country: input.country,
    city: input.city,
    whatsapp: input.whatsapp || '',
    urgency: input.urgency,
    modality_preference: input.modality_preference,
  }).catch(() => {})

  return { lead_id: data.id }
}
