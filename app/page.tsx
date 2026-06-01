// Hara Vital — Pre-launch homepage ("Próximamente").
// Replaces the post-launch home (which now lives at /preview) until the
// directory and concierge flows are open to the public.

import Link from 'next/link'
import { PageBackground } from './components/ui/PageBackground'
import { WaitlistForm }   from './components/WaitlistForm'
import { RevealOnScroll } from './components/ui/RevealOnScroll'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 container-public pt-8 pb-8 flex flex-col justify-center min-h-screen">

        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-brand uppercase tracking-[0.2em] mb-3">
            Hara Vital
          </p>
          <h1 className="text-4xl font-semibold text-foreground leading-tight mb-4">
            Próximamente
          </h1>
          <p className="text-base text-muted leading-relaxed">
            Estamos creando un espacio donde encontrar profesionales del bienestar sea simple, humano y confiable.
          </p>
        </div>

        <RevealOnScroll delay={100}>
          <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6 mb-6">
            <p className="text-sm text-foreground font-semibold mb-1">
              ¿Te querés enterar primera?
            </p>
            <p className="text-sm text-muted leading-relaxed mb-5">
              Dejanos tu email y te avisamos cuando estemos listos. ¿Sos profesional y querés sumarte? También es por acá.
            </p>
            <WaitlistForm />
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={200}>
          <div className="mt-auto pt-6 text-center space-y-2">
            <p className="text-xs text-muted">
              Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
            </p>
            <Link href="/ayuda" className="text-xs text-muted hover:text-foreground transition-colors">
              ¿Necesitás ayuda?
            </Link>
          </div>
        </RevealOnScroll>

      </div>
    </div>
  )
}
