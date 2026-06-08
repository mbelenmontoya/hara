// Página unificada: Qué es Hara + Ayuda (FAQ + contacto)
// Diseño tipo documento: sidebar izquierdo con TOC, contenido principal a la derecha.

import Link from 'next/link'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { DisclosureItem } from '@/app/components/ui/Disclosure'

export const metadata = {
  title: 'Qué es Hara | Hara Vital',
  description: 'Conocé la misión, visión y cómo funciona Hara Vital — el espacio donde encontrás profesionales de bienestar verificados para acompañarte en lo que estás atravesando.',
}

const TOC = [
  { href: '#producto',           label: '¿Qué es Hara?' },
  { href: '#como-funciona',      label: 'Cómo funciona' },
  { href: '#para-quien',         label: 'Para quién es' },
  { href: '#diferencias',        label: 'Qué nos hace diferentes' },
  { href: '#faq-usuarios',       label: 'Preguntas · Usuarios' },
  { href: '#faq-profesionales',  label: 'Preguntas · Profesionales' },
  { href: '#contacto',           label: 'Escribinos' },
]

const FAQ_USUARIOS = [
  {
    title: '¿Cómo contacto a un profesional?',
    paragraphs: ['Elegís un profesional desde el directorio o desde tu link de recomendaciones y le escribís por WhatsApp con un toque del botón. Tu info no se comparte hasta que vos escribís.'],
  },
  {
    title: '¿Mi información se comparte sin mi permiso?',
    paragraphs: ['No. Tu nombre, teléfono y email se comparten solamente cuando vos abrís la conversación por WhatsApp. Hasta ese momento, nadie ve tus datos.'],
  },
  {
    title: '¿Cómo se eligen los profesionales que aparecen?',
    paragraphs: ['Cada profesional pasa por una revisión antes de aparecer en la plataforma. Los ordenamos por reputación, basada en reseñas reales de personas que efectivamente los contactaron.'],
  },
  {
    title: 'Si recibiste un link de recomendaciones y lo perdiste, ¿cómo lo recupero?',
    paragraphs: ['Escribinos por email a centrovitalhara@gmail.com o por Instagram (@haravital) con tu nombre y el email o teléfono que usaste, y te lo reenviamos.'],
  },
  {
    title: '¿Cuánto cuesta usar Hara Vital?',
    paragraphs: ['Para vos como usuario, nada. Los profesionales pueden pagar por aparecer destacados; vos no pagás nada.'],
  },
  {
    title: 'Tuve un problema con un profesional, ¿qué hago?',
    paragraphs: ['Escribinos por email o Instagram con el nombre del profesional y qué pasó. Lo revisamos.'],
  },
]

const FAQ_PROFESIONALES = [
  {
    title: '¿Cómo me registro?',
    paragraphs: ['En /profesionales/registro. El formulario tiene 4 pasos y te lleva entre 5 y 10 minutos.'],
  },
  {
    title: '¿Cuánto tarda la revisión de mi solicitud?',
    paragraphs: ['Las revisamos lo más rápido que podemos. Si pasó más de una semana y no recibiste respuesta, escribinos.'],
  },
  {
    title: 'Mi solicitud fue rechazada, ¿qué hago?',
    paragraphs: ['Recibís un email con el motivo y la fecha desde la que podés volver a aplicar. Si necesitás más contexto, escribinos.'],
  },
  {
    title: '¿Cómo edito mi perfil?',
    paragraphs: ['Por ahora, escribinos por email con los cambios y los aplicamos. Estamos trabajando en un panel propio.'],
  },
  {
    title: '¿Cuánto cuesta estar en Hara Vital?',
    paragraphs: ['El tier Básico es gratis. El tier Destacado es pago — aparecés más arriba y con un distintivo. Escribinos para el detalle de precios.'],
  },
  {
    title: '¿Cómo me llegan los clientes?',
    paragraphs: ['Te contactan directamente por WhatsApp cuando eligen tu perfil. No hay intermediarios.'],
  },
]

