// Thank-you screen of the review link (design 9d): how the review will look on the profile,
// and "Editar mi reseña" to change it through the same link.

import { Sparkle } from '@/app/HomeCardParts'
import { tagLabels } from '@/lib/review-form'

interface ReviewThanksProps {
  firstName: string | null
  professionalFirstName: string
  rating: number
  text: string
  who: string
  tags: string[]
  onEdit: () => void
}

export function ReviewThanks({ firstName, professionalFirstName, rating, text, who, tags, onEdit }: ReviewThanksProps) {
  const quote = text.trim()
  const byline = [who, ...tagLabels(tags)].join(' · ')

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-10" role="status">
      <Sparkle className="h-[30px] w-[26px] text-brand" />
      <h1 className="font-almanac-serif mb-0 mt-[18px] text-[44px]" style={{ lineHeight: 1, letterSpacing: '-0.5px' }}>
        {firstName ? (
          <>Gracias, <em className="text-brand">{firstName}</em>.</>
        ) : (
          'Gracias.'
        )}
      </h1>
      <span className="mt-2.5 block text-[15px] leading-[1.55] text-gray-700">
        Lo que escribiste puede ser lo que alguien necesita leer para animarse a escribirle a {professionalFirstName}.
      </span>

      <div className="mt-6 rounded-[22px] bg-gray-50 p-[18px]">
        <span className="block text-[15px] tracking-[2px] text-warning-dark" role="img" aria-label={`${rating} de 5 estrellas`}>
          {'★'.repeat(rating)}
        </span>
        {quote && (
          <span className="font-almanac-serif mt-2 block text-[19px] italic leading-[1.4] text-gray-700">“{quote}”</span>
        )}
        <span className="mt-2.5 block text-[12.5px] text-muted">{byline}</span>
      </div>

      <button type="button" onClick={onEdit} className="mt-[22px] self-start text-[13.5px] font-medium text-brand-dark">
        Editar mi reseña
      </button>
    </div>
  )
}
