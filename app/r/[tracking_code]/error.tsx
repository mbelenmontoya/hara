// Error Boundary for Recommendations Route
// Catches errors specific to the /r/[tracking_code] route

'use client'

import { useEffect } from 'react'

export default function RecommendationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error for debugging
    console.error('Recommendations page error:', error)

    // TODO: Log to error monitoring service (Sentry)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface backdrop-blur-xl rounded-3xl shadow-elevated p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-warning-weak rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-warning"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-semibold text-foreground mb-3">
          No pudimos cargar tus opciones
        </h2>

        <p className="text-muted leading-relaxed mb-6">
          Hubo un problema al cargar las recomendaciones. Por favor, intentá de nuevo o
          pedí un nuevo link por email.
        </p>

        {error.digest && (
          <p className="text-xs text-muted/60 mb-6 font-mono">
            Código de error: {error.digest}
          </p>
        )}

        <button
          onClick={() => reset()}
          className="w-full bg-brand text-white px-6 py-4 rounded-full shadow-elevated hover:shadow-strong active:scale-[0.98] transition-all font-semibold mb-3"
        >
          Reintentar
        </button>

        <button
          onClick={() => (window.location.href = '/')}
          className="w-full text-muted hover:text-foreground transition-colors text-sm py-2"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
