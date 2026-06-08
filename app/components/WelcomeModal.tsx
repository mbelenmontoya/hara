'use client'

// First-visit welcome modal — shown exactly once per browser via a versioned localStorage flag.
// Flag is set when the modal opens (not on dismiss). Versioned key lets a future redesign re-show.

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/app/components/ui/Button'

const SEEN_KEY = 'hara:welcome-seen:v1'
const EXCLUDED_PREFIXES = ['/admin', '/r/', '/r/review']
const EXCLUDED_EXACT = ['/']
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (EXCLUDED_EXACT.includes(pathname)) return
    if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        localStorage.setItem(SEEN_KEY, '1')
        setOpen(true)
      }
    } catch {
      // localStorage blocked — fail safe, no modal
    }
  }, [])

  // Focus trap + ESC
  useEffect(() => {
    if (!open) return
    const focusable = () =>
      Array.from(cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => !el.hasAttribute('disabled')
      )
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key !== 'Tab') return
      const els = focusable()
      if (!els.length) return
      const first = els[0]; const last = els[els.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !cardRef.current?.contains(active)) { e.preventDefault(); last.focus() }
      } else {
        if (active === last || !cardRef.current?.contains(active)) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    focusable()[0]?.focus()
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = 'unset' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/50" />

      {/* Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        tabIndex={-1}
        className="relative bg-background rounded-t-3xl sm:rounded-3xl shadow-elevated border border-outline/40 w-full sm:max-w-xl max-h-[92svh] sm:max-h-[88vh] flex flex-col animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-outline" aria-hidden="true" />
        </div>

        {/* Header — brand accent strip */}
        <div className="flex items-start justify-between px-7 pt-6 pb-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">
              Bienvenida
            </p>
            <h2
              id="welcome-title"
              className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight"
            >
              Tu espacio de bienestar,<br className="hidden sm:block" /> verificado y de confianza
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="shrink-0 ml-4 mt-1 text-muted hover:text-foreground p-2 rounded-xl hover:bg-surface transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-7 pt-5 pb-4">
          <p className="text-base text-muted leading-relaxed mb-6">
            Hara Vital conecta personas que están atravesando algo —
            ansiedad, insomnio, duelo, estrés — con profesionales de{' '}
            <span className="text-foreground font-medium">terapias alternativas y bienestar holístico</span>{' '}
            verificados y con reseñas reales.
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-weak flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Solo profesionales verificados</p>
                <p className="text-sm text-muted leading-relaxed">Cada perfil pasa por revisión antes de aparecer en el directorio.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-weak flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Tu privacidad, primero</p>
                <p className="text-sm text-muted leading-relaxed">Tu info se comparte recién cuando vos abrís la conversación.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-weak flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Buscá por lo que estás atravesando</p>
                <p className="text-sm text-muted leading-relaxed">Nombre, práctica o síntoma — el directorio te muestra quién puede acompañarte.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-7 pb-7 pt-5 border-t border-outline/20">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Empezar a explorar
            </Button>
            <Link
              href="/que-es-hara"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center text-sm text-brand hover:text-brand-hover font-medium transition-colors py-2 sm:py-0"
            >
              Conocé más sobre Hara →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
