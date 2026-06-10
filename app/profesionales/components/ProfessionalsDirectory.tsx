'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Practice } from '@/lib/practices'
import { SPECIALTY_MAP } from '@/lib/design-constants'
import { Chip } from '@/app/components/ui/Chip'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { WelcomeHint } from './WelcomeHint'
import { DirectoryFilters, DEFAULT_FILTERS } from './DirectoryFilters'
import type { FilterState } from './DirectoryFilters'
import { LocationFilter } from './LocationFilter'
import { ProfessionalCard } from './ProfessionalCard'
import { DirectoryMap } from './DirectoryMap'

export interface DirectoryProfessional {
  slug: string
  full_name: string
  specialties: string[] | null
  practices: string[] | null
  modality: string[] | null
  short_description: string | null
  city: string | null
  country: string
  latitude: number | null
  longitude: number | null
  online_only: boolean
  profile_image_url: string | null
  price_range_min: number | null
  price_range_max: number | null
  currency: string | null
  rating_average: number | null
  rating_count: number | null
  subscription_tier: string | null
  tier_expires_at: string | null
  ranking_score: number | null
}

// Lowercase + strip NFD diacritics — same logic as lib/admin-practices.ts:50
export function normalize(s: string): string {
  return s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Pre-computes normalized searchable terms per practice key (key + label + aliases + specialty labels)
export function buildPracticeIndex(practices: Practice[]): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const p of practices) {
    const terms = [
      normalize(p.key),
      normalize(p.label),
      ...(p.aliases ?? []).map(normalize),
      ...(p.specialties ?? []).map(key => normalize(SPECIALTY_MAP[key] ?? key)),
    ]
    index.set(p.key, terms)
  }
  return index
}

// Pure filter predicate — exported for unit testing
export function matchesProfessional(
  pro: DirectoryProfessional,
  query: string,
  practiceIndex: Map<string, string[]>
): boolean {
  if (!query) return true
  const q = normalize(query)
  if (normalize(pro.full_name).includes(q)) return true
  if (pro.specialties?.some((s) => normalize(s).includes(q))) return true
  if (pro.practices?.some((key) => practiceIndex.get(key)?.some((t) => t.includes(q)))) return true
  return false
}

