// Error Boundary for Recommendations Route
// Catches errors specific to the /r/[tracking_code] route

'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/monitoring'

export default function RecommendationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    logError(error, {
      location: 'recommendations-error-boundary',
      route: '/r/[tracking_code]',
      digest: error.digest,
    })
  }, [error])

  return (
    <main className="font-almanac flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-[26px] bg-gray-50 p-8 text-center shadow-soft">
        <h1 className="font-almanac-serif mb-0 text-[30px]" style={{ lineHeight: 1.05, letterSpacing: 0 }}>
          No pudimos cargar tu carta
        </h1>
        <span className="mt-3 block text-sm leading-[1.5] text-gray-700">
          Hubo un problema al abrirla. Probá de nuevo en un momento.
        </span>
        {error.digest && (
          <span className="mt-3 block font-mono text-xs text-muted">Código de error: {error.digest}</span>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="btn-press-glow mt-6 w-full rounded-[15px] bg-brand-dark p-[13px] text-[14.5px] font-medium text-gray-50"
        >
          Reintentar
        </button>
      </div>
    </main>
  )
}
