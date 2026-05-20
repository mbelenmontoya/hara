// Card 3b: Reviews — hidden when no reviews yet

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
    <article
      data-testid="reviews-card"
      className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Reseñas</h2>
        <span className="text-sm font-semibold text-foreground">
          {ratingAverage.toFixed(1)} ★ · {ratingCount} {ratingCount === 1 ? 'reseña' : 'reseñas'}
        </span>
      </div>
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-t border-outline/40 pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">
                {review.reviewer_name ?? 'Anónimo'}
              </span>
              <span className="text-xs text-muted">
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </span>
            </div>
            {review.text && (
              <p className="text-sm text-muted italic">"{review.text}"</p>
            )}
            <p className="text-xs text-muted/60 mt-1">
              {new Date(review.submitted_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
    </article>
  )
}
