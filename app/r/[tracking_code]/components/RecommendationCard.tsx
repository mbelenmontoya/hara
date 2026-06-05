'use client'

// Single recommendation card — used by both DeckView (mobile) and GridView (desktop).
// Receives layout-specific positioning from the parent; handles only its own content.

import Link from 'next/link'
import Image from 'next/image'
import { ContactButton } from '@/app/components/ContactButton'
import { Chip } from '@/app/components/ui/Chip'
import type { Recommendation } from '../hooks/useRecommendations'
import { SPECIALTY_MAP, isValidReason } from '@/lib/design-constants'

interface RecommendationCardProps {
  recommendation: Recommendation
  trackingCode: string
  isCurrent: boolean
  onOpenDetails: () => void
}

export function RecommendationCard({
  recommendation: rec,
  trackingCode,
  isCurrent,
  onOpenDetails,
}: RecommendationCardProps) {
  return (
    <div
      className={`liquid-glass rounded-3xl shadow-elevated border overflow-hidden flex flex-col hover:shadow-strong transition-shadow ${
        isCurrent ? 'border-brand/20' : 'border-outline/30'
      }`}
      onClick={() => {
        if (isCurrent) onOpenDetails()
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
              {SPECIALTY_MAP[rec.professional.specialty] || rec.professional.specialty}
            </p>
          </div>
        </a>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-4">
        {/* Chips */}
        <div className="flex flex-wrap gap-2">
          <Chip label="Perfil revisado" variant="success" />
          <Chip label="Online" variant="brand" />
          <Chip label="Esta semana" variant="warning" />
        </div>

        {/* Why recommended */}
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

        {/* Primary CTA */}
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

        {/* Ver detalles */}
        {isCurrent && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetails()
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
  )
}
