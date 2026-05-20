// Data types for the professional profile page

export interface Professional {
  id: string
  slug: string
  name: string
  specialties: string[]
  modality: string[]
  practices: string[]
  bio: string | null
  short_description: string | null
  experience_description: string | null
  instagram: string | null
  service_type: string[]
  offers_courses_online: boolean
  courses_presencial_location: string | null
  whatsapp: string
  country: string
  city: string | null
  online_only: boolean
  price_range_min: number | null
  price_range_max: number | null
  currency: string
  accepting_new_clients: boolean
  profile_image_url: string | null
  subscription_tier: string | null
  tier_expires_at: string | null
  rating_average: number
  rating_count: number
}

export interface Review {
  id: string
  rating: number
  text: string | null
  reviewer_name: string | null
  submitted_at: string
}
