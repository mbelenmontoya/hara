// Hará Match - Recommendations (Premium Mobile App)
// Moonly-inspired: soft aurora, glass, smooth motion, Spanish copy

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ContactButton } from '@/app/components/ContactButton'

// ============================================================================
// INTERACTION CONSTANTS
// Fine-tuned values for card swipe feel and transitions
// ============================================================================

// Swipe Gesture
const SWIPE_THRESHOLD_PX = 70 // Minimum horizontal distance to trigger card navigation
const DRAG_RESISTANCE_FACTOR = 3.5 // Reduces drag sensitivity for smoother feel (higher = less sensitive)

// Card Layout
const CARD_SPACING_PERCENT = 88 // Spacing between cards (88% = 12% visible peek of next card)
const CARD_HEIGHT_VH = 70 // Maximum card height as viewport percentage
const CARD_MIN_HEIGHT_VH = 60 // Minimum card height for small screens
const CARD_MIN_HEIGHT_PX = 400 // Absolute minimum card height in pixels

// Card Scaling
const ACTIVE_CARD_SCALE = 1 // Current card scale (no scaling)
const PEEK_CARD_SCALE = 0.985 // Adjacent card scale (slightly smaller)
const FAR_CARD_SCALE = 0.90 // Non-adjacent card scale (more noticeable)

// Card Opacity
const ACTIVE_CARD_OPACITY = 1 // Current card fully visible
const PEEK_CARD_OPACITY = 0.65 // Adjacent cards semi-transparent
const FAR_CARD_OPACITY = 0.25 // Far cards very faint

// Transitions
const REVEAL_TO_DECK_TRANSITION_MS = 420 // Total animation time for reveal→deck crossfade
const REVEAL_EXIT_DURATION_MS = 320 // How long reveal fades out
const DECK_ENTER_DURATION_MS = 380 // How long deck fades in
const CARD_SWIPE_DURATION_MS = 500 // Animation duration for card position changes

// Animation Easing
const TRANSITION_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)' // Custom easing for smooth feel

// ============================================================================

interface Recommendation {
  id: string
  rank: number
  reasons: string[]
  attribution_token: string
  professional: {
    slug: string
    name: string
    specialty: string
    whatsapp: string
    bio?: string
    profile_image_url?: string
  }
}

const RANK_LABELS: Record<number, string> = {
  1: 'Mejor ajuste para vos',
  2: 'Muy compatible',
  3: 'Alternativa sólida',
}

const SPECIALTY_MAP: Record<string, string> = {
  anxiety: 'Ansiedad',
  depression: 'Depresión',
  stress: 'Estrés',
  trauma: 'Trauma',
  relationships: 'Relaciones',
}

// Simple validation: reason must exist and have meaningful length
function isValidReason(reason: string | null | undefined): boolean {
  return !!reason && reason.trim().length >= 10
}

