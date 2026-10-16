// Featured professional card on the home page (design 11a): photo, Destacado mark, practice and place,
// name, rating, Índice Hara, quote, specialties, modality and price, and the two buttons.
// Both buttons go to the profile, where the tracked WhatsApp button lives, so no phone number
// is sent to the browser from the home page.

import Link from 'next/link'
import { SPECIALTY_COLORS } from '@/lib/design-constants'
import type { HomeRow } from '@/lib/home-arrival'
import { ScoreRing, Sparkle, SpecialtyChips } from './HomeCardParts'

export function HomeFeatured({ pro }: { pro: HomeRow }) {
  const meta = [pro.practice, pro.where].filter(Boolean).join(' · ')
  const dot = SPECIALTY_COLORS[pro.specialtyKeys[0]]?.text ?? 'text-brand'

  return (
    <article data-testid="home-featured" className="mt-4 overflow-hidden rounded-[26px] bg-gray-50 shadow-elevated">
      <div className="relative h-[210px] bg-brand-weak">
        {pro.photoUrl ? (
          <img src={pro.photoUrl} alt={pro.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-almanac-serif text-7xl text-brand-dark" aria-hidden="true">{pro.name.charAt(0)}</span>
          </div>
        )}
        {pro.destacado && (
          <div
            data-testid="destacado-chip"
            className="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-full bg-gray-50/95 py-1.5 pl-[9px] pr-3"
          >
            <Sparkle className="h-[13px] w-[11px] text-brand" />
            <span className="font-almanac text-[10.5px] font-medium tracking-[1.6px] text-brand-dark">DESTACADO</span>
          </div>
        )}
      </div>

      <div className="px-[18px] pb-[18px] pt-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {meta && (
              <span className="font-almanac flex items-center gap-2 text-xs font-medium text-gray-700">
                <span className={`h-2 w-2 flex-none rounded-full bg-current ${dot}`} aria-hidden="true" />
                {meta}
              </span>
            )}
            <h3 className="font-almanac-serif mb-0 mt-1.5 text-[28px] leading-[1.05]">{pro.name}</h3>
            {pro.rating != null && (
              <span className="font-almanac mt-1 flex items-center gap-[5px] text-[12.5px] text-muted">
                <span className="text-warning-dark">★</span>
                <span className="font-medium text-foreground">{pro.rating.toFixed(1)}</span>
                <span>· {pro.ratingCount} {pro.ratingCount === 1 ? 'reseña' : 'reseñas'}</span>
              </span>
            )}
          </div>
          {pro.score != null && <ScoreRing score={pro.score} size="lg" />}
        </div>

        {pro.quote && <span className="font-almanac-serif mt-3 block text-[18px] italic leading-[1.35] text-gray-700">“{pro.quote}”</span>}
        <SpecialtyChips chips={pro.chips} />

        {(pro.modality || pro.price) && (
          <div className="font-almanac mt-3.5 flex items-center gap-2.5">
            {pro.modality && <span className="rounded-lg bg-surface-2 px-[9px] py-1 text-[11.5px] font-medium text-gray-700">{pro.modality}</span>}
            {pro.price && <span className="text-[13.5px] font-medium">{pro.price}</span>}
          </div>
        )}

        <div className="font-almanac mt-3.5 flex items-center gap-2">
          <Link
            href={`/p/${pro.slug}`}
            className="flex-1 rounded-[15px] bg-brand-dark py-[13px] text-center text-[14.5px] font-medium text-gray-50 transition-opacity hover:opacity-90"
          >
            Escribirle
          </Link>
          <Link
            href={`/p/${pro.slug}`}
            className="rounded-[15px] border-[1.5px] border-foreground/15 px-[18px] py-3 text-center text-[14.5px] font-medium"
          >
            Perfil
          </Link>
        </div>
      </div>
    </article>
  )
}
