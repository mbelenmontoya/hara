// Facts row under the hero: rating, price per session, availability.
// Each fact only shows when we have its data; the whole row disappears when none do.

interface ProfileFactsProps {
  ratingAverage: number
  ratingCount: number
  priceMin: number | null
  priceMax: number | null
  currency: string
  acceptingNewClients: boolean
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function Fact({ value, label, testId }: { value: React.ReactNode; label: React.ReactNode; testId?: string }) {
  return (
    <div className="px-1 py-3 text-center" data-testid={testId}>
      <div className="font-almanac-serif text-2xl leading-none text-foreground">{value}</div>
      <div className="font-almanac text-[11.5px] text-muted mt-1">{label}</div>
    </div>
  )
}

export function ProfileFacts({
  ratingAverage,
  ratingCount,
  priceMin,
  priceMax,
  currency,
  acceptingNewClients,
}: ProfileFactsProps) {
  const facts: React.ReactNode[] = []

  if (ratingCount > 0) {
    facts.push(
      <Fact
        key="rating"
        value={
          <>
            <span className="text-warning-dark text-[17px]">★</span> <span>{ratingAverage.toFixed(1)}</span>
          </>
        }
        label={`${ratingCount} ${ratingCount === 1 ? 'reseña' : 'reseñas'}`}
      />
    )
  }

  if (priceMin !== null) {
    const hasRange = priceMax !== null && priceMax > priceMin
    facts.push(
      <Fact
        key="price"
        testId="fact-price"
        value={formatPrice(priceMin, currency)}
        label={hasRange ? `hasta ${formatPrice(priceMax, currency)}` : 'por sesión'}
      />
    )
  }

  if (acceptingNewClients) {
    facts.push(
      <Fact
        key="open"
        value={
          <span className="inline-flex items-center gap-1.5 text-success">
            <span className="w-[7px] h-[7px] rounded-full bg-success" aria-hidden="true" />
            Abierta
          </span>
        }
        label="acepta gente"
      />
    )
  }

  if (facts.length === 0) return null

  return (
    <div
      className="grid border-y border-outline divide-x divide-outline"
      style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}
    >
      {facts}
    </div>
  )
}
