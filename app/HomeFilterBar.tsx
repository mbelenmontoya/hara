'use client'

// Sticky bar above the home list, as in the design: a dark search button and the three pills
// (each opens its own panel), the result count, "Limpiar filtros" and the Lista / Mapa toggle.
// The search button turns into a field (the pills stay below it); Cancelar clears it.
// Whether the field is open lives in HomeSearchProvider, so Buscar in the bottom bar can open it too.
// It is controlled: the parent owns the search and filters and applies them right away.

import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_FILTERS } from '@/app/profesionales/components/DirectoryFilters'
import type { DirectoryProfessional } from '@/app/profesionales/components/ProfessionalsDirectory'
import { cityOptions, modalityCounts, practiceOptions, type HomeQuery } from '@/lib/home-filters'
import type { Practice } from '@/lib/practices'
import { CityPanel, ModalityPanel, PracticesPanel } from './HomeFilterPanels'
import { HOME_SEARCH_ANCHOR } from '@/lib/home-search'
import { Magnifier, useHomeSearch } from './HomeSearch'

export type HomeView = 'list' | 'map'
type PanelId = 'practices' | 'modality' | 'city'

interface Pill {
  id: PanelId
  label: string
  active: boolean
}

interface HomeFilterBarProps {
  query: HomeQuery
  onChange: (query: HomeQuery) => void
  professionals: DirectoryProfessional[]
  practices: Practice[]
  resultCount: number
  view: HomeView
  onViewChange: (view: HomeView) => void
}

export function HomeFilterBar({ query, onChange, professionals, practices, resultCount, view, onViewChange }: HomeFilterBarProps) {
  const [open, setOpen] = useState<PanelId | null>(null)
  const { searching, openSearch, closeSearch } = useHomeSearch()
  const pillRefs = useRef<Partial<Record<PanelId, HTMLButtonElement | null>>>({})
  const { search, filters } = query

  const practiceChoices = useMemo(() => practiceOptions(professionals, practices), [professionals, practices])
  const modalities = useMemo(() => modalityCounts(professionals), [professionals])
  const cities = useMemo(() => cityOptions(professionals), [professionals])

  function close() {
    const was = open
    setOpen(null)
    if (was) pillRefs.current[was]?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const setFilters = (next: typeof filters) => onChange({ search, filters: next })
  const hasFilters = filters.practices.length > 0 || filters.modality !== 'all' || filters.location !== null
  const isActive = hasFilters || search.trim() !== ''

  const firstPractice = practices.find((p) => p.key === filters.practices[0])?.label ?? 'Prácticas'
  const practiceLabel =
    filters.practices.length > 1 ? `${firstPractice} +${filters.practices.length - 1}` : filters.practices.length === 1 ? firstPractice : 'Prácticas'
  const pills: Pill[] = [
    { id: 'practices', label: practiceLabel, active: filters.practices.length > 0 },
    {
      id: 'modality',
      label: filters.modality === 'online' ? 'Online' : filters.modality === 'presencial' ? 'Presencial' : 'Modalidad',
      active: filters.modality !== 'all',
    },
    { id: 'city', label: filters.location?.city ?? 'Ciudad', active: filters.location !== null },
  ]

  const pillRow = (
    <div className="flex min-w-0 flex-1 gap-[7px] overflow-x-auto">
      {pills.map((pill) => (
        <button
          key={pill.id}
          ref={(el) => { pillRefs.current[pill.id] = el }}
          type="button"
          aria-expanded={open === pill.id}
          aria-haspopup="dialog"
          onClick={() => setOpen(pill.id)}
          className={`flex flex-none items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] py-2 pl-[15px] pr-[13px] text-[13px] font-medium ${
            pill.active ? 'border-brand-dark bg-brand-dark text-gray-50' : 'border-foreground/15 bg-gray-50 text-foreground'
          }`}
        >
          {pill.label}
          <span className={`-mt-[3px] h-[5px] w-[5px] rotate-45 border-b-[1.5px] border-r-[1.5px] ${pill.active ? 'border-gray-50' : 'border-foreground'}`} aria-hidden="true" />
        </button>
      ))}
    </div>
  )

  const clearAll = () => {
    onChange({ search: '', filters: DEFAULT_FILTERS })
    closeSearch()
  }

  // The panels sit outside the sticky element: its backdrop blur would otherwise become their containing block.
  return (
    <>
      <div id={HOME_SEARCH_ANCHOR} aria-hidden="true" />
      <div className="font-almanac sticky top-0 z-20 -mx-[22px] mt-3.5 border-b border-foreground/10 bg-background/95 px-4 pb-2.5 pt-2.5 backdrop-blur-[16px]">
        {searching ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-gray-50 pl-[15px] pr-2 shadow-[inset_0_0_0_1.5px] shadow-foreground/10">
                <Magnifier className="text-muted" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => onChange({ search: e.target.value, filters })}
                  placeholder="Nombre, práctica o síntoma"
                  aria-label="Buscar profesionales"
                  className="min-w-0 flex-1 bg-transparent py-3.5 text-base text-foreground outline-none placeholder:text-muted"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Borrar búsqueda"
                    onClick={() => onChange({ search: '', filters })}
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-surface-2 text-base"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  onChange({ search: '', filters })
                  closeSearch()
                }}
                className="flex-none text-[13.5px] font-medium text-brand-dark"
              >
                Cancelar
              </button>
            </div>
            <div className="mt-2 flex">{pillRow}</div>
          </>
        ) : (
          <div className="flex items-center gap-[7px]">
            <button
              type="button"
              aria-label="Buscar"
              onClick={openSearch}
              className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-foreground text-background"
            >
              <Magnifier className="" />
            </button>
            {pillRow}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2.5">
          <span aria-live="polite" className="text-[13px] font-medium">
            {resultCount} de {professionals.length} resultados
          </span>
          {isActive && (
            <button type="button" onClick={clearAll} className="text-[12.5px] font-medium text-brand-dark underline underline-offset-[3px]">
              Limpiar filtros
            </button>
          )}
          <div className="ml-auto flex gap-0.5 rounded-[11px] bg-surface-2 p-0.5">
            {(['list', 'map'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => onViewChange(v)}
                className={`rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium ${view === v ? 'bg-gray-50 text-foreground shadow-soft' : 'text-gray-700'}`}
              >
                {v === 'list' ? 'Lista' : 'Mapa'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <PanelHost
          open={open}
          practiceChoices={practiceChoices}
          modalities={modalities}
          cities={cities}
          practices={practices}
          filters={filters}
          onChange={setFilters}
          onClose={close}
          resultCount={resultCount}
        />
      )}
    </>
  )
}

function PanelHost({ open, practiceChoices, modalities, cities, practices, ...panel }: {
  open: PanelId
  practiceChoices: ReturnType<typeof practiceOptions>
  modalities: ReturnType<typeof modalityCounts>
  cities: ReturnType<typeof cityOptions>
  practices: Practice[]
  filters: HomeQuery['filters']
  onChange: (filters: HomeQuery['filters']) => void
  onClose: () => void
  resultCount: number
}) {
  const specialtiesOf = (key: string) => practices.find((p) => p.key === key)?.specialties ?? []
  if (open === 'practices') return <PracticesPanel options={practiceChoices} specialtiesOf={specialtiesOf} {...panel} />
  if (open === 'modality') return <ModalityPanel counts={modalities} {...panel} />
  return <CityPanel options={cities} {...panel} />
}