export default function QueEsHaraPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 container-public pt-8 pb-12">

        {/* Encabezado */}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
          Sobre Hara
        </p>
        <h1 className="text-3xl font-semibold text-foreground leading-tight mb-3">
          ¿Qué es Hara Vital?
        </h1>
        <p className="text-base text-muted leading-relaxed mb-6">
          Un espacio cuidado donde encontrás profesionales de bienestar verificados para acompañarte en lo que estás atravesando.
        </p>

        {/* TOC móvil — scroll horizontal */}
        <nav aria-label="Contenido" className="lg:hidden flex flex-wrap gap-x-4 gap-y-1 mb-6 pb-4 border-b border-outline/40">
          {TOC.map(item => (
            <a key={item.href} href={item.href} className="text-sm text-muted hover:text-foreground transition-colors">
              {item.label}
            </a>
          ))}
        </nav>

        {/* Layout documento: sidebar izquierdo + contenido derecho */}
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10 lg:items-start">

          {/* Sidebar — solo desktop, sticky */}
          <aside className="hidden lg:block sticky top-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-3">Contenido</p>
            <nav aria-label="Secciones">
              <ul className="space-y-0.5">
                {TOC.map(item => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block text-sm text-muted hover:text-foreground transition-colors py-1.5 pl-3 border-l-2 border-transparent hover:border-brand"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Contenido principal */}
          <div className="space-y-4">

            {/* ── Sección 1: Qué es Hara ─────────────────────────── */}
            <section id="producto" className="scroll-mt-8">
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
            </section>

            {/* ── Sección 2: Cómo funciona ───────────────────────── */}
            <section id="como-funciona" className="scroll-mt-8">
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
            </section>

            {/* ── Sección 3: Para quién es ────────────────────────── */}
            <section id="para-quien" className="scroll-mt-8">
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
            </section>

            {/* ── Sección 4: Diferencias ──────────────────────────── */}
            <section id="diferencias" className="scroll-mt-8">
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
            </section>

            {/* ── Sección 5: FAQ Usuarios ─────────────────────────── */}
            <section id="faq-usuarios" className="scroll-mt-8">
              <GlassCard>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Preguntas frecuentes — Usuarios
                </h2>
                <p className="text-sm text-muted leading-relaxed mb-4">
                  Las preguntas más frecuentes de quienes buscan acompañamiento.
                </p>
                <div className="divide-y divide-outline/60">
                  {FAQ_USUARIOS.map(item => (
                    <DisclosureItem key={item.title} {...item} />
                  ))}
                </div>
              </GlassCard>
            </section>

            {/* ── Sección 6: FAQ Profesionales ────────────────────── */}
            <section id="faq-profesionales" className="scroll-mt-8">
              <GlassCard>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Preguntas frecuentes — Profesionales
                </h2>
                <p className="text-sm text-muted leading-relaxed mb-4">
                  Si querés sumarte o ya estás en Hara Vital, esto te puede servir.
                </p>
                <div className="divide-y divide-outline/60">
                  {FAQ_PROFESIONALES.map(item => (
                    <DisclosureItem key={item.title} {...item} />
                  ))}
                </div>
              </GlassCard>
            </section>

            {/* ── Sección 7: Contacto ─────────────────────────────── */}
            <section id="contacto" className="scroll-mt-8">
              <GlassCard>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  ¿Necesitás escribirnos?
                </h2>
                <p className="text-sm text-muted leading-relaxed mb-5">
                  Por email o por Instagram. Te respondemos lo antes que podamos.
                </p>
                <div className="flex flex-col gap-3">
                  <a href="mailto:centrovitalhara@gmail.com" className="text-sm font-semibold text-brand hover:underline">
                    centrovitalhara@gmail.com
                  </a>
                  <a href="https://instagram.com/haravital" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">
                    @haravital en Instagram
                  </a>
                </div>
              </GlassCard>
            </section>

            {/* ── CTA final ───────────────────────────────────────── */}
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
    </div>
  )
}
