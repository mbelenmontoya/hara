'use client'

const BENEFITS = [
  {
    title: 'Solo profesionales verificados',
    description: 'Cada perfil pasa por revisión antes de aparecer en el directorio.',
  },
  {
    title: 'Tu privacidad, primero',
    description: 'Tu info se comparte recién cuando vos abrís la conversación.',
  },
  {
    title: 'Buscá por lo que estás atravesando',
    description: 'Nombre, práctica o síntoma — el directorio te muestra quién puede acompañarte.',
  },
]

export function WelcomeHint() {
  return (
    <details open className="rounded-2xl overflow-hidden border border-success/15 group">
      <summary className="flex items-center justify-between gap-3 px-4 py-3 bg-success-weak hover:bg-success-weak/70 transition-colors cursor-pointer list-none">
        <span className="flex items-center gap-2 text-sm font-medium text-success">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ¿Cómo funciona Hara Vital?
        </span>
        <svg
          className="w-4 h-4 text-success/60 shrink-0 transition-transform duration-200 group-open:rotate-180"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="bg-success-light px-4 pt-4 pb-5 space-y-3">
        <div className="pb-1">
          <p className="text-sm font-semibold text-foreground mb-1">
            Tu espacio de bienestar, verificado y de confianza
          </p>
          <p className="text-xs text-muted leading-relaxed">
            Hara Vital conecta personas que están atravesando algo —
            ansiedad, insomnio, duelo, estrés — con profesionales de{' '}
            <span className="text-foreground font-medium">terapias alternativas y bienestar holístico</span>{' '}
            verificados y con reseñas reales.
          </p>
        </div>

        {BENEFITS.map((b) => (
          <div key={b.title} className="flex items-start gap-2.5">
            <span className="mt-0.5 w-4 h-4 rounded-full bg-success/15 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg className="w-2.5 h-2.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{b.title}</p>
              <p className="text-xs text-muted leading-relaxed">{b.description}</p>
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}
