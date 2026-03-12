// Hará Match - Recommendations (Premium Mobile App)
// Refactored: Uses custom hooks and extracted components

'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ContactButton } from '@/app/components/ContactButton'
import { Chip } from '@/app/components/ui/Chip'
import { useRecommendations } from './hooks/useRecommendations'
import { useSwipeGesture } from './hooks/useSwipeGesture'
import { useRevealTransition } from './hooks/useRevealTransition'
import { useIsDesktop } from './hooks/useMediaQuery'
import { BottomSheet } from './components/BottomSheet'
import { BackgroundPicker } from './components/BackgroundPicker'
import { LoadingSkeleton } from './components/CardSkeleton'
import {
  CARD_SPACING_PERCENT, CARD_HEIGHT_VH, CARD_MIN_HEIGHT_VH, CARD_MIN_HEIGHT_PX,
  ACTIVE_CARD_SCALE, PEEK_CARD_SCALE, FAR_CARD_SCALE,
  ACTIVE_CARD_OPACITY, PEEK_CARD_OPACITY, FAR_CARD_OPACITY,
  DRAG_RESISTANCE_FACTOR, REVEAL_EXIT_DURATION_MS, DECK_ENTER_DURATION_MS,
  CARD_SWIPE_DURATION_MS, TRANSITION_EASING,
  SPECIALTY_MAP, isValidReason,
} from '@/lib/design-constants'

