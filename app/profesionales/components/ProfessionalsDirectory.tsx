'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Practice } from '@/lib/practices'
import { SPECIALTY_MAP } from '@/lib/design-constants'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Chip } from '@/app/components/ui/Chip'
import { isEffectivelyDestacado } from '@/lib/ranking'
import { WelcomeHint } from './WelcomeHint'

export interface DirectoryProfessional {
  slug: string
  full_name: string
  specialties: string[] | null
  practices: string[] | null
  modality: string[] | null
  short_description: string | null
  city: string | null
  country: string
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

// ─── Format helpers (moved from app/profesionales/page.tsx) ──────────────────

function formatLocation(pro: DirectoryProfessional): string {
  if (pro.online_only) return 'Online'
  return [pro.city, pro.country].filter(Boolean).join(', ')
}

function formatPrice(pro: DirectoryProfessional): string | null {
  const { price_range_min: min, price_range_max: max, currency } = pro
  if (min == null && max == null) return null
  const cur = currency ?? 'USD'
  const fmt = (n: number) => `${cur === 'ARS' ? '$' : 'US$'}${n.toLocaleString('es-AR')}`
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`
  if (min != null) return `desde ${fmt(min)}`
  return `hasta ${fmt(max!)}`
}

function formatModality(pro: DirectoryProfessional): string | null {
  if (pro.online_only) return null
  const mods = pro.modality ?? []
  if (mods.length === 0) return null
  const labels = mods.map((m) =>
    m === 'online' ? 'Online' : m === 'presencial' ? 'Presencial' : m
  )
  return labels.join(' · ')
}

// ─── Specialty color palette — 12 colors cycling by label hash ───────────────

const LABEL_COLORS = [
  { bg: 'bg-sp-teal-weak',    text: 'text-sp-teal',    border: 'border-sp-teal/20' },
  { bg: 'bg-sp-indigo-weak',  text: 'text-sp-indigo',  border: 'border-sp-indigo/20' },
  { bg: 'bg-sp-violet-weak',  text: 'text-sp-violet',  border: 'border-sp-violet/20' },
  { bg: 'bg-sp-pink-weak',    text: 'text-sp-pink',    border: 'border-sp-pink/20' },
  { bg: 'bg-sp-emerald-weak', text: 'text-sp-emerald', border: 'border-sp-emerald/20' },
  { bg: 'bg-sp-amber-weak',   text: 'text-sp-amber',   border: 'border-sp-amber/20' },
  { bg: 'bg-sp-fuchsia-weak', text: 'text-sp-fuchsia', border: 'border-sp-fuchsia/20' },
  { bg: 'bg-sp-rose-weak',    text: 'text-sp-rose',    border: 'border-sp-rose/20' },
  { bg: 'bg-sp-sky-weak',     text: 'text-sp-sky',     border: 'border-sp-sky/20' },
  { bg: 'bg-sp-orange-weak',  text: 'text-sp-orange',  border: 'border-sp-orange/20' },
  { bg: 'bg-sp-slate-weak',   text: 'text-sp-slate',   border: 'border-sp-slate/20' },
  { bg: 'bg-sp-cyan-weak',    text: 'text-sp-cyan',    border: 'border-sp-cyan/20' },
]

function colorForLabel(s: string) {
  const hash = s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return LABEL_COLORS[hash % LABEL_COLORS.length]
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ProfessionalCard({ professional: pro }: { professional: DirectoryProfessional }) {
  const [expanded, setExpanded] = useState(false)
  const allSpecialties = pro.specialties ?? []
  const visibleSpecialties = expanded ? allSpecialties : allSpecialties.slice(0, 3)
  const overflow = allSpecialties.length - 3
  const location = formatLocation(pro)
  const price = formatPrice(pro)
  const modality = formatModality(pro)
  const rating = Number(pro.rating_average ?? 0)
  const ratingCount = Number(pro.rating_count ?? 0)
  const isDestacado = isEffectivelyDestacado(pro.subscription_tier, pro.tier_expires_at)
  const score = pro.ranking_score != null && pro.ranking_score > 0 ? Math.round(pro.ranking_score) : null
  const scoreColor = score == null ? '' : score >= 51 ? 'text-success' : score >= 30 ? 'text-warning' : 'text-brand'

  return (
    <article data-testid="professional-card" className="h-full">
      <Link href={`/p/${pro.slug}`} className="block h-full">
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-5 hover:shadow-strong transition-shadow h-full flex flex-col">

          {/* Top: avatar + identity + score — vertically centered */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0">
              {pro.profile_image_url?.startsWith('http') ? (
                <img
                  src={pro.profile_image_url}
                  alt={pro.full_name}
                  className="w-12 h-12 rounded-full object-cover shadow-soft border-2 border-white/60"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-weak to-info-weak flex items-center justify-center shadow-soft border-2 border-white/60">
                  <span className="text-lg font-semibold text-brand">
                    {pro.full_name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3
                  data-testid="professional-name"
                  className={`text-base font-semibold text-foreground truncate${ratingCount > 0 ? ' mb-1' : ' mb-0'}`}
                >
                  {pro.full_name}
                </h3>
                {isDestacado && (
                  <span data-testid="destacado-chip">
                    <Chip variant="brand" label="Destacado" className="text-[10px] px-2 py-0.5" />
                  </span>
                )}
              </div>
              {ratingCount > 0 && (
                <p className="text-xs text-muted mt-0.5">
                  {rating.toFixed(1)} ★ · {ratingCount} {ratingCount === 1 ? 'reseña' : 'reseñas'}
                </p>
              )}
            </div>

            {score != null && (
              <div className="flex-shrink-0 text-right" data-testid="ranking-score">
                <div className="text-[9px] font-medium text-muted/70 leading-none mb-0.5 tracking-wide uppercase">Índice Hara</div>
                <div className={`text-base font-bold leading-none ${scoreColor}`}>{score}</div>
              </div>
            )}
          </div>

          {/* Short description */}
          {pro.short_description && (
            <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-2">
              {pro.short_description}
            </p>
          )}

          {/* Specialty chips — color-coded, with expand button */}
          {allSpecialties.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {visibleSpecialties.map((s) => {
                const c = colorForLabel(s)
                return (
                  <span
                    key={s}
                    className={`px-2 py-1 text-[11px] font-medium rounded-full border ${c.bg} ${c.text} ${c.border}`}
                  >
                    {s}
                  </span>
                )
              })}
              {!expanded && overflow > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(true) }}
                  className="px-2 py-1 text-[11px] font-medium rounded-full border bg-surface-2 text-muted border-outline hover:bg-surface hover:text-foreground transition-colors"
                >
                  +{overflow}
                </button>
              )}
            </div>
          )}

          {/* Meta — pinned to bottom, location left, modality right */}
          <div className="mt-auto pt-2 text-xs text-muted space-y-1">
            {(location || modality) && (
              <div className="flex items-center justify-between gap-2">
                {location && (
                  <span className="flex items-center gap-1 min-w-0">
                    <span aria-hidden>📍</span>
                    <span className="truncate">{location}</span>
                  </span>
                )}
                {modality && (
                  <span className="flex-shrink-0">{modality}</span>
                )}
              </div>
            )}
            {price && (
              <p className="flex items-center gap-1">
                <span aria-hidden>💰</span>
                <span className="truncate">{price}</span>
              </p>
            )}
          </div>

        </div>
      </Link>
    </article>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface Props {
  professionals: DirectoryProfessional[]
  practices: Practice[]
}

export function ProfessionalsDirectory({ professionals, practices }: Props) {
  const [searchValue, setSearchValue] = useState('')

  const practiceIndex = useMemo(() => buildPracticeIndex(practices), [practices])

  const filtered = useMemo(() => {
    const q = searchValue.trim()
    return professionals.filter((pro) => matchesProfessional(pro, q, practiceIndex))
  }, [professionals, searchValue, practiceIndex])

  const isSearching = searchValue.trim().length > 0
  const resultCount = filtered.length

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

      {/* Live region — announces filter changes to screen readers */}
      <div aria-live="polite" aria-atomic="false" className="space-y-4">
        {/* Result count (only when searching) */}
        {isSearching && (
          <p className="text-xs text-muted">
            {resultCount === 1 ? '1 resultado' : `${resultCount} resultados`}
          </p>
        )}

        {/* Grid or empty state */}
        {filtered.length === 0 ? (
          <GlassCard>
            <EmptyState
              title={isSearching ? 'Sin resultados' : 'Todavía no hay profesionales disponibles.'}
              description={isSearching ? 'Probá con otro término.' : 'Volvé pronto.'}
            />
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
            {filtered.map((pro) => (
              <ProfessionalCard key={pro.slug} professional={pro} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
