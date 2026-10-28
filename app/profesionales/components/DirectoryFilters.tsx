// Filter state for the home search bar.
// Kept apart from ProfessionalsDirectory so the import graph stays acyclic.

export interface LocationFilterValue {
  city: string
  country: string
  lat: number | null
  lng: number | null
}

export interface FilterState {
  practices: string[]
  // specialties kept for future use when professionals.specialties stores curated symptom categories
  specialties: string[]
  modality: 'all' | 'online' | 'presencial'
  location: LocationFilterValue | null
}

export const DEFAULT_FILTERS: FilterState = {
  practices: [],
  specialties: [],
  modality: 'all',
  location: null,
}
