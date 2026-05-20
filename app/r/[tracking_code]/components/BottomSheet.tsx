// Bottom sheet on mobile, centered modal on desktop (≥1024px).
// Same content in both modes — only the wrapper and entry animation differ.

'use client'

import { useState, useEffect } from 'react'
import { ContactButton } from '@/app/components/ContactButton'
import { Chip } from '@/app/components/ui/Chip'
import type { Recommendation } from '../hooks/useRecommendations'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { SHEET_ANIMATION_MS, EASING, SPECIALTY_MAP, isValidReason } from '@/lib/design-constants'

interface BottomSheetProps {
  recommendation: Recommendation
  trackingCode: string
  onClose: () => void
  onCloseStart?: () => void
}

export function BottomSheet({
  recommendation,
  trackingCode,
  onClose,
  onCloseStart,
}: BottomSheetProps) {
  const { professional, reasons, rank, attribution_token } = recommendation
  const firstName = professional.name?.split(' ')[0] || ''
  const isDesktop = useIsDesktop()

  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    const timer = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(timer)
  }, [])

  // Escape key closes modal on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isClosing]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (isClosing) return
    setIsClosing(true)
    setIsVisible(false)
    onCloseStart?.()
    setTimeout(onClose, SHEET_ANIMATION_MS)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="professional-name"
    >
      {/* Sheet/modal content */}
      <div
        className="relative liquid-glass border-t border-outline/30 rounded-t-[32px] shadow-strong w-full lg:rounded-3xl lg:max-w-2xl lg:mx-4 lg:border-t-0 lg:border lg:border-outline/30"
        style={{
          // Mobile: slide up from bottom. Desktop: fade + scale in from center.
          transform: isVisible
            ? 'translateY(0) scale(1)'
            : isDesktop
            ? 'translateY(0) scale(0.95)'
            : 'translateY(100%) scale(1)',
          opacity: isVisible ? 1 : 0,
          transition: `transform ${SHEET_ANIMATION_MS}ms ${EASING}, opacity ${SHEET_ANIMATION_MS}ms ${EASING}`,
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center py-4 sticky top-0 bg-transparent lg:hidden">
          <div className="w-14 h-1.5 bg-white/40 rounded-full" />
        </div>

        {/* Scrollable content */}
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

          {/* Reasons */}
          {reasons.filter(isValidReason).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Por qué te la recomendamos:
              </h3>
              <div className="space-y-3">
                {reasons.filter(isValidReason).map((reason, i) => (
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

          {/* Bio */}
          {professional.bio && (
            <div className="p-4 bg-subtle/30 rounded-2xl border border-outline/40">
              <p className="text-sm text-foreground leading-relaxed">{professional.bio}</p>
            </div>
          )}

          {/* Suggested message */}
          <div className="p-5 bg-info-weak/20 rounded-2xl border border-info/10">
            <p className="text-xs font-medium text-muted mb-3">
              Si querés, podés empezar con:
            </p>
            <p className="text-sm text-foreground leading-[1.7]">
              "Hola{firstName ? ` ${firstName}` : ''}, me recomendaron por Hara.{' '}
              {professional.specialty
                ? `Estoy buscando ayuda con ${SPECIALTY_MAP[professional.specialty] || professional.specialty.toLowerCase()}. ¿Tenés un espacio esta semana?`
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

          {/* Secondary actions */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <a
              href={`/p/${professional.slug}?from=/r/${trackingCode}`}
              className="text-brand font-medium hover:underline"
            >
              Ver perfil completo
            </a>
            <span className="text-outline">|</span>
            <button onClick={handleClose} className="text-brand font-medium hover:underline">
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
