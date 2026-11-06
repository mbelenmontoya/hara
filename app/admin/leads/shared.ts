export interface MatchedProfessional {
  rank: number
  name: string
  slug: string
}

export interface LeadMatch {
  id: string
  tracking_code: string
  created_at: string
  professionals: MatchedProfessional[]
}

export interface Lead {
  id: string
  email: string | null
  whatsapp: string | null
  country: string
  city: string | null
  intent_tags: string[]
  status: string
  urgency: string | null
  created_at: string
  /** What the person told us in the concierge form; only loaded on the lead detail page. */
  additional_context?: string | null
  latest_match: LeadMatch | null
  match_count: number
}

export const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'matched', label: 'Matcheado' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'converted', label: 'Convertido' },
  { value: 'closed', label: 'Cerrado' },
]

export const LEAD_STATUS_LABEL: Record<string, string> = {
  new: 'Nuevo',
  matched: 'Matcheado',
  contacted: 'Contactado',
  converted: 'Convertido',
  closed: 'Cerrado',
}

export const LEAD_URGENCY_LABEL: Record<string, string> = {
  high: 'Urgente',
  medium: 'Pronto',
  low: 'Sin prisa',
}

/** Urgency dot color per urgency value (Urgente, Pronto, Sin prisa). */
export const LEAD_URGENCY_DOT: Record<string, string> = {
  high: 'bg-danger-dark',
  medium: 'bg-warning-dark',
  low: 'bg-gray-500',
}

/** Card and detail title: the email, or a short id when the lead left none. */
export function leadTitle(lead: Pick<Lead, 'id' | 'email'>): string {
  return lead.email ?? `Solicitud ${lead.id.slice(0, 8)}`
}
