// Bottom sheet component for displaying professional details
// Shows full information, reasons, bio, and contact CTA
// Uses iOS-style liquid glass with proper animations

'use client'

import { useState, useEffect } from 'react'
import { ContactButton } from '@/app/components/ContactButton'
import { Chip } from '@/app/components/ui/Chip'
import type { Recommendation } from '../hooks/useRecommendations'
import { SHEET_ANIMATION_MS, EASING, SPECIALTY_MAP, isValidReason } from '@/lib/design-constants'

interface BottomSheetProps {
  recommendation: Recommendation
  trackingCode: string
  onClose: () => void
  onCloseStart?: () => void // Called immediately when close animation begins
}

/**
 * Bottom sheet modal displaying full professional details
 * Includes bio, reasons, suggested message, and contact CTA
 * Uses iOS-style liquid glass effect with slide-up animation
 */
export function BottomSheet({
  recommendation,
  trackingCode,
  onClose,
  onCloseStart,
}: BottomSheetProps) {
  const { professional, reasons, rank, attribution_token } = recommendation
  const firstName = professional.name?.split(' ')[0] || ''
  
  // Animation state - starts closed, animates open
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Animate in on mount
  useEffect(() => {
    // Small delay to ensure DOM is ready for animation
    const timer = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(timer)
  }, [])

  // Handle close with animation
  const handleClose = () => {
    if (isClosing) return // Prevent double-close
    setIsClosing(true)
    setIsVisible(false)
    onCloseStart?.() // Notify parent immediately so cards can start fading in
    setTimeout(onClose, SHEET_ANIMATION_MS) // Unmount after animation
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="professional-name"
    >
      
      {/* Sheet content - iOS liquid glass style */}
      <div
        className="relative liquid-glass border-t border-white/30 rounded-t-[32px] shadow-strong w-full"
        style={{
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${SHEET_ANIMATION_MS}ms ${EASING}`,
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-4 sticky top-0 bg-transparent">
          <div className="w-14 h-1.5 bg-white/40 rounded-full" />
        </div>

        {/* Scrollable content area - only scrolls if content exceeds max height */}
        <div className="px-6 pb-10 pb-safe space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 56px)' }}>
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
            <Chip label="Perfil revisado" variant="success" />
            <Chip label="Turnos esta semana" variant="warning" />
            <Chip label="Online" variant="neutral" />
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
            onBeforeNavigate={handleClose}
          />

          {/* Secondary actions - links side by side */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <a
              href={`/p/${professional.slug}`}
              className="text-brand font-medium hover:underline"
            >
              Ver perfil completo
            </a>
            <span className="text-outline">|</span>
            <button
              onClick={handleClose}
              className="text-brand font-medium hover:underline"
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
