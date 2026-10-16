'use client'

// Concierge Carta (design 9c): the link the team sends by WhatsApp. A greeting with the person's
// first name and the date, then the three recommended professionals in rank order.

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatAlmanacDate } from '@/lib/moon-phase'
import { useRecommendations, type CartaError } from './hooks/useRecommendations'
import { CartaPick } from './components/CartaPick'
import { LoadingSkeleton } from './components/CardSkeleton'

export default function RecommendationsPage() {
  const params = useParams()
  const trackingCode = typeof params?.tracking_code === 'string' ? params.tracking_code : ''
  const { carta, recommendations, loading, error } = useRecommendations(trackingCode)

  if (loading) return <LoadingSkeleton />
  if (error || !carta || recommendations.length === 0) return <CartaUnavailable error={error ?? 'not-found'} />

  const name = carta.first_name

  return (
    <main className="font-almanac min-h-screen bg-background text-foreground" data-testid="recommendations-page">
      <div className="mx-auto w-full max-w-md pb-16 pt-6 md:max-w-xl">
        <header className="px-[22px]">
          <div className="flex justify-center">
            <Image src="/assets/logo/logoreduccion.png" alt="Hara" width={66} height={53} className="h-10 w-auto object-contain" />
          </div>
          <div className="mt-[18px] flex items-center gap-2.5 border-y border-foreground/12 py-2.5">
            {name && <span className="almanac-label text-muted">Para {name}</span>}
            <span className="flex-1" />
            <img src="/assets/almanac/tres_puntos-primary.svg" alt="" aria-hidden="true" className="h-[17px] w-[18px] object-contain" />
            <span className="flex-1" />
            <span className="almanac-label text-muted">{formatAlmanacDate(new Date(carta.sent_at))}</span>
          </div>
          <h1 className="font-almanac-serif mb-0 mt-6 text-[44px]" style={{ lineHeight: 1, letterSpacing: '-0.6px' }}>
            {name ? `${name}, estas son ` : 'Estas son '}
            <em className="text-brand">tus tres</em>.
          </h1>
        </header>

        <ol className="mb-0 mt-[26px] flex list-none flex-col gap-4 px-4">
          {recommendations.map((pick) => (
            <CartaPick key={pick.id} pick={pick} trackingCode={trackingCode} />
          ))}
        </ol>

        <footer className="px-6 pb-4 pt-[30px] text-center">
          <h2 className="font-almanac-serif mb-0 text-2xl" style={{ lineHeight: 1.1, letterSpacing: 0 }}>
            ¿Ninguna te <em>convence</em>?
          </h2>
          <span className="mt-1.5 block text-sm leading-[1.5] text-gray-700">
            Respondé el mensaje donde te llegó este link y te proponemos otras tres, sin costo.
          </span>
        </footer>
      </div>
    </main>
  )
}

const UNAVAILABLE_COPY: Record<CartaError, { title: string; body: string }> = {
  'not-found': {
    title: 'No encontramos esta carta',
    body: 'Revisá que el link esté completo. Si no, contanos de nuevo qué estás buscando.',
  },
  fetch: { title: 'No pudimos cargar tu carta', body: 'Probá de nuevo en un momento.' },
  network: { title: 'No pudimos cargar tu carta', body: 'Revisá tu conexión y probá de nuevo.' },
}

function CartaUnavailable({ error }: { error: CartaError }) {
  const copy = UNAVAILABLE_COPY[error]
  return (
    <main className="font-almanac flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-[26px] bg-gray-50 p-8 text-center shadow-soft">
        <h1 className="font-almanac-serif mb-0 text-[30px]" style={{ lineHeight: 1.05, letterSpacing: 0 }}>
          {copy.title}
        </h1>
        <span className="mt-3 block text-sm leading-[1.5] text-gray-700">{copy.body}</span>
        {error === 'not-found' ? (
          <Link href="/solicitar" className="btn-press-glow mt-6 block rounded-[15px] bg-brand-dark p-[13px] text-[14.5px] font-medium text-gray-50">
            Pedir una recomendación
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-press-glow mt-6 w-full rounded-[15px] bg-brand-dark p-[13px] text-[14.5px] font-medium text-gray-50"
          >
            Reintentar
          </button>
        )}
      </div>
    </main>
  )
}
