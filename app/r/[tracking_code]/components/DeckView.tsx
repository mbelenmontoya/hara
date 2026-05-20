'use client'

// Mobile swipe-deck view — absolute-positioned cards with translateX peek effect.
// Receives all state and gesture handlers from the parent page.

import type { Recommendation } from '../hooks/useRecommendations'
import { RecommendationCard } from './RecommendationCard'
import {
  CARD_SPACING_PERCENT, CARD_HEIGHT_VH, CARD_MIN_HEIGHT_VH, CARD_MIN_HEIGHT_PX,
  ACTIVE_CARD_SCALE, PEEK_CARD_SCALE, FAR_CARD_SCALE,
  ACTIVE_CARD_OPACITY, PEEK_CARD_OPACITY, FAR_CARD_OPACITY,
  DRAG_RESISTANCE_FACTOR, CARD_SWIPE_DURATION_MS, TRANSITION_EASING,
} from '@/lib/design-constants'

interface DeckViewProps {
  recommendations: Recommendation[]
  currentIndex: number
  setCurrentIndex: (updater: (i: number) => number) => void
  dragOffset: number
  cardsHidden: boolean
  trackingCode: string
  onOpenDetails: () => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

export function DeckView({
  recommendations,
  currentIndex,
  setCurrentIndex,
  dragOffset,
  cardsHidden,
  trackingCode,
  onOpenDetails,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: DeckViewProps) {
  return (
    <div className="px-4 pb-24">
      <div
        className="relative mx-auto max-w-md transition-opacity duration-200"
        style={{
          height: `min(${CARD_HEIGHT_VH}vh, 600px)`,
          minHeight: `min(${CARD_MIN_HEIGHT_PX}px, ${CARD_MIN_HEIGHT_VH}vh)`,
          opacity: cardsHidden ? 0 : 1,
          pointerEvents: cardsHidden ? 'none' : 'auto',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="region"
        aria-label="Recomendaciones de profesionales"
      >
        {recommendations.map((rec, idx) => {
          const baseOffset = (idx - currentIndex) * CARD_SPACING_PERCENT
          const dragAdjust = dragOffset / DRAG_RESISTANCE_FACTOR
          const offsetX = baseOffset + dragAdjust

          const isCurrent = idx === currentIndex
          const isNext = idx === currentIndex + 1
          const isPrev = idx === currentIndex - 1

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
                filter: 'none',
                transition: dragOffset
                  ? 'none'
                  : `all ${CARD_SWIPE_DURATION_MS}ms ${TRANSITION_EASING}`,
                pointerEvents: isCurrent ? 'auto' : 'none',
                zIndex: isCurrent ? 20 : isPrev || isNext ? 10 : 5,
              }}
            >
              <RecommendationCard
                recommendation={rec}
                trackingCode={trackingCode}
                isCurrent={isCurrent}
                onOpenDetails={onOpenDetails}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
