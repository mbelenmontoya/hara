// One professional in the home list (design 11a): Destacado mark, photo, name, practice and place,
// rating, Índice Hara, description, specialties, modality, price and "Ver perfil →".
// The name is a link stretched over the whole card; the chips' "+N" button sits above it.

import Link from 'next/link'
import { SPECIALTY_COLORS } from '@/lib/design-constants'
import type { HomeRow } from '@/lib/home-arrival'
import { ScoreRing, Sparkle, SpecialtyChips } from './HomeCardParts'

export function HomeRowCard({ pro }: { pro: HomeRow }) {
  const meta = [pro.practice, pro.where].filter(Boolean).join(' · ')
  const dot = SPECIALTY_COLORS[pro.specialtyKeys[0]]?.text ?? 'text-brand'

  return (
    <li className="font-almanac relative rounded-[22px] bg-gray-50 p-4 shadow-soft">
      {pro.destacado && (
        <span data-testid="destacado-chip" className="mb-2.5 flex items-center gap-1.5">
          <Sparkle className="h-3 w-2.5 text-brand" />
          <span className="text-[10.5px] font-medium tracking-[0.21em] text-brand-dark">DESTACADO</span>
        </span>
      )}
      <div className="flex items-start gap-[13px]">
        {pro.photoUrl ? (
          <img src={pro.photoUrl} alt="" className="h-[58px] w-[58px] flex-none rounded-full object-cover" />
        ) : (
          <span className="font-almanac-serif flex h-[58px] w-[58px] flex-none items-center justify-center rounded-full bg-brand-weak text-2xl text-brand-dark" aria-hidden="true">
            {pro.name.charAt(0)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Link href={`/p/${pro.slug}`} className="font-almanac-serif block text-[22px] leading-[1.1] after:absolute after:inset-0 after:rounded-[22px] after:content-['']">
            {pro.name}
          </Link>
          {meta && (
            <span className="mt-1 flex items-center gap-[7px] text-[12.5px] text-gray-700">
              <span className={`h-[7px] w-[7px] flex-none rounded-full bg-current ${dot}`} aria-hidden="true" />
              {meta}
            </span>
          )}
          {pro.rating != null && (
            <span className="mt-[3px] flex items-center gap-[5px] text-[12.5px] text-muted">
              <span className="text-warning-dark">★</span>
              <span className="font-medium text-foreground">{pro.rating.toFixed(1)}</span>
              <span>· {pro.ratingCount} {pro.ratingCount === 1 ? 'reseña' : 'reseñas'}</span>
            </span>
          )}
        </div>
        {pro.score != null && <ScoreRing score={pro.score} size="md" />}
      </div>

      {pro.quote && <span className="mt-3 block text-sm leading-[1.5] text-gray-700">{pro.quote}</span>}
      <SpecialtyChips chips={pro.chips} />

      <div className="mt-3.5 flex items-center gap-2.5 border-t border-foreground/10 pt-3">
        {pro.modality && <span className="rounded-lg bg-surface-2 px-[9px] py-1 text-[11.5px] font-medium text-gray-700">{pro.modality}</span>}
        {pro.price && <span className="text-[13.5px] font-medium">{pro.price}</span>}
        <span className="ml-auto text-[13px] font-medium text-brand-dark" aria-hidden="true">Ver perfil →</span>
      </div>
    </li>
  )
}
