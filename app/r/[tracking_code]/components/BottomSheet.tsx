// Bottom sheet component for displaying professional details
// Shows full information, reasons, bio, and contact CTA

'use client'

import { ContactButton } from '@/app/components/ContactButton'
import type { Recommendation } from '../hooks/useRecommendations'

// Specialty translations
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

interface BottomSheetProps {
  recommendation: Recommendation
  trackingCode: string
  onClose: () => void
}

/**
 * Bottom sheet modal displaying full professional details
 * Includes bio, reasons, suggested message, and contact CTA
 */
export function BottomSheet({
  recommendation,
  trackingCode,
  onClose,
}: BottomSheetProps) {
  const { professional, reasons, rank, attribution_token } = recommendation

  // Extract first name for personalized message
  const firstName = professional.name?.split(' ')[0] || ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="professional-name"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-md" />

      {/* Sheet content */}
      <div
        className="relative bg-surface/98 backdrop-blur-3xl border-t border-brand/15 rounded-t-[32px] shadow-strong w-full max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-400"
        style={{ transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-4">
          <div className="w-14 h-1.5 bg-outline/50 rounded-full" />
        </div>

        <div className="px-6 pb-10 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-weak to-info-weak rounded-3xl shadow-soft flex-shrink-0" />
            <div className="flex-1">
              <h2 id="professional-name" className="text-2xl font-bold text-foreground leading-tight mb-1.5">
                {professional.name}
              </h2>
              <p className="text-base text-muted">
                {SPECIALTY_MAP[professional.specialty] || professional.specialty}
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

          {/* Reasons - only if valid reasons exist */}
          {reasons.filter(isValidReason).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Por qué te la recomendamos:
              </h3>
              <div className="space-y-3">
                {reasons.filter(isValidReason).map((reason, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-5 h-5 bg-success-weak rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                      <svg
                        className="w-3 h-3 text-success"
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
                    <p className="text-sm text-foreground leading-relaxed">{reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bio - only if exists */}
          {professional.bio && (
            <div className="p-4 bg-subtle/30 rounded-2xl border border-outline/40">
              <p className="text-sm text-foreground leading-relaxed">
                {professional.bio}
              </p>
            </div>
          )}

          {/* Suggested message */}
          <div className="p-5 bg-info-weak/20 rounded-2xl border border-info/10">
            <p className="text-xs font-medium text-muted mb-3">
              Si querés, podés empezar con:
            </p>
            <p className="text-sm text-foreground leading-[1.7]">
              "Hola{firstName ? ` ${firstName}` : ''}, me recomendaron por Hará.{' '}
              {professional.specialty
                ? `Estoy buscando ayuda con ${
                    SPECIALTY_MAP[professional.specialty] ||
                    professional.specialty.toLowerCase()
                  }. ¿Tenés un espacio esta semana?`
                : 'Estoy buscando empezar terapia. ¿Tenés disponibilidad esta semana?'}
              "
            </p>
          </div>

          {/* Primary CTA */}
          <ContactButton
            professionalSlug={professional.slug}
            professionalName={professional.name}
            whatsappNumber={professional.whatsapp}
            trackingCode={trackingCode}
            rank={rank}
            attributionToken={attribution_token}
            className="w-full"
          />

          {/* Secondary actions */}
          <div className="space-y-3">
            <a
              href={`/p/${professional.slug}`}
              className="block w-full px-6 py-3.5 text-center bg-surface-2 text-foreground font-medium rounded-full border border-outline hover:bg-subtle active:scale-[0.98] transition-all"
            >
              Ver perfil completo
            </a>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 text-muted hover:text-foreground transition-colors text-sm"
            >
              Ver otras opciones
            </button>
          </div>

          {/* Privacy notice */}
          <div className="pt-6 border-t border-outline/30 text-center">
            <p className="text-xs text-muted leading-relaxed">
              Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
