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

export const LEAD_STATUS_VARIANT: Record<string, 'new' | 'matched' | 'contacted' | 'converted' | 'closed' | 'default'> = {
  new: 'new',
  matched: 'matched',
  contacted: 'contacted',
  converted: 'converted',
  closed: 'closed',
}

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
