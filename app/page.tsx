// Hará Match - Home Page
// Standalone with illustration background, glass cards, pill buttons

import Link from 'next/link'
import { PageBackground } from './components/ui/PageBackground'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 max-w-md mx-auto px-4 pt-8 pb-12">

        {/* Hero */}
        <h1 className="text-3xl font-semibold text-foreground mb-3 text-center leading-tight">
          Te conectamos con tu terapeuta ideal
        </h1>
        <p className="text-base text-muted mb-8 leading-relaxed text-center">
          Recibí 3 recomendaciones personalizadas de profesionales verificados
        </p>

        {/* CTAs */}
        <div className="space-y-3 mb-10">
          <Link
            href="/solicitar"
            className="block w-full px-6 py-4 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all text-center"
          >
            Solicitar recomendaciones
          </Link>
          <Link
            href="/profesionales/registro"
            className="block w-full px-6 py-3.5 bg-surface border border-outline text-foreground font-semibold rounded-full shadow-soft hover:shadow-elevated hover:border-muted transition-all text-center"
          >
            Únete como profesional
          </Link>
        </div>

        {/* How it Works */}
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-8">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-6">
            Cómo funciona
          </h2>

          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-weak rounded-full flex items-center justify-center text-brand font-semibold text-sm">
                1
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Cuéntanos qué necesitás</p>
                <p className="text-sm text-muted leading-relaxed">Completá un breve formulario sobre tus preferencias</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-weak rounded-full flex items-center justify-center text-brand font-semibold text-sm">
                2
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Recibí 3 recomendaciones</p>
                <p className="text-sm text-muted leading-relaxed">Te enviamos perfiles de profesionales que se ajustan a vos</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-weak rounded-full flex items-center justify-center text-brand font-semibold text-sm">
                3
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Contactá directamente</p>
                <p className="text-sm text-muted leading-relaxed">Iniciá la conversación por WhatsApp sin intermediarios</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin access */}
        <div className="mt-10 text-center">
          <Link
            href="/admin/leads"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Acceso administrativo
          </Link>
        </div>

        {/* Privacy */}
        <p className="text-xs text-muted text-center mt-6">
          Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
        </p>

      </div>
    </div>
  )
}
