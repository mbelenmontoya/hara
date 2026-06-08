// Página informativa: Qué es Hara Vital
// Misión, visión, cómo funciona y para quién es — en castellano argentino.

import Link from 'next/link'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'

export const metadata = {
  title: 'Qué es Hara | Hara Vital',
  description: 'Conocé la misión, visión y cómo funciona Hara Vital — el espacio donde encontrás profesionales de bienestar verificados para acompañarte en lo que estás atravesando.',
}

export default function QueEsHaraPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 container-public pt-8 pb-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
          Sobre Hara
        </p>
        <h1 className="text-3xl font-semibold text-foreground leading-tight mb-3">
          ¿Qué es Hara Vital?
        </h1>
        <p className="text-base text-muted leading-relaxed mb-8">
          Un espacio cuidado donde encontrás profesionales de bienestar verificados para acompañarte en lo que estás atravesando.
        </p>

        <div className="space-y-4">

          {/* Sección 1 — Qué es Hara */}
          <GlassCard>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              El producto es la confianza
            </h2>
            <p className="text-sm text-muted leading-relaxed mb-3">
              Hara Vital es un marketplace curado de <span className="text-foreground font-medium">terapias alternativas y bienestar holístico</span> para el mundo hispanohablante. Reiki, masajes terapéuticos, constelaciones familiares, diseño humano, registros akáshicos, terapia floral, terapia energética, meditación, y más.
            </p>
            <p className="text-sm text-muted leading-relaxed">
              Es la capa de confianza entre personas que están atravesando algo concreto — ansiedad, insomnio, duelo, estrés, búsqueda de claridad — y los profesionales que pueden acompañarlas desde otro lugar. La brújula no es la modalidad, es lo que estás sintiendo: si no podés dormir, podés llegar al masaje, al reiki o a las constelaciones. Lo que importa es que la persona que encontrás sea real, verificada, y confiable.
            </p>
          </GlassCard>

          {/* Sección 2 — Cómo funciona */}
          <GlassCard>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Cómo funciona
            </h2>
            <p className="text-sm text-muted leading-relaxed mb-5">
              Dos caminos, los dos terminan igual: en una conversación directa por WhatsApp, en tu tiempo, con tu información.
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Explorá el directorio
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  El camino principal. Entrás, navegás los perfiles ordenados por reputación, encontrás alguien que resuene, y le escribís por WhatsApp. Es rápido, es directo, y tu información no se comparte hasta que vos abrís la conversación.{' '}
                  <Link href="/profesionales" className="text-brand hover:underline font-medium">
                    Ir al directorio →
                  </Link>
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Pedí una recomendación personalizada
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  Si preferís que alguien elija por vos: contanos qué estás atravesando, qué modalidad te interesa, dónde estás y cuánto podés invertir. Revisamos tu solicitud y te mandamos un link con tres profesionales elegidos a mano para tu situación.{' '}
                  <Link href="/solicitar" className="text-brand hover:underline font-medium">
                    Pedir recomendación →
                  </Link>
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Sección 3 — Para quién es */}
          <GlassCard>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Para quién es
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Personas que buscan acompañamiento
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  Adultos en Argentina y el mundo hispanohablante que están atravesando algo concreto — ansiedad, insomnio, duelo, estrés, agotamiento, una búsqueda de claridad — y están abiertos a terapias alternativas y bienestar holístico. Los que buscaron en Google o en Instagram y se perdieron entre 50 opciones sin saber cuál era confiable. Para quienes la confianza es la barrera número uno antes de abrir una conversación con alguien.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Profesionales del bienestar
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  Practicantes independientes de terapias alternativas y bienestar holístico que quieren ser descubiertos, construir reputación basada en interacciones reales, y que la plataforma maneje la visibilidad para que ellas puedan enfocarse en el trabajo. Si querés sumarte,{' '}
                  <Link href="/profesionales/registro" className="text-brand hover:underline font-medium">
                    registrate acá →
                  </Link>
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Sección 4 — Qué nos hace diferentes */}
          <GlassCard>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Qué nos hace diferentes
            </h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-brand mt-0.5 shrink-0">✓</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Solo profesionales verificados</p>
                  <p className="text-sm text-muted leading-relaxed">No cualquiera aparece en Hara. Cada perfil pasa por una revisión antes de publicarse.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-brand mt-0.5 shrink-0">✓</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Reseñas de interacciones reales</p>
                  <p className="text-sm text-muted leading-relaxed">Los links de reseña solo llegan a personas que efectivamente contactaron a un profesional. No hay spam anónimo ni estrellas compradas.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-brand mt-0.5 shrink-0">✓</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Tu privacidad, primero</p>
                  <p className="text-sm text-muted leading-relaxed">Tu información se comparte recién cuando vos escribís. Hasta ese momento, nadie ve tus datos.</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* CTA final */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Link
              href="/profesionales"
              className="inline-flex items-center justify-center font-medium transition-all duration-200 bg-brand text-white hover:bg-brand-hover btn-press-glow shadow-elevated hover:shadow-strong px-5 py-3 text-base rounded-full min-h-[44px]"
            >
              Explorar profesionales
            </Link>
            <Link
              href="/solicitar"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              O pedí una recomendación personalizada →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
