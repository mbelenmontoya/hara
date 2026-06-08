'use client'

// Hara Vital - Recommendations
// Mobile: swipe-deck via DeckView. Desktop (≥1024px): 3-card grid via GridView (Task 9).

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useRecommendations } from './hooks/useRecommendations'
import { useSwipeGesture } from './hooks/useSwipeGesture'
import { useRevealTransition } from './hooks/useRevealTransition'
import { useIsDesktop } from './hooks/useMediaQuery'
import { DeckView } from './components/DeckView'
import { GridView } from './components/GridView'
import { BottomSheet } from './components/BottomSheet'
import { LoadingSkeleton } from './components/CardSkeleton'
import { PageBackground } from '@/app/components/ui/PageBackground'
import {
  REVEAL_EXIT_DURATION_MS, DECK_ENTER_DURATION_MS, TRANSITION_EASING,
} from '@/lib/design-constants'

export default function RecommendationsPage() {
  const params = useParams()
  const trackingCode = typeof params?.tracking_code === 'string' ? params.tracking_code : ''

  const { recommendations, loading, error } = useRecommendations(trackingCode)
  const { revealing, isTransitioning, startTransition } = useRevealTransition(trackingCode)
  const isDesktop = useIsDesktop()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cardsHidden, setCardsHidden] = useState(false)

  const shouldShowReveal = !isDesktop && revealing

  const { dragOffset, handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeGesture({
    currentIndex,
    maxIndex: recommendations.length - 1,
    onNavigate: setCurrentIndex,
  })

  const current = recommendations[selectedIndex] ?? recommendations[currentIndex]

  const handleOpenDetails = (index: number) => {
    setSelectedIndex(index)
    setCardsHidden(true)
    setSheetOpen(true)
  }

  if (loading) return <LoadingSkeleton />

  if (error || !recommendations.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-surface backdrop-blur-xl rounded-3xl shadow-elevated p-8 max-w-sm text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            {error === 'expired' ? 'Este link venció' : 'No pudimos cargar'}
          </h2>
          <p className="text-muted leading-relaxed mb-6">
            {error === 'expired' ? (
              <>¿Perdiste tu link? <Link href="/que-es-hara" className="text-brand hover:underline">¿Cómo funciona Hara?</Link></>
            ) : (
              <>Probá de nuevo. <Link href="/que-es-hara" className="text-brand hover:underline">¿Necesitás ayuda?</Link></>
            )}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-brand text-white px-6 py-4 rounded-full shadow-elevated active:scale-[0.98] transition-all font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-background relative overflow-hidden"
      data-testid="recommendations-page"
    >
      <PageBackground />

      {/* Reveal screen — mobile only */}
      {(shouldShowReveal || isTransitioning) && (
        <div
          className="absolute inset-0 flex items-start justify-center pt-8 pb-8 px-4 z-20"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(-8px) scale(0.995)' : 'translateY(0) scale(1)',
            transition: `all ${REVEAL_EXIT_DURATION_MS}ms ${TRANSITION_EASING}`,
            pointerEvents: isTransitioning ? 'none' : 'auto',
          }}
        >
          <div className="liquid-glass rounded-3xl max-w-md w-full text-center relative z-10 animate-in zoom-in-95 fade-in duration-500">
            <div className="liquid-glass-content p-8">
              <h1 className="text-3xl font-semibold text-foreground mb-3">
                Tus 3 opciones están listas
              </h1>
              <p className="text-base text-muted leading-relaxed mb-6">
                Elegimos profesionales que encajan con lo que nos contaste.
              </p>
              <button
                onClick={startTransition}
                disabled={isTransitioning}
                className="w-full bg-brand text-white px-6 py-4 rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all font-semibold mb-4 disabled:opacity-50"
              >
                Ver mis 3 opciones
              </button>
              <p className="text-xs text-muted leading-relaxed">
                Tu info se comparte recién cuando vos escribís.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: 3-card grid (no animation wrapper needed) */}
      {isDesktop && (
        <div className="relative z-10 overflow-y-auto min-h-screen">
          <GridView
            recommendations={recommendations}
            trackingCode={trackingCode}
            onOpenDetails={handleOpenDetails}
          />
        </div>
      )}

      {/* Mobile: swipe-deck with reveal transition */}
      {!isDesktop && (isDesktop || !revealing || isTransitioning) && (
        <div
          className="absolute inset-0 z-10"
          style={{
            opacity: !revealing || isTransitioning ? 1 : 0,
            transform: !revealing
              ? 'translateY(0) scale(1)'
              : isTransitioning
              ? 'translateY(8px) scale(1.005)'
              : 'translateY(12px) scale(1.008)',
            transition: `all ${DECK_ENTER_DURATION_MS}ms ${TRANSITION_EASING}`,
            pointerEvents: revealing && !isTransitioning ? 'none' : 'auto',
          }}
        >
          {/* Progress dots */}
          <div className="relative z-10 pt-safe pt-4 px-4 pb-4">
            <div className="flex justify-center gap-2">
              {recommendations.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-10 rounded-full transition-all ${
                    i === currentIndex ? 'bg-brand' : 'bg-muted/50'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <DeckView
              recommendations={recommendations}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
              dragOffset={dragOffset}
              cardsHidden={cardsHidden}
              trackingCode={trackingCode}
              onOpenDetails={() => handleOpenDetails(currentIndex)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>
        </div>
      )}

      {/* Bottom Sheet / Modal */}
      {sheetOpen && current && (
        <BottomSheet
          recommendation={current}
          trackingCode={trackingCode}
          onClose={() => setSheetOpen(false)}
          onCloseStart={() => setCardsHidden(false)}
        />
      )}

    </div>
  )
}
