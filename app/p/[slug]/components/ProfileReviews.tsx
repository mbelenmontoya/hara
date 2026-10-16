// Reviews: "Quienes ya fueron" as quote cards — hidden when no reviews yet

interface Review {
  id: string
  rating: number
  text: string | null
  reviewer_name: string | null
  submitted_at: string
}

interface ProfileReviewsProps {
  ratingAverage: number
  ratingCount: number
  reviews: Review[]
}

export function ProfileReviews({ ratingAverage, ratingCount, reviews }: ProfileReviewsProps) {
  if (ratingCount === 0) return null

  return (
    <section data-testid="reviews-card">
      <div className="flex items-baseline justify-between">
        <h2 className="font-almanac-serif text-[30px] leading-[1.05] text-foreground">
          Quienes <em>ya fueron</em>
        </h2>
        <span className="font-almanac text-[13px] font-medium text-brand-dark">
          {ratingAverage.toFixed(1)} ★ · {ratingCount} {ratingCount === 1 ? 'reseña' : 'reseñas'}
        </span>
      </div>
      <div className="mt-3.5 space-y-2.5">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-3xl bg-gray-50 p-[18px]">
            {review.text && (
              <p className="font-almanac-serif italic text-[19px] leading-[1.4] text-gray-800">“{review.text}”</p>
            )}
            <p className="font-almanac text-[12.5px] text-muted mt-2.5">
              {review.reviewer_name ?? 'Anónimo'} ·{' '}
              {new Date(review.submitted_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
              <span className="text-warning-dark">
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </span>
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
