// Página unificada: Qué es Hara + Ayuda (FAQ + contacto), en el diseño almanaque.
// El contenido vive acá; las preguntas se muestran con AyudaFaq (chips por categoría + acordeón).

import Link from 'next/link'
import { AyudaFaq } from './AyudaFaq'

export const metadata = {
  title: 'Qué es Hara | Hara Vital',
  description: 'Conocé la misión, visión y cómo funciona Hara Vital — el espacio donde encontrás profesionales de bienestar verificados para acompañarte en lo que estás atravesando.',
}

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
    paragraphs: ['En /registro. El formulario tiene 4 pasos y te lleva entre 5 y 10 minutos.'],
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

const BODY = 'font-almanac text-[15px] leading-[1.65] text-gray-800'
const HEADING = 'font-almanac-serif block text-[19px] leading-[1.2] text-foreground'
const SUBTITLE = 'font-almanac block text-[15px] font-medium text-foreground'
const LINK = 'font-medium text-brand-dark underline underline-offset-2'

const DIFFERENCES = [
  { title: 'Solo profesionales verificados', text: 'No cualquiera aparece en Hara. Cada perfil pasa por una revisión antes de publicarse.' },
  { title: 'Reseñas de interacciones reales', text: 'Los links de reseña solo llegan a personas que efectivamente contactaron a un profesional. No hay spam anónimo ni estrellas compradas.' },
  { title: 'Tu privacidad, primero', text: 'Tu información se comparte recién cuando vos escribís. Hasta ese momento, nadie ve tus datos.' },
]