export default function RecommendationsPage() {
  const params = useParams()
  const trackingCode = (params?.tracking_code as string) || ''

  const [loading, setLoading] = useState(true)
  const [revealing, setRevealing] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touchStartX, setTouchStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)

  useEffect(() => {
    if (trackingCode) fetchRecommendations()
  }, [trackingCode])

  async function fetchRecommendations() {
    try {
      const res = await fetch(`/api/public/recommendations?tracking_code=${trackingCode}`)
      if (res.status === 404) {
        setError('expired')
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError('fetch')
        setLoading(false)
        return
      }
      const data = await res.json()
      setRecommendations(data.recommendations || [])
      setLoading(false)
    } catch (err) {
      setError('network')
      setLoading(false)
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX)
    setDragOffset(0)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartX) return
    setDragOffset(e.touches[0].clientX - touchStartX)
  }

  function handleTouchEnd() {
    if (Math.abs(dragOffset) > SWIPE_THRESHOLD_PX) {
      if (dragOffset < 0 && currentIndex < recommendations.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else if (dragOffset > 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }
    }
    setDragOffset(0)
    setTouchStartX(0)
  }

  function handleStartViewingDeck() {
    setIsTransitioning(true)
    // After animation completes, finalize transition
    setTimeout(() => {
      setRevealing(false)
      setIsTransitioning(false)
    }, REVEAL_TO_DECK_TRANSITION_MS)
  }

  const current = recommendations[currentIndex]

  // Extract firstName - simple fallback if name is missing
  const firstName = current?.professional.name?.split(' ')[0] || ''

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 border-3 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Cargando...</p>
        </div>
      </div>
    )
  }

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
      {/* Optimized image background with Next.js Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/assets/harli-marten-n7a2OJDSZns-unsplash.jpg"
          alt="Background"
          fill
          priority
          quality={85}
          sizes="100vw"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </div>

      {/* Reveal screen (exit animation on transition) */}
      {(revealing || isTransitioning) && (
        <div
          className="absolute inset-0 flex items-center justify-center p-4 z-20"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(-8px) scale(0.995)' : 'translateY(0) scale(1)',
            transition: `all ${REVEAL_EXIT_DURATION_MS}ms ${TRANSITION_EASING}`,
            pointerEvents: isTransitioning ? 'none' : 'auto',
          }}
        >
          <div className="liquid-glass rounded-3xl max-w-md w-full text-center relative z-10 animate-in zoom-in-95 fade-in duration-500">
            <div className="liquid-glass-content p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-brand-weak to-info-weak rounded-full flex items-center justify-center mx-auto mb-5 shadow-soft animate-in zoom-in-90 delay-200 duration-300">
              <svg className="w-10 h-10 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-3">
              Tus 3 opciones están listas
            </h1>
            <p className="text-base text-muted leading-relaxed mb-6">
              Elegimos profesionales que encajan con lo que nos contaste.
            </p>

            {recommendations.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-7">
                {recommendations[0].professional.specialty && (
                  <span className="px-4 py-2 bg-brand-weak text-brand text-sm font-medium rounded-full border border-brand/20">
                    {SPECIALTY_MAP[recommendations[0].professional.specialty] || recommendations[0].professional.specialty}
                  </span>
                )}
                <span className="px-4 py-2 bg-brand-weak text-brand text-sm font-medium rounded-full border border-brand/20">
                  Online
                </span>
                <span className="px-4 py-2 bg-brand-weak text-brand text-sm font-medium rounded-full border border-brand/20">
                  Argentina
                </span>
              </div>
            )}

            <button
              onClick={handleStartViewingDeck}
              disabled={isTransitioning}
              className="w-full bg-brand text-white px-6 py-4 rounded-full shadow-elevated hover:shadow-strong active:scale-[0.98] transition-all font-semibold mb-4 disabled:opacity-50"
            >
              Ver mis 3 opciones
            </button>

            <p className="text-xs text-muted leading-relaxed">
              Deslizá para comparar. Tu info se comparte recién cuando vos escribís.
            </p>
            </div>
          </div>
        </div>
      )}

      {/* Deck view (enter animation on transition) */}
      {(!revealing || isTransitioning) && (
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

      {/* Progress */}
      <div className="relative z-10 pt-safe pt-4 px-4 pb-4">
        <div className="text-center">
          <p className="text-sm text-muted mb-2">{currentIndex + 1} de {recommendations.length}</p>
          <div className="flex justify-center gap-2">
            {recommendations.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === currentIndex ? 'w-10 bg-brand' : 'w-2 bg-outline/40'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Deck container - responsive for all viewports */}
      <div className="relative z-10 px-4 pb-24">
        <div
          className="relative mx-auto max-w-md"
          style={{
            height: `min(${CARD_HEIGHT_VH}vh, 600px)`,
            minHeight: `min(${CARD_MIN_HEIGHT_PX}px, ${CARD_MIN_HEIGHT_VH}vh)`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
                  transition: dragOffset ? 'none' : `all ${CARD_SWIPE_DURATION_MS}ms ${TRANSITION_EASING}`,
                  pointerEvents: isCurrent ? 'auto' : 'none',
                  zIndex: isCurrent ? 20 : isPrev || isNext ? 10 : 5,
                }}
              >
                <div
                  className={`bg-surface/90 backdrop-blur-2xl rounded-3xl shadow-elevated border overflow-hidden flex flex-col ${
                    isCurrent ? 'border-brand/20' : 'border-outline/30'
                  }`}
                  onClick={() => isCurrent && setSheetOpen(true)}
                >
                  {/* Hero with CSS glow - Clickable to profile */}
                  <div className="relative overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(circle 200px at 50% -30px, rgba(75, 43, 191, 0.12), transparent 70%), radial-gradient(circle 150px at 80% 30px, rgba(123, 97, 217, 0.06), transparent), rgba(243, 236, 246, 0.25)`,
                      }}
                    />
                    <a
                      href={`/p/${rec.professional.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="relative z-10 pt-6 px-6 pb-4 flex items-center gap-4 active:opacity-80 transition-opacity"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-brand-weak to-info-weak rounded-3xl shadow-soft flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-foreground leading-tight mb-1.5">
                          {rec.professional.name}
                        </h2>
                        <p className="text-sm text-muted">
                          {SPECIALTY_MAP[rec.professional.specialty] || rec.professional.specialty}
                        </p>
                      </div>
                    </a>
                  </div>

                  {/* Body - NO vertical scroll, content clamped */}
                  <div className="px-6 py-4 space-y-4">
                    {/* Chips (up to 3) */}
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1.5 bg-success-weak text-success text-xs font-medium rounded-full border border-success/20">
                        Perfil revisado
                      </span>
                      <span className="px-3 py-1.5 bg-brand-weak text-brand text-xs font-medium rounded-full border border-brand/20">
                        Online
                      </span>
                      <span className="px-3 py-1.5 bg-warning-weak text-warning text-xs font-medium rounded-full border border-warning/20">
                        Esta semana
                      </span>
                    </div>

                    {/* "Why recommended" - max 2 bullets, clamped to 2-3 lines each */}
                    {rec.reasons.filter(isValidReason).length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
                          Por qué te la recomendamos
                        </h3>
                        <div className="space-y-2">
                          {rec.reasons.filter(isValidReason).slice(0, 2).map((reason, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <div className="w-4 h-4 bg-success-weak rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                                <svg className="w-2.5 h-2.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <p className="text-sm text-foreground leading-snug line-clamp-2">{reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Primary CTA inside card */}
                    {isCurrent && (
                      <ContactButton
                        professionalSlug={rec.professional.slug}
                        professionalName={rec.professional.name}
                        whatsappNumber={rec.professional.whatsapp}
                        trackingCode={trackingCode}
                        rank={rec.rank}
                        attributionToken={rec.attribution_token}
                      />
                    )}

                    {/* Secondary links */}
                    {isCurrent && (
                      <div className="flex items-center justify-center gap-4 text-xs">
                        <a
                          href={`/p/${rec.professional.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-brand font-medium hover:underline"
                        >
                          Ver perfil
                        </a>
                        <span className="text-outline">|</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSheetOpen(true)
                          }}
                          className="text-brand font-medium hover:underline"
                        >
                          Ver detalles
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Footer hint */}
                  <div className="px-6 py-3 border-t border-outline/30 bg-subtle/10 text-center">
                    <p className="text-xs text-muted leading-relaxed">
                      {isCurrent && idx < recommendations.length - 1 ? 'Deslizá para comparar' : 'Tocá el nombre para ver perfil'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Sheet */}
      {sheetOpen && current && (
        <div
          className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-200"
          onClick={() => setSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-foreground/60 backdrop-blur-md" />

          <div
            className="relative bg-surface/98 backdrop-blur-3xl border-t border-brand/15 rounded-t-[32px] shadow-strong w-full max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-400"
            style={{ transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center py-4">
              <div className="w-14 h-1.5 bg-outline/50 rounded-full" />
            </div>

            <div className="px-6 pb-10 space-y-8">
              {/* Header - More prominent */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-brand-weak to-info-weak rounded-3xl shadow-soft flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground leading-tight mb-1.5">
                    {current.professional.name}
                  </h2>
                  <p className="text-base text-muted">
                    {SPECIALTY_MAP[current.professional.specialty] || current.professional.specialty}
                  </p>
                </div>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-success-weak text-success text-xs font-medium rounded-full border border-success/20">
                  Perfil revisado
                </span>
                <span className="px-3 py-1.5 bg-warning-weak text-warning text-xs font-medium rounded-full border border-warning/20">
                  Turnos esta semana
                </span>
                <span className="px-3 py-1.5 bg-surface-2 text-foreground text-xs font-medium rounded-full border border-outline">
                  Online
                </span>
              </div>

              {/* Reasons - Clear section (only if valid reasons exist) */}
              {current.reasons.filter(isValidReason).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Por qué te la recomendamos:
                  </h3>
                  <div className="space-y-3">
                    {current.reasons.filter(isValidReason).map((reason, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-5 h-5 bg-success-weak rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                          <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio - only if exists */}
              {current.professional.bio && (
                <div className="p-4 bg-subtle/30 rounded-2xl border border-outline/40">
                  <p className="text-sm text-foreground leading-relaxed">{current.professional.bio}</p>
                </div>
              )}

              {/* Suggested message - More breathing room, less dense */}
              <div className="p-5 bg-info-weak/20 rounded-2xl border border-info/10">
                <p className="text-xs font-medium text-muted mb-3">Si querés, podés empezar con:</p>
                <p className="text-sm text-foreground leading-[1.7]">
                  "Hola{firstName ? ` ${firstName}` : ''}, me recomendaron por Hará. {
                    current.professional.specialty
                      ? `Estoy buscando ayuda con ${SPECIALTY_MAP[current.professional.specialty] || current.professional.specialty.toLowerCase()}. ¿Tenés un espacio esta semana?`
                      : 'Estoy buscando empezar terapia. ¿Tenés disponibilidad esta semana?'
                  }"
                </p>
              </div>

              {/* Primary CTA */}
              <ContactButton
                professionalSlug={current.professional.slug}
                professionalName={current.professional.name}
                whatsappNumber={current.professional.whatsapp}
                trackingCode={trackingCode}
                rank={current.rank}
                attributionToken={current.attribution_token}
              />

              {/* Secondary actions */}
              <div className="space-y-3">
                <a
                  href={`/p/${current.professional.slug}`}
                  className="block w-full px-6 py-3.5 text-center bg-surface-2 text-foreground font-medium rounded-full border border-outline hover:bg-subtle active:scale-[0.98] transition-all"
                >
                  Ver perfil completo
                </a>

                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-full px-6 py-3 text-muted hover:text-foreground transition-colors text-sm"
                >
                  Ver otras opciones
                </button>
              </div>

              {/* Privacy notice - Clear separation */}
              <div className="pt-6 border-t border-outline/30 text-center">
                <p className="text-xs text-muted leading-relaxed">
                  Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

        </div>
      )}
    </div>
  )
}
