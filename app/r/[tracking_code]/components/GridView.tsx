'use client'

// Desktop 3-card grid view for concierge recommendations.
// Replaces the mobile swipe-deck on viewports ≥1024px.
// All 3 cards are visible simultaneously; clicking any card opens the detail modal.

import type { Recommendation } from '../hooks/useRecommendations'
import { ContactButton } from '@/app/components/ContactButton'
import { Chip } from '@/app/components/ui/Chip'
import { SPECIALTY_MAP, isValidReason } from '@/lib/design-constants'

interface GridViewProps {
  recommendations: Recommendation[]
  trackingCode: string
  onOpenDetails: (index: number) => void
}

export function GridView({ recommendations, trackingCode, onOpenDetails }: GridViewProps) {
  return (
    <div className="relative z-10 container-public pt-8 pb-12">
      <h1 className="text-2xl font-semibold text-foreground mb-6 text-center">
        Tus 3 opciones
      </h1>

      <div className="grid grid-cols-3 gap-6">
        {recommendations.map((rec, idx) => (
          <GridCard
            key={rec.id}
            recommendation={rec}
            trackingCode={trackingCode}
            onOpenDetails={() => onOpenDetails(idx)}
          />
        ))}
      </div>

      <p className="text-xs text-muted text-center mt-6">
        Tu info se comparte recién cuando vos escribís.
      </p>
    </div>
  )
}

interface GridCardProps {
  recommendation: Recommendation
  trackingCode: string
  onOpenDetails: () => void
}

function GridCard({ recommendation: rec, trackingCode, onOpenDetails }: GridCardProps) {
  return (
    <article
      data-testid={`recommendation-${rec.rank}`}
      className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 overflow-hidden flex flex-col cursor-pointer"
      onClick={onOpenDetails}
    >
      {/* Hero */}
      <div className="pt-6 px-6 pb-4 flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-brand-weak to-info-weak rounded-2xl shadow-soft flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground leading-tight mb-1">
            {rec.professional.name}
          </h2>
          <p className="text-sm text-muted truncate">
            {SPECIALTY_MAP[rec.professional.specialty] || rec.professional.specialty}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 pb-4 space-y-4 flex-1">
        {/* Chips */}
        <div className="flex flex-wrap gap-1.5">
          <Chip label="Perfil revisado" variant="success" />
          <Chip label="Online" variant="brand" />
          <Chip label="Esta semana" variant="warning" />
        </div>

        {/* Why recommended — 2 bullets max */}
        {rec.reasons.filter(isValidReason).length > 0 && (
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
        )}
      </div>

      {/* Footer actions — stop propagation so card click doesn't double-fire */}
      <div
        className="px-6 pb-6 pt-2 space-y-2 border-t border-outline/20"
        onClick={(e) => e.stopPropagation()}
      >
        <ContactButton
          professionalSlug={rec.professional.slug}
          professionalName={rec.professional.name}
          whatsappNumber={rec.professional.whatsapp}
          trackingCode={trackingCode}
          rank={rec.rank}
          attributionToken={rec.attribution_token}
          className="w-full"
        />
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDetails() }}
          className="w-full text-sm text-brand font-medium hover:underline"
        >
          Ver detalles
        </button>
      </div>
    </article>
  )
}