// "¿Qué es Hara Vital?" is one more question of the list; its answer holds all the About-Hara text.
const QUE_ES_HARA = (
  <div className="space-y-6">
    <span className={`${BODY} block`}>
      Un espacio cuidado donde encontrás profesionales de bienestar verificados para acompañarte en lo que estás atravesando.
    </span>

    <div>
      <span className={HEADING}>El producto es la confianza</span>
      <div className="mt-2 space-y-3">
        <p className={BODY}>
          Hara Vital es un marketplace curado de <span className="font-medium text-foreground">terapias alternativas y bienestar holístico</span> para el mundo hispanohablante. Reiki, masajes terapéuticos, constelaciones familiares, diseño humano, registros akáshicos, terapia floral, terapia energética, meditación, y más.
        </p>
        <p className={BODY}>
          Es la capa de confianza entre personas que están atravesando algo concreto — ansiedad, insomnio, duelo, estrés, búsqueda de claridad — y los profesionales que pueden acompañarlas desde otro lugar. La brújula no es la modalidad, es lo que estás sintiendo: si no podés dormir, podés llegar al masaje, al reiki o a las constelaciones. Lo que importa es que la persona que encontrás sea real, verificada, y confiable.
        </p>
      </div>
    </div>

    <div>
      <span className={HEADING}>Cómo funciona</span>
      <span className={`${BODY} mt-2 block`}>
        Dos caminos, los dos terminan igual: en una conversación directa por WhatsApp, en tu tiempo, con tu información.
      </span>
      <div className="mt-3 space-y-4">
        <div>
          <span className={SUBTITLE}>Explorá el directorio</span>
          <p className={`${BODY} mt-1`}>
            El camino principal. Entrás, navegás los perfiles ordenados por reputación, encontrás alguien que resuene, y le escribís por WhatsApp. Es rápido, es directo, y tu información no se comparte hasta que vos abrís la conversación.{' '}
            <Link href="/" className={LINK}>
              Ir al directorio →
            </Link>
          </p>
        </div>
        <div>
          <span className={SUBTITLE}>Pedí una recomendación personalizada</span>
          <p className={`${BODY} mt-1`}>
            Si preferís que alguien elija por vos: contanos qué estás atravesando, qué modalidad te interesa, dónde estás y cuánto podés invertir. Revisamos tu solicitud y te mandamos un link con tres profesionales elegidos a mano para tu situación.{' '}
            <Link href="/solicitar" className={LINK}>
              Pedir recomendación →
            </Link>
          </p>
        </div>
      </div>
    </div>

    <div>
      <span className={HEADING}>Para quién es</span>
      <div className="mt-3 space-y-4">
        <div>
          <span className={SUBTITLE}>Personas que buscan acompañamiento</span>
          <p className={`${BODY} mt-1`}>
            Adultos en Argentina y el mundo hispanohablante que están atravesando algo concreto — ansiedad, insomnio, duelo, estrés, agotamiento, una búsqueda de claridad — y están abiertos a terapias alternativas y bienestar holístico. Los que buscaron en Google o en Instagram y se perdieron entre 50 opciones sin saber cuál era confiable. Para quienes la confianza es la barrera número uno antes de abrir una conversación con alguien.
          </p>
        </div>
        <div>
          <span className={SUBTITLE}>Profesionales del bienestar</span>
          <p className={`${BODY} mt-1`}>
            Practicantes independientes de terapias alternativas y bienestar holístico que quieren ser descubiertos, construir reputación basada en interacciones reales, y que la plataforma maneje la visibilidad para que ellas puedan enfocarse en el trabajo. Si querés sumarte,{' '}
            <Link href="/registro" className={LINK}>
              registrate acá →
            </Link>
          </p>
        </div>
      </div>
    </div>

    <div>
      <span className={HEADING}>Qué nos hace diferentes</span>
      <div className="mt-2 space-y-3">
        {DIFFERENCES.map((d) => (
          <div key={d.title} className="flex gap-3">
            <span className="mt-0.5 shrink-0 text-brand" aria-hidden="true">✓</span>
            <div>
              <span className={SUBTITLE}>{d.title}</span>
              <span className={`${BODY} mt-0.5 block`}>{d.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const FAQ_GROUPS = [
  {
    id: 'usuarios',
    label: 'Para quien busca ayuda',
    intro: 'Las preguntas más frecuentes de quienes buscan acompañamiento.',
    items: [{ title: '¿Qué es Hara Vital?', content: QUE_ES_HARA }, ...FAQ_USUARIOS],
  },
  {
    id: 'profesionales',
    label: 'Para profesionales',
    intro: 'Si querés sumarte o ya estás en Hara Vital, esto te puede servir.',
    items: FAQ_PROFESIONALES,
  },
]

export default function QueEsHaraPage() {
  return (
    <main className="min-h-screen bg-background font-almanac text-foreground">
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-8 md:max-w-2xl">
        <h1 className="font-almanac-serif text-[40px] leading-[1.02] tracking-tight">Preguntas</h1>

        <div className="mt-5">
          <AyudaFaq groups={FAQ_GROUPS} />
        </div>

        {/* ── Contacto ────────────────────────────────────────── */}
        <section id="contacto" className="relative mt-10 overflow-hidden rounded-[26px] bg-foreground p-[22px] text-background">
          <img
            src="/assets/almanac/orbita_punteada-cream.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-[26px] -top-[18px] h-[160px] w-[118px] object-contain opacity-45"
          />
          <span className="font-almanac block text-[10.5px] font-medium uppercase tracking-[0.21em] text-brand-weak">
            ¿No está aquí?
          </span>
          <h2 className="font-almanac-serif mt-2.5 max-w-[240px] text-[26px] leading-[1.1]">
            Preguntale a una <em>persona</em>.
          </h2>
          <span className="font-almanac mt-2 block max-w-[260px] text-sm leading-normal text-background/80">
            Por email o por Instagram. Te respondemos lo antes que podamos.
          </span>
          <div className="mt-4 flex flex-col gap-2.5">
            <a
              href="mailto:centrovitalhara@gmail.com"
              className="font-almanac inline-flex w-fit rounded-[13px] bg-brand-weak px-[18px] py-[11px] text-sm font-medium text-brand-dark transition-opacity hover:opacity-90"
            >
              centrovitalhara@gmail.com
            </a>
            <a
              href="https://instagram.com/haravital"
              target="_blank"
              rel="noopener noreferrer"
              className="font-almanac inline-flex w-fit rounded-[13px] border-[1.5px] border-background/30 px-[18px] py-[10px] text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              @haravital en Instagram
            </a>
          </div>
        </section>

        {/* ── CTA final ───────────────────────────────────────── */}
        <div className="mt-8 flex flex-col gap-3.5">
          <Link
            href="/"
            className="font-almanac rounded-2xl bg-brand-dark px-5 py-3.5 text-center text-[15px] font-medium text-gray-50 transition-opacity hover:opacity-90"
          >
            Explorar profesionales
          </Link>
          <Link href="/solicitar" className="font-almanac text-center text-sm font-medium text-brand-dark">
            O pedí una recomendación personalizada →
          </Link>
        </div>
      </div>
    </main>
  )
}
