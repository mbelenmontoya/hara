'use server'

// Hará Match - Lead Creation Server Action
// Purpose: Create lead using service role (RLS-safe)
// Note: leads table RLS denies public INSERT, must use service role

import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyNewLead } from '@/lib/email'

export interface CreateLeadInput {
  country: string
  intent_tags: string[]
  city?: string
  online_ok?: boolean
  modality_preference?: string[]
  budget_min?: number
  budget_max?: number
  currency?: string
  style_preference?: string[]
  urgency?: string
  email?: string
  whatsapp?: string
  additional_context?: string
}

export async function createLead(input: CreateLeadInput) {
  // Validate required fields
  if (!input.country || !input.intent_tags || input.intent_tags.length === 0) {
    throw new Error('Country and intent tags are required')
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
    style_preference: input.style_preference,
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

  // Notify admin — fire and forget, never block the response
  notifyNewLead({
    intent_tags: input.intent_tags,
    country: input.country,
    city: input.city,
    whatsapp: input.whatsapp || '',
    urgency: input.urgency,
    modality_preference: input.modality_preference,
  }).catch(() => {}) // Swallow errors — email failure must not affect lead creation

  return { lead_id: data.id }
}
