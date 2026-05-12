// Página de soporte público de Hara Vital.
// Preguntas frecuentes para usuarios y profesionales + contacto por email e Instagram.

import Link from 'next/link'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { DisclosureItem, type DisclosureGroup } from '@/app/components/ui/Disclosure'

const groups: readonly DisclosureGroup[] = [
  {
    id: 'usuarios',
    title: 'Para usuarios',
    intro: 'Las preguntas más frecuentes de quienes buscan acompañamiento.',
    disclosures: [
      {
        title: '¿Cómo contacto a un profesional?',
        paragraphs: [
          'Elegís un profesional desde el directorio o desde tu link de recomendaciones y le escribís por WhatsApp con un toque del botón. Tu info no se comparte hasta que vos escribís.',
        ],
      },
      {
        title: '¿Mi información se comparte sin mi permiso?',
        paragraphs: [
          'No. Tu nombre, teléfono y email se comparten solamente cuando vos abrís la conversación por WhatsApp. Hasta ese momento, nadie ve tus datos.',
        ],
      },
      {
        title: '¿Cómo se eligen los profesionales que aparecen?',
        paragraphs: [
          'Cada profesional pasa por una revisión antes de aparecer en la plataforma. Los ordenamos por reputación, basada en reseñas reales de personas que efectivamente los contactaron.',
        ],
      },
      {
        title: 'Si recibiste un link de recomendaciones y lo perdiste, ¿cómo lo recupero?',
        paragraphs: [
          'Escribinos por email a centrovitalhara@gmail.com o por Instagram (@haravital) con tu nombre y el email o teléfono que usaste, y te lo reenviamos.',
        ],
      },
      {
        title: '¿Cuánto cuesta usar Hara Vital?',
        paragraphs: [
          'Para vos como usuario, nada. Los profesionales pueden pagar por aparecer destacados; vos no pagás nada.',
        ],
      },
      {
        title: 'Tuve un problema con un profesional, ¿qué hago?',
        paragraphs: [
          'Escribinos por email o Instagram con el nombre del profesional y qué pasó. Lo revisamos.',
        ],
      },
    ],
  },
  {
    id: 'profesionales',
    title: 'Para profesionales',
    intro: 'Si querés sumarte o ya estás en Hara Vital, esto te puede servir.',
    disclosures: [
      {
        title: '¿Cómo me registro?',
        paragraphs: [
          'En /profesionales/registro. El formulario tiene 4 pasos y te lleva entre 5 y 10 minutos.',
        ],
      },
      {
        title: '¿Cuánto tarda la revisión de mi solicitud?',
        paragraphs: [
          'Las revisamos lo más rápido que podemos. Si pasó más de una semana y no recibiste respuesta, escribinos.',
        ],
      },
      {
        title: 'Mi solicitud fue rechazada, ¿qué hago?',
        paragraphs: [
          'Recibís un email con el motivo y la fecha desde la que podés volver a aplicar. Si necesitás más contexto, escribinos.',
        ],
      },
      {
        title: '¿Cómo edito mi perfil?',
        paragraphs: [
          'Por ahora, escribinos por email con los cambios y los aplicamos. Estamos trabajando en un panel propio.',
        ],
      },
      {
        title: '¿Cuánto cuesta estar en Hara Vital?',
        paragraphs: [
          'El tier Básico es gratis. El tier Destacado es pago — aparecés más arriba y con un distintivo. Escribinos para el detalle de precios.',
        ],
      },
      {
        title: '¿Cómo me llegan los clientes?',
        paragraphs: [
          'Te contactan directamente por WhatsApp cuando eligen tu perfil. No hay intermediarios.',
        ],
      },
    ],
  },
]

export default function AyudaPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 max-w-md md:max-w-[960px] mx-auto px-4 pt-8 pb-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted hover:text-foreground transition-colors mb-6"
        >
          ← Volver al inicio
        </Link>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
          Ayuda
        </p>
        <h1 className="text-3xl font-semibold text-foreground leading-tight mb-3">
          ¿En qué te podemos ayudar?
        </h1>
        <p className="text-base text-muted leading-relaxed mb-4">
          Acá te dejamos las preguntas más comunes y cómo escribirnos si necesitás algo más.
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
          <a
            href="#usuarios"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Para usuarios
          </a>
          <a
            href="#profesionales"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Para profesionales
          </a>
        </div>

        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-8">
              <GlassCard>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {group.title}
                </h2>
                <p className="text-sm text-muted leading-relaxed mb-5">
                  {group.intro}
                </p>
                <div className="space-y-2">
                  {group.disclosures.map((disclosure) => (
                    <DisclosureItem key={disclosure.title} {...disclosure} />
                  ))}
                </div>
              </GlassCard>
            </section>
          ))}

          <GlassCard>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              ¿Necesitás escribirnos?
            </h2>
            <p className="text-sm text-muted leading-relaxed mb-5">
              Por email o por Instagram. Te respondemos lo antes que podamos.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:centrovitalhara@gmail.com"
                className="text-sm font-semibold text-brand hover:underline"
              >
                centrovitalhara@gmail.com
              </a>
              <a
                href="https://instagram.com/haravital"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-brand hover:underline"
              >
                @haravital en Instagram
              </a>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
