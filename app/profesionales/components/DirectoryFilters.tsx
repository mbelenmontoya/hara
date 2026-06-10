'use client'

import { useState } from 'react'
import { Chip } from '@/app/components/ui/Chip'

// FilterState defined here (not in ProfessionalsDirectory) to keep the import graph acyclic:
// ProfessionalsDirectory → DirectoryFilters (component + type), DirectoryFilters → nothing upstream.
// LocationFilter (Task 5) imports LocationFilterValue from here too — do NOT import from ProfessionalsDirectory.

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

const MAX_COLLAPSED = 5

function getVisible<T>(
  items: T[],
  isActive: (item: T) => boolean,
  expanded: boolean
): { visible: T[]; hiddenCount: number } {
  if (expanded || items.length <= MAX_COLLAPSED) return { visible: items, hiddenCount: 0 }
  const first = items.slice(0, MAX_COLLAPSED)
  const activeOutside = items.slice(MAX_COLLAPSED).filter(isActive)
  return {
    visible: [...first, ...activeOutside],
    hiddenCount: items.length - MAX_COLLAPSED - activeOutside.length,
  }
}

interface DirectoryFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  practiceOptions: Array<{ key: string; label: string }>
  specialtyOptions: string[] // accepted but not rendered — data is free-text practice tags, not symptoms
  showModalidad?: boolean
}

export function DirectoryFilters({
  filters,
  onChange,
  practiceOptions,
  specialtyOptions: _specialtyOptions,
  showModalidad = true,
}: DirectoryFiltersProps) {
  const [practiceExpanded, setPracticeExpanded] = useState(false)

  const hasActiveFilters =
    filters.practices.length > 0 ||
    filters.specialties.length > 0 ||
    filters.modality !== 'all' ||
    filters.location !== null

  function togglePractice(key: string) {
    const next = filters.practices.includes(key)
      ? filters.practices.filter(k => k !== key)
      : [...filters.practices, key]
    onChange({ ...filters, practices: next })
  }

  function toggleModality(value: 'online' | 'presencial') {
    onChange({ ...filters, modality: filters.modality === value ? 'all' : value })
  }

  const { visible: visiblePractices, hiddenCount: hiddenPractices } = getVisible(
    practiceOptions,
    p => filters.practices.includes(p.key),
    practiceExpanded
  )

  return (
    <div className="space-y-3">

      {/* Práctica — only when ≥ 2 options */}
      {practiceOptions.length >= 2 && (
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-muted uppercase mb-1.5">
            Práctica
          </p>
          <div className="flex flex-wrap gap-2">
            {visiblePractices.map(({ key, label }) => {
              const isActive = filters.practices.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePractice(key)}
                  aria-pressed={isActive}
                  aria-label={`Filtrar por ${label}`}
                >
                  <Chip
                    variant={isActive ? 'brand' : 'neutral'}
                    label={label}
                    className="cursor-pointer transition-colors"
                  />
                </button>
              )
            })}
            {!practiceExpanded && hiddenPractices > 0 && (
              <button
                type="button"
                onClick={() => setPracticeExpanded(true)}
                className="px-2 py-1 text-[11px] font-medium rounded-full border bg-surface-2 text-muted border-outline hover:bg-surface hover:text-foreground transition-colors"
              >
                +{hiddenPractices} más
              </button>
            )}
            {practiceExpanded && practiceOptions.length > MAX_COLLAPSED && (
              <button
                type="button"
                onClick={() => setPracticeExpanded(false)}
                className="px-2 py-1 text-[11px] font-medium rounded-full border bg-surface-2 text-muted border-outline hover:bg-surface hover:text-foreground transition-colors"
              >
                Mostrar menos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modalidad — hidden when parent renders it inline (e.g. side-by-side with LocationFilter) */}
      {showModalidad && (
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-muted uppercase mb-1.5">
            Modalidad
          </p>
          <div className="flex flex-wrap gap-2">
            {(['online', 'presencial'] as const).map(value => {
              const isActive = filters.modality === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleModality(value)}
                  aria-pressed={isActive}
                  aria-label={`Filtrar por ${value === 'online' ? 'Online' : 'Presencial'}`}
                >
                  <Chip
                    variant={isActive ? 'brand' : 'neutral'}
                    label={value === 'online' ? 'Online' : 'Presencial'}
                    className="cursor-pointer transition-colors"
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Limpiar filtros */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-xs text-muted hover:text-foreground transition-colors underline underline-offset-2"
        >
          Limpiar filtros
        </button>
      )}

    </div>
  )
}
