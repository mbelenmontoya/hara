'use client'

// "¿Cómo llegás hoy?" cards and the list of everyone. Nothing is selected at first;
// tapping a card puts the people with that specialty first, tapping it again restores the order.
// The concierge block is passed as children and sits below the list.

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { splitFeatured, type ArrivalCard as ArrivalCardData, type HomeRow } from '@/lib/home-arrival'
import { DEFAULT_FILTERS } from '@/app/profesionales/components/DirectoryFilters'
import { DirectoryMap } from '@/app/profesionales/components/DirectoryMap'
import { filterProfessionals, filterRows, orderByElement, type HomeQuery } from '@/lib/home-filters'
import type { Practice } from '@/lib/practices'
import type { DirectoryProfessional } from '@/app/profesionales/components/ProfessionalsDirectory'
import { ArrivalCard } from './ArrivalCard'
import { HomeFeatured } from './HomeFeatured'
import { HomeRowCard } from './HomeRowCard'
import { HomeFilterBar, type HomeView } from './HomeFilterBar'

const PAGE_SIZE = 12

interface HomeArrivalProps {
  cards: ArrivalCardData[]
  rows: HomeRow[]
  professionals: DirectoryProfessional[]
  practices: Practice[]
  children?: ReactNode
}

export function HomeArrival({ cards, rows, professionals, practices, children }: HomeArrivalProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [query, setQuery] = useState<HomeQuery>({ search: '', filters: DEFAULT_FILTERS })
  const [view, setView] = useState<HomeView>('list')
  const matched = useMemo(() => filterProfessionals(professionals, practices, query), [professionals, practices, query])
  const shown = orderByElement(filterRows(rows, matched), selectedKey)
  const { featured, rest } = splitFeatured(shown)
  const remaining = rest.length - visibleCount
  const shownCount = (featured ? 1 : 0) + Math.min(visibleCount, rest.length)

  return (
    <>
      {cards.length > 0 && (
        <div className="mt-[22px] grid grid-cols-2 gap-2.5">
          {cards.map((card) => {
            const isSelected = card.key === selectedKey
            return (
              <ArrivalCard
                key={card.key}
                card={card}
                isSelected={isSelected}
                onToggle={() => setSelectedKey(isSelected ? null : card.key)}
              />
            )
          })}
        </div>
      )}

      <section className="mt-9">
        <p className="almanac-label">{professionals.length} {professionals.length === 1 ? 'PROFESIONAL' : 'PROFESIONALES'}</p>
        <h2 className="font-almanac-serif mt-1.5 text-[30px] leading-[1.05]">
          Todos los <em>profesionales</em>
        </h2>

        <HomeFilterBar
          query={query}
          onChange={(next) => {
            setQuery(next)
            setVisibleCount(PAGE_SIZE)
          }}
          professionals={professionals}
          practices={practices}
          resultCount={matched.length}
          view={view}
          onViewChange={setView}
        />

        {view === 'map' ? (
          <div className="mt-3">
            <DirectoryMap professionals={matched} />
          </div>
        ) : shown.length === 0 ? (
          <div className="mt-5">
            <h3 className="font-almanac-serif mb-0 px-1 text-[28px] leading-[1.1]">
              Nadie con eso, <em className="text-brand">todavía</em>.
            </h3>
            <p className="font-almanac mt-2 px-1 text-[14.5px] leading-[1.5] text-gray-700">
              Probá quitando un filtro, o dejá que una persona del equipo busque por vos.
            </p>
            <div className="relative mt-4 overflow-hidden rounded-3xl bg-foreground p-5 text-background">
              <img src="/assets/almanac/orbita_punteada-cream.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -right-[26px] -top-[18px] h-[150px] w-[110px] object-contain opacity-50" />
              <p className="font-almanac text-[10.5px] font-medium uppercase tracking-[0.21em] text-brand-weak">Concierge · Gratis</p>
              <p className="font-almanac-serif mt-2 max-w-[230px] text-[24px] leading-[1.1]">
                Te elegimos <em>tres</em>.
              </p>
              <Link href="/solicitar" className="font-almanac mt-3.5 inline-flex rounded-[13px] bg-brand-weak px-[18px] py-[11px] text-sm font-medium text-brand-dark">
                Contanos →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {featured && <HomeFeatured pro={featured} />}
            {shown.some((r) => r.score != null) && (
              <div className="font-almanac flex items-center gap-2.5 px-1.5 pb-0 pt-4 text-[12.5px] leading-[1.45] text-gray-700">
                <span
                  className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full"
                  style={{ background: 'conic-gradient(var(--color-brand) 80%, color-mix(in srgb, var(--color-foreground) 12%, transparent) 0)' }}
                  aria-hidden="true"
                >
                  <span className="h-3 w-3 rounded-full bg-background" />
                </span>
                Índice Hara: qué tan completo está el perfil y cómo lo valoran en las reseñas.
              </div>
            )}
            {rest.length > 0 && (
              <ul className="mt-2.5 flex flex-col gap-2.5">
                {rest.slice(0, visibleCount).map((pro) => <HomeRowCard key={pro.slug} pro={pro} />)}
              </ul>
            )}
            <p className="almanac-label mt-[18px] text-center">
              MOSTRANDO {shownCount} DE {shown.length}
            </p>
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="font-almanac mt-2.5 w-full rounded-2xl border-[1.5px] border-foreground/20 py-3.5 text-center text-[14.5px] font-medium"
              >
                Cargar {Math.min(PAGE_SIZE, remaining)} más ({remaining} restantes)
              </button>
            )}
          </>
        )}
      </section>

      {children && <div className="mt-9">{children}</div>}
    </>
  )
}