// Chip-filter predicate — AND across dimensions, OR within each dimension.
// practiceIndex is used as a fallback for pros with sparse `practices` data:
// if the structured key is missing, we check practice terms against free-text specialties.
export function matchesFilters(
  pro: DirectoryProfessional,
  filters: FilterState,
  practiceIndex: Map<string, string[]> = new Map()
): boolean {
  if (filters.practices.length > 0) {
    const hasPracticeMatch = filters.practices.some(filterKey => {
      if (pro.practices?.includes(filterKey)) return true
      const terms = practiceIndex.get(filterKey) ?? []
      return terms.some(term => pro.specialties?.some(s => normalize(s).includes(term)))
    })
    if (!hasPracticeMatch) return false
  }
  if (filters.specialties.length > 0) {
    if (!pro.specialties?.some(s => filters.specialties.includes(s))) return false
  }
  if (filters.modality === 'online') {
    if (!pro.online_only && !pro.modality?.includes('online')) return false
  } else if (filters.modality === 'presencial') {
    if (pro.online_only) return false
    if (pro.modality && pro.modality.length > 0 && !pro.modality.includes('presencial')) return false
  }
  if (filters.location) {
    if (pro.online_only) return false
    if (!pro.city) return false
    if (normalize(pro.city) !== normalize(filters.location.city)) return false
  }
  return true
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface Props {
  professionals: DirectoryProfessional[]
  practices: Practice[]
}

export function ProfessionalsDirectory({ professionals, practices }: Props) {
  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [visibleCount, setVisibleCount] = useState(12)
  const [view, setView] = useState<'list' | 'map'>('list')

  const practiceIndex = useMemo(() => buildPracticeIndex(practices), [practices])

  const specialtyOptions = useMemo(
    () => [...new Set(professionals.flatMap(p => p.specialties ?? []))].sort(),
    [professionals]
  )

  const filtered = useMemo(() => {
    const q = searchValue.trim()
    return professionals.filter(pro =>
      matchesProfessional(pro, q, practiceIndex) && matchesFilters(pro, filters, practiceIndex)
    )
  }, [professionals, searchValue, practiceIndex, filters])

  // Reset visible page whenever search or chip filters change
  useEffect(() => { setVisibleCount(12) }, [searchValue, filters])

  const hasActiveFilters =
    filters.practices.length > 0 ||
    filters.specialties.length > 0 ||
    filters.modality !== 'all' ||
    filters.location !== null

  const activeFilterCount =
    filters.practices.length +
    filters.specialties.length +
    (filters.modality !== 'all' ? 1 : 0) +
    (filters.location !== null ? 1 : 0)

  const isSearching = searchValue.trim().length > 0
  const showCount = isSearching || hasActiveFilters

  const visiblePros = filtered.slice(0, visibleCount)
  const remaining = filtered.length - visibleCount

  return (
    <div className="space-y-4">
      {/* Inline welcome hint — collapsible, first visit opens automatically */}
      <WelcomeHint />

      {/* Search input */}
      <div role="search" className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Buscá por nombre, práctica o síntoma..."
          aria-label="Buscar profesionales"
          className="w-full pl-9 pr-9 py-3 bg-surface/80 backdrop-blur-sm border border-outline rounded-2xl text-base md:text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all shadow-soft"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => setSearchValue('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filtros collapsible — transparent, blends with page background */}
      <details data-testid="filtros-section" className="group">
        <summary className="flex items-center gap-2 py-2 cursor-pointer list-none select-none hover:opacity-70 transition-opacity">
          <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
          </svg>
          <span className="text-sm font-medium text-foreground">Filtros</span>
          {activeFilterCount > 0 && (
            <span className="text-xs font-semibold bg-brand text-white rounded-full px-1.5 min-w-[1.25rem] h-[1.25rem] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          <svg
            className="ml-auto w-4 h-4 text-muted/60 shrink-0 transition-transform duration-200 group-open:rotate-180"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>

        <div className="pt-3 space-y-4">
          {/* Row: Ubicación (left) + Modalidad (right) — side by side on desktop */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-8">
            <div className="md:flex-1">
              <LocationFilter
                value={filters.location}
                onChange={(loc) => setFilters(f => ({ ...f, location: loc }))}
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-muted uppercase mb-1.5">Modalidad</p>
              <div className="flex flex-wrap gap-2">
                {(['online', 'presencial'] as const).map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilters(f => ({ ...f, modality: f.modality === value ? 'all' : value }))}
                    aria-pressed={filters.modality === value}
                    aria-label={`Filtrar por ${value === 'online' ? 'Online' : 'Presencial'}`}
                  >
                    <Chip
                      variant={filters.modality === value ? 'brand' : 'neutral'}
                      label={value === 'online' ? 'Online' : 'Presencial'}
                      className="cursor-pointer transition-colors"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Práctica chips + Limpiar filtros */}
          <DirectoryFilters
            filters={filters}
            onChange={setFilters}
            practiceOptions={practices.map(p => ({ key: p.key, label: p.label }))}
            specialtyOptions={specialtyOptions}
            showModalidad={false}
          />
        </div>
      </details>

      {/* Lista / Mapa toggle */}
      <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-xl w-fit border border-outline">
        {(['list', 'map'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === v
                ? 'bg-surface text-foreground shadow-soft'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {v === 'list' ? 'Lista' : 'Mapa'}
          </button>
        ))}
      </div>

      {/* Live region — announces filter changes to screen readers */}
      <div aria-live="polite" aria-atomic="false" className="space-y-4">
        {/* Unified result count — shown when searching or any chip filter active */}
        {showCount && (
          <p className="text-xs text-muted">
            {filtered.length} de {professionals.length} resultados
          </p>
        )}

        {view === 'map' ? (
          <DirectoryMap professionals={filtered} />
        ) : filtered.length === 0 ? (
          <GlassCard>
            <EmptyState
              title={isSearching || hasActiveFilters ? 'Sin resultados' : 'Todavía no hay profesionales disponibles.'}
              description={isSearching || hasActiveFilters ? 'Probá con otro término o limpiá los filtros.' : 'Volvé pronto.'}
            />
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
            {visiblePros.map((pro) => (
              <ProfessionalCard key={pro.slug} professional={pro} />
            ))}
          </div>
        )}

        {/* Cargar más — only in list view */}
        {view === 'list' && remaining > 0 && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleCount(c => c + 12)}
              className="px-6 py-3 rounded-full bg-surface border border-outline text-sm text-foreground hover:bg-surface-2 transition-colors shadow-soft"
            >
              Cargar más ({remaining} restantes)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
