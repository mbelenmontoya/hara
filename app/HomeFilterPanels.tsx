'use client'

// The three bottom-sheet panels of the home filter bar (Prácticas, Modalidad, Ciudad), as in the design:
// a sheet that slides up with a handle, a title, "Limpiar", the choices and a "Ver N resultados" button.
// They only show choices and report them; filtering happens in the parent right away.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { normalize } from '@/app/profesionales/components/ProfessionalsDirectory'
import type { FilterState } from '@/app/profesionales/components/DirectoryFilters'
import { SPECIALTY_COLORS } from '@/lib/design-constants'
import type { CityOption, ModalityCounts, PracticeOption } from '@/lib/home-filters'
import { locateNearMe } from '@/lib/near-me'

const OUTLINE_FIELD = 'shadow-[inset_0_0_0_1.5px] shadow-foreground/10'

function SearchIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 15 15" className={`h-[15px] w-[15px] flex-none ${className}`} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="4.7" />
      <path d="M9.3 9.5 14 14" />
    </svg>
  )
}

function Sheet({ title, onClose, onClear, resultCount, children }: {
  title: string
  onClose: () => void
  onClear: () => void
  resultCount: number
  children: ReactNode
}) {
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    titleRef.current?.focus()
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 bg-foreground/40 transition-opacity duration-300 ${entered ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        className={`font-almanac absolute inset-x-0 bottom-0 mx-auto flex max-h-[80%] w-full max-w-md flex-col rounded-t-[28px] bg-background transition-transform duration-[400ms] ${entered ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="mx-auto mt-2.5 h-1 w-[38px] flex-none rounded-sm bg-foreground/20" aria-hidden="true" />
        <div className="flex flex-none items-end justify-between gap-3 px-[22px] py-3.5">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="font-almanac-serif mb-0 text-[30px] leading-none outline-none">
            {title}
          </h2>
          <button type="button" onClick={onClear} className="pb-0.5 text-[13px] font-medium text-brand-dark">
            Limpiar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-3">{children}</div>
        <div className="flex-none border-t border-foreground/10 px-5 pb-[34px] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-brand-dark py-[15px] text-center text-[15px] font-medium text-gray-50"
          >
            Ver {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface PanelProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  onClose: () => void
  resultCount: number
}

export function PracticesPanel({ options, specialtiesOf, filters, onChange, onClose, resultCount }: PanelProps & {
  options: PracticeOption[]
  specialtiesOf: (practiceKey: string) => string[]
}) {
  const toggle = (key: string) =>
    onChange({
      ...filters,
      practices: filters.practices.includes(key) ? filters.practices.filter((k) => k !== key) : [...filters.practices, key],
    })
  return (
    <Sheet title="Prácticas" onClose={onClose} onClear={() => onChange({ ...filters, practices: [] })} resultCount={resultCount}>
      <div className="flex flex-wrap gap-[7px]">
        {options.map((o) => {
          const selected = filters.practices.includes(o.key)
          const dot = SPECIALTY_COLORS[specialtiesOf(o.key)[0]]?.text ?? 'text-brand'
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(o.key)}
              className={`flex items-center gap-[7px] rounded-full border-[1.5px] py-[7px] pl-2.5 pr-3 text-[13px] font-medium ${
                selected ? 'border-brand-dark bg-brand-dark text-gray-50' : 'border-foreground/15 bg-gray-50 text-foreground'
              } ${o.count === 0 && !selected ? 'opacity-45' : ''}`}
            >
              <span className={`h-[7px] w-[7px] rounded-full bg-current ${selected ? 'text-gray-50' : dot}`} aria-hidden="true" />
              {o.label}{' '}
              <span className={`font-normal ${selected ? 'text-gray-50/80' : 'text-muted'}`}>{o.count}</span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

const MODALITIES: Array<{ value: FilterState['modality']; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'online', label: 'Online' },
  { value: 'presencial', label: 'Presencial' },
]

export function ModalityPanel({ counts, filters, onChange, onClose, resultCount }: PanelProps & { counts: ModalityCounts }) {
  return (
    <Sheet title="Modalidad" onClose={onClose} onClear={() => onChange({ ...filters, modality: 'all' })} resultCount={resultCount}>
      <div role="radiogroup" aria-label="Modalidad" className="border-t border-foreground/10">
        {MODALITIES.map((m) => {
          const selected = filters.modality === m.value
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ ...filters, modality: m.value })}
              className="flex w-full items-center gap-3.5 border-b border-foreground/10 py-[15px] text-left"
            >
              <span className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-[1.5px] ${selected ? 'border-brand-dark' : 'border-foreground/25'}`} aria-hidden="true">
                <span className={`h-2.5 w-2.5 rounded-full bg-brand-dark ${selected ? 'opacity-100' : 'opacity-0'}`} />
              </span>
              <span className="font-almanac-serif flex-1 text-[20px] leading-[1.1]">{m.label}</span>{' '}
              <span className="text-[13px] text-muted">{counts[m.value]}</span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

type LocateState = 'idle' | 'loading' | 'error'
const LOCATE_NOTE: Record<LocateState, string> = {
  idle: '',
  loading: 'Buscando dónde estás…',
  error: 'No pudimos ubicarte. Escribí tu ciudad.',
}

export function CityPanel({ options, filters, onChange, onClose, resultCount }: PanelProps & { options: CityOption[] }) {
  const [typed, setTyped] = useState('')
  const [locate, setLocate] = useState<LocateState>('idle')
  // Detected after mount so the server and first client render match.
  const [canLocate, setCanLocate] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => { setCanLocate(!!apiKey && !!navigator.geolocation) }, [apiKey])

  const visible = options.filter((o) => normalize(o.city).includes(normalize(typed)))
  const current = filters.location ? normalize(filters.location.city) : null

  async function useMyLocation() {
    setLocate('loading')
    try {
      onChange({ ...filters, location: await locateNearMe(apiKey as string) })
      setLocate('idle')
    } catch {
      setLocate('error')
    }
  }

  return (
    <Sheet title="Ciudad" onClose={onClose} onClear={() => onChange({ ...filters, location: null })} resultCount={resultCount}>
      <div className={`flex items-center gap-2.5 rounded-2xl bg-gray-50 px-[15px] ${OUTLINE_FIELD}`}>
        <SearchIcon className="text-muted" />
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Escribí una ciudad"
          aria-label="Filtrar ciudades"
          className="min-w-0 flex-1 bg-transparent py-3.5 text-base text-foreground outline-none placeholder:text-muted"
        />
      </div>
      {canLocate && (
        <button type="button" onClick={useMyLocation} className="mt-1.5 flex w-full items-center gap-3.5 border-b border-foreground/10 py-[15px] text-left">
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-brand-weak" aria-hidden="true">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-[1.6px] border-brand-dark">
              <span className="h-1 w-1 rounded-full bg-brand-dark" />
            </span>
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-medium text-brand-dark">Usar mi ubicación</span>
            {LOCATE_NOTE[locate] && <span className="mt-px block text-[12.5px] text-muted">{LOCATE_NOTE[locate]}</span>}
          </span>
        </button>
      )}
      {visible.map((o) => {
        const selected = current === normalize(o.city)
        return (
          <button
            key={o.city}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange({ ...filters, location: { city: o.city, country: '', lat: null, lng: null } })}
            className="flex w-full items-center gap-3.5 border-b border-foreground/10 py-[13px] text-left"
          >
            <span className="flex-1">
              <span className="font-almanac-serif block text-[19px] leading-[1.15]">{o.city}</span>
              <span className="mt-px block text-[12.5px] text-muted">{o.count} {o.count === 1 ? 'profesional' : 'profesionales'}</span>
            </span>
            {selected && <span className="text-[15px] font-medium text-brand-dark" aria-label="Elegida">✓</span>}
          </button>
        )
      })}
      {visible.length === 0 && (
        <span className="block py-4 text-sm leading-[1.5] text-gray-700">
          Aún no hay profesionales ahí. Probá online, o pedile al concierge que busque por vos.
        </span>
      )}
      <button type="button" onClick={() => onChange({ ...filters, location: null })} className="py-3.5 text-[13.5px] font-medium text-brand-dark">
        Cualquier ciudad
      </button>
    </Sheet>
  )
}
