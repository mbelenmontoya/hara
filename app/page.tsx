// Hará Match - Home Page
// Mobile-first with consistent spacing rhythm

import { PublicLayout } from './components/PublicLayout'
import { Button } from './components/ui/Button'
import Link from 'next/link'

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="section-public">
        <div className="container-public text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold text-foreground mb-5">
            Te conectamos con tu terapeuta ideal
          </h1>
          <p className="text-lg text-muted mb-8 leading-relaxed">
            Recibe 3 recomendaciones personalizadas de profesionales verificados
          </p>

          {/* CTAs */}
          <div className="stack-default max-w-sm mx-auto">
            <Button variant="primary" size="lg" className="w-full">
              Solicitar recomendaciones
            </Button>
            <Link href="/profesionales/registro">
              <Button variant="secondary" size="lg" className="w-full">
                Únete como profesional
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="section-public bg-surface/60">
        <div className="container-public">
          <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
            Cómo funciona
          </h2>
          <div className="stack-relaxed max-w-md mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-brand font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Cuéntanos qué necesitas</h3>
                <p className="text-sm text-muted leading-relaxed">Completa un breve formulario sobre tus preferencias</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-brand font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Recibe 3 recomendaciones</h3>
                <p className="text-sm text-muted leading-relaxed">Te enviamos perfiles de profesionales que se ajustan a ti</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-brand font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Contacta directamente</h3>
                <p className="text-sm text-muted leading-relaxed">Inicia la conversación por WhatsApp sin intermediarios</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Admin CTA (dev-only, subtle) */}
      <section className="section-public">
        <div className="container-public text-center">
          <Link href="/admin/leads">
            <Button variant="ghost" size="sm">
              Acceso administrativo
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}
