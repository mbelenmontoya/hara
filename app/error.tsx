// Root-level Error Boundary
// Catches unhandled errors in the entire application

'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Application error:', error)

    // TODO: Log to error monitoring service (Sentry)
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error)
    // }
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface backdrop-blur-xl rounded-3xl shadow-elevated p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-danger-weak rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-danger"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-semibold text-foreground mb-3">
          Algo salió mal
        </h2>

        <p className="text-muted leading-relaxed mb-6">
          {error.message || 'Ocurrió un error inesperado. Por favor, intentá de nuevo.'}
        </p>

        {error.digest && (
          <p className="text-xs text-muted/60 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <button
          onClick={() => reset()}
          className="w-full bg-brand text-white px-6 py-4 rounded-full shadow-elevated hover:shadow-strong active:scale-[0.98] transition-all font-semibold mb-3"
        >
          Intentar de nuevo
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
