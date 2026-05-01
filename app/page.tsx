// Hará Match — Pre-launch homepage ("Próximamente").
// Replaces the post-launch home (which now lives at /preview) until the
// directory and concierge flows are open to the public.

import { PageBackground } from './components/ui/PageBackground'
import { WaitlistForm }   from './components/WaitlistForm'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 max-w-md mx-auto px-4 pt-16 pb-12 min-h-screen flex flex-col">

        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-brand uppercase tracking-[0.2em] mb-3">
            Hará Match
          </p>
          <h1 className="text-4xl font-semibold text-foreground leading-tight mb-4">
            Próximamente
          </h1>
          <p className="text-base text-muted leading-relaxed">
            Estamos creando un espacio donde encontrar profesionales del bienestar sea simple, humano y confiable.
          </p>
        </div>

        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6 mb-6">
          <p className="text-sm text-foreground font-semibold mb-1">
            ¿Querés saber cuando abramos?
          </p>
          <p className="text-sm text-muted leading-relaxed mb-5">
            Dejanos tu email. Si sos profesional y querés sumarte, también es por acá.
          </p>
          <WaitlistForm />
        </div>

        <p className="text-xs text-muted text-center mt-auto pt-6">
          Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
        </p>

      </div>
    </div>
  )
}
