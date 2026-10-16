// One recommended professional in the concierge Carta (design 9c): photo with its number,
// practice and place, name, rating and price, "Por qué pensé en…", WhatsApp (when there is a number)
// and profile buttons.

import Link from 'next/link'
import { ContactButton } from '@/app/components/ContactButton'
import { SPECIALTY_COLORS } from '@/lib/design-constants'
import type { CartaPick as Pick } from '@/lib/carta'

interface CartaPickProps {
  pick: Pick
  trackingCode: string
}

export function CartaPick({ pick, trackingCode }: CartaPickProps) {
  const meta = [pick.practice, pick.where].filter(Boolean)
  const dot = (pick.specialtyKey && SPECIALTY_COLORS[pick.specialtyKey]?.text) || 'text-brand'

  return (
    <li className="overflow-hidden rounded-[26px] bg-gray-50 shadow-soft" data-testid={`carta-pick-${pick.rank}`}>
      <div className="relative h-[190px]">
        {pick.photoUrl ? (
          <img src={pick.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-almanac-serif flex h-full w-full items-center justify-center bg-brand-weak text-6xl text-brand-dark" aria-hidden="true">
            {pick.name.charAt(0)}
          </span>
        )}
        <span
          className="font-almanac-serif pointer-events-none absolute left-3.5 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50/95 text-2xl italic text-brand"
        >
          <span className="sr-only">Opción </span>
          {pick.rank}
        </span>
      </div>

      <div className="px-[18px] pb-[18px] pt-4">
        {meta.length > 0 && (
          <span className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <span className={`h-2 w-2 flex-none rounded-full bg-current ${dot}`} aria-hidden="true" />
            {meta.map((part, i) => (
              <span key={part} className="flex items-center gap-2">
                {i > 0 && <span className="text-foreground/30" aria-hidden="true">·</span>}
                {part}
              </span>
            ))}
          </span>
        )}

        <div className="mt-1.5 flex items-baseline justify-between gap-2.5">
          <h2 className="font-almanac-serif mb-0 text-[27px]" style={{ lineHeight: 1.05, letterSpacing: 0 }}>
            {pick.name}
          </h2>
          <RatingAndPrice rating={pick.rating} price={pick.price} />
        </div>

        {pick.reasons.length > 0 && (
          <>
            <div className="mt-3.5 border-t border-foreground/10 pt-3">
              <span className="almanac-label text-brand">Por qué pensé en {pick.firstName}</span>
            </div>
            <div className="font-almanac-serif mt-1.5 text-lg italic leading-[1.4] text-gray-700">
              {pick.reasons.map((reason) => (
                <span key={reason} className="block">{reason}</span>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex gap-2">
          {pick.whatsapp && (
            <ContactButton
              professionalSlug={pick.slug}
              professionalName={pick.name}
              whatsappNumber={pick.whatsapp}
              trackingCode={trackingCode}
              rank={pick.rank}
              attributionToken={pick.attributionToken}
              label="Escribirle por WhatsApp"
              unstyled
              className="btn-press-glow flex-1 rounded-[15px] bg-brand-dark p-[13px] text-center text-[14.5px] font-medium text-gray-50"
            />
          )}
          <Link
            href={`/p/${pick.slug}?from=/r/${trackingCode}`}
            className={`rounded-[15px] border-[1.5px] border-foreground/15 px-4 py-3 text-center text-[14.5px] font-medium text-foreground ${pick.whatsapp ? '' : 'flex-1'}`}
          >
            Perfil
          </Link>
        </div>
      </div>
    </li>
  )
}

function RatingAndPrice({ rating, price }: { rating: number | null; price: string | null }) {
  if (rating == null && !price) return null
  return (
    <span className="flex-none text-[13.5px] font-medium">
      {rating != null && (
        <>
          <span className="text-warning-dark" aria-hidden="true">★</span> {rating.toFixed(1)}
        </>
      )}
      {rating != null && price && ' · '}
      {price}
    </span>
  )
}