export default function RecommendationsPage() {
  const params = useParams()
  const trackingCode = typeof params?.tracking_code === 'string' ? params.tracking_code : ''

  // Custom hooks
  const { recommendations, loading, error } = useRecommendations(trackingCode)
  const { revealing, isTransitioning, startTransition } = useRevealTransition(trackingCode)
  const isDesktop = useIsDesktop()

  // Local state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [cardsHidden, setCardsHidden] = useState(false) // Separate state for card visibility
  const [backgroundPath, setBackgroundPath] = useState<string | null>('/assets/illustrations/rizki-kurniawan-SSp6eC-LKBU-unsplash.svg')

  // Skip reveal screen on desktop (show deck immediately)
  const shouldShowReveal = !isDesktop && revealing

  // Swipe gesture hook
  const { dragOffset, handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeGesture({
    currentIndex,
    maxIndex: recommendations.length - 1,
    onNavigate: setCurrentIndex,
  })

  const current = recommendations[currentIndex]

  // Loading state - skeleton loader
  if (loading) {
    return <LoadingSkeleton />
  }

  // Error state
  if (error || !recommendations.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-surface backdrop-blur-xl rounded-3xl shadow-elevated p-8 max-w-sm text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            {error === 'expired' ? 'Este link venció' : 'No pudimos cargar'}
          </h2>
          <p className="text-muted leading-relaxed mb-6">
            {error === 'expired' ? 'Pedí uno nuevo por email.' : 'Probá de nuevo.'}
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

  // Main experience with crossfade transition
  return (
    <div
      className="min-h-screen bg-background relative overflow-hidden"
      data-testid="recommendations-page"
    >
      {/* Illustration background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: '#FBF7F2',
          backgroundImage: backgroundPath ? `url(${backgroundPath})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Reveal screen (exit animation on transition) - Mobile only */}
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

      {/* Deck view (enter animation on transition) - Always visible on desktop */}
      {(isDesktop || !revealing || isTransitioning) && (
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
          {/* Progress - 3 equal lines */}
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

          {/* Deck container - responsive for all viewports */}
          <div className="relative z-10 px-4 pb-24">
            {/* Desktop navigation arrows */}
            {isDesktop && recommendations.length > 1 && (
              <>
                {currentIndex > 0 && (
                  <button
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-surface/90 backdrop-blur-sm border border-outline/30 rounded-full shadow-elevated hover:shadow-strong active:scale-95 transition-all flex items-center justify-center"
                    aria-label="Anterior profesional"
                  >
                    <svg
                      className="w-5 h-5 text-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {currentIndex < recommendations.length - 1 && (
                  <button
                    onClick={() =>
                      setCurrentIndex((i) => Math.min(recommendations.length - 1, i + 1))
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-surface/90 backdrop-blur-sm border border-outline/30 rounded-full shadow-elevated hover:shadow-strong active:scale-95 transition-all flex items-center justify-center"
                    aria-label="Siguiente profesional"
                  >
                    <svg
                      className="w-5 h-5 text-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </>
            )}

            <div
              className="relative mx-auto max-w-md transition-opacity duration-200"
              style={{
                height: `min(${CARD_HEIGHT_VH}vh, 600px)`,
                minHeight: `min(${CARD_MIN_HEIGHT_PX}px, ${CARD_MIN_HEIGHT_VH}vh)`,
                opacity: cardsHidden ? 0 : 1,
                pointerEvents: cardsHidden ? 'none' : 'auto',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              role="region"
              aria-label="Recomendaciones de profesionales"
            >
              {recommendations.map((rec, idx) => {
                // Card spacing creates natural peek effect
                const baseOffset = (idx - currentIndex) * CARD_SPACING_PERCENT
                const dragAdjust = dragOffset / DRAG_RESISTANCE_FACTOR
                const offsetX = baseOffset + dragAdjust

                const isCurrent = idx === currentIndex
                const isNext = idx === currentIndex + 1
                const isPrev = idx === currentIndex - 1

                // Peek cards get subtle scale + higher opacity (no blur per spec)
                const scale = isCurrent
                  ? ACTIVE_CARD_SCALE
                  : isPrev || isNext
                  ? PEEK_CARD_SCALE
                  : FAR_CARD_SCALE
                const opacity = isCurrent
                  ? ACTIVE_CARD_OPACITY
                  : isPrev || isNext
                  ? PEEK_CARD_OPACITY
                  : FAR_CARD_OPACITY

                return (
                  <div
                    key={rec.id}
                    data-testid={`recommendation-${rec.rank}`}
                    className="absolute inset-0"
                    style={{
                      transform: `translateX(${offsetX}%) scale(${scale})`,
                      opacity,
                      filter: isCurrent ? 'none' : 'none', // No blur per user request
                      transition: dragOffset
                        ? 'none'
                        : `all ${CARD_SWIPE_DURATION_MS}ms ${TRANSITION_EASING}`,
                      pointerEvents: isCurrent ? 'auto' : 'none',
                      zIndex: isCurrent ? 20 : isPrev || isNext ? 10 : 5,
                    }}
                  >
                    <div
                      className={`liquid-glass rounded-3xl shadow-elevated border overflow-hidden flex flex-col ${
                        isCurrent ? 'border-brand/20' : 'border-outline/30'
                      }`}
                      onClick={() => {
                        if (isCurrent) {
                          setCardsHidden(true)
                          setSheetOpen(true)
                        }
                      }}
                    >
                      {/* Hero - Clickable to profile */}
                      <div className="relative overflow-hidden">
                        <a
                          href={`/p/${rec.professional.slug}?from=/r/${trackingCode}`}
                          onClick={(e) => e.stopPropagation()}
                          className="pt-6 px-6 pb-4 flex items-center gap-4 active:opacity-80 transition-opacity"
                        >
                          <div className="w-16 h-16 bg-gradient-to-br from-brand-weak to-info-weak rounded-3xl shadow-soft flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-semibold text-foreground leading-tight mb-1.5">
                              {rec.professional.name}
                            </h2>
                            <p className="text-sm text-muted">
                              {SPECIALTY_MAP[rec.professional.specialty] ||
                                rec.professional.specialty}
                            </p>
                          </div>
                        </a>
                      </div>

                      {/* Body - NO vertical scroll, content clamped */}
                      <div className="px-6 py-4 space-y-4">
                        {/* Chips (up to 3) */}
                        <div className="flex flex-wrap gap-2">
                          <Chip label="Perfil revisado" variant="success" />
                          <Chip label="Online" variant="brand" />
                          <Chip label="Esta semana" variant="warning" />
                        </div>

                        {/* "Why recommended" - max 2 bullets, clamped to 2-3 lines each */}
                        {rec.reasons.filter(isValidReason).length > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
                              Por qué te la recomendamos
                            </h3>
                            <div className="space-y-2">
                              {rec.reasons
                                .filter(isValidReason)
                                .slice(0, 2)
                                .map((reason, i) => (
                                  <div key={i} className="flex gap-2 items-start">
                                    <div className="w-4 h-4 bg-success-weak rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                                      <svg
                                        className="w-2.5 h-2.5 text-success"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={3}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </div>
                                    <p className="text-sm text-foreground leading-snug line-clamp-2">
                                      {reason}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Primary CTA - full width */}
                        {isCurrent && (
                          <ContactButton
                            professionalSlug={rec.professional.slug}
                            professionalName={rec.professional.name}
                            whatsappNumber={rec.professional.whatsapp}
                            trackingCode={trackingCode}
                            rank={rec.rank}
                            attributionToken={rec.attribution_token}
                            className="w-full"
                          />
                        )}

                        {/* Ver detalles link */}
                        {isCurrent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCardsHidden(true)
                              setSheetOpen(true)
                            }}
                            className="w-full text-sm text-brand font-medium hover:underline mt-3"
                          >
                            Ver detalles
                          </button>
                        )}
                      </div>

                      {/* Footer hint */}
                      <div className="px-6 py-3 border-t border-outline/30 bg-subtle/10 text-center">
                        <p className="text-xs text-muted leading-relaxed">
                          Tu info se comparte recién cuando vos escribís.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet */}
      {sheetOpen && current && (
        <BottomSheet
          recommendation={current}
          trackingCode={trackingCode}
          onClose={() => setSheetOpen(false)}
          onCloseStart={() => setCardsHidden(false)} // Show cards immediately when close starts
        />
      )}

      {/* Dev-only background picker */}
      <BackgroundPicker
        currentBackground={backgroundPath}
        onBackgroundChange={setBackgroundPath}
      />
    </div>
  )
}
