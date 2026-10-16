// Shown in place of the concierge form after a successful send (/solicitar, almanac design 9b):
// the request number, where we will write, what happens next, and the latest Diario post.

import Image from 'next/image'
import Link from 'next/link'
import type { ConciergeLatestPost } from '@/lib/concierge-request'

// Same length the admin uses for "Solicitud {id}".
const REQUEST_NUMBER_LENGTH = 8

interface NextStep {
  title: string
  when: string | null
  text: string | null
}

const NEXT_STEPS: NextStep[] = [
  { title: 'Recibimos tu solicitud', when: 'Ahora', text: null },
  {
    title: 'La lee una persona del equipo',
    when: null,
    text: 'No es un algoritmo: es alguien que conoce a los profesionales y elige las tres opciones que mejor encajan con vos.',
  },
  {
    title: 'Te mandamos tus tres',
    when: 'En menos de 48 h',
    text: 'Un link por WhatsApp con sus perfiles, su experiencia y sus reseñas. Tomate el tiempo que necesites para comparar.',
  },
  {
    title: 'Vos elegís y les escribís',
    when: 'Cuando quieras',
    text: 'Tu información no se comparte hasta que vos abrís la conversación.',
  },
]

function StepMarker({ isDone }: { isDone: boolean }) {
  if (isDone) {
    return (
      <span role="img" aria-label="Hecho" className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-[10px] font-semibold text-gray-50">
        ✓
      </span>
    )
  }
  return <span className="h-4 w-4 rounded-full border-[1.5px] border-foreground/25" aria-hidden="true" />
}

interface ConciergeConfirmationProps {
  leadId: string
  name: string
  whatsapp: string
  latestPost: ConciergeLatestPost | null
}

export function ConciergeConfirmation({ leadId, name, whatsapp, latestPost }: ConciergeConfirmationProps) {
  const requestNumber = leadId.slice(0, REQUEST_NUMBER_LENGTH).toUpperCase()
  return (
    <main className="font-almanac min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-md pb-16 pt-6 md:max-w-xl">
        <div className="px-4">
          <div className="flex justify-center pb-4">
            <Image src="/assets/logo/logoreduccion.png" alt="Hara" width={66} height={53} className="h-10 w-auto object-contain" />
          </div>
          <section className="relative overflow-hidden rounded-[30px] bg-foreground px-[22px] pb-6 pt-[26px] text-background">
            <img
              src="/assets/almanac/orbita_punteada-cream.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-[30px] -top-6 h-[205px] w-[150px] object-contain opacity-50"
            />
            <p className="mb-0 text-[10.5px] font-medium uppercase tracking-[0.21em] text-brand-weak">Solicitud {requestNumber}</p>
            <h1 className="font-almanac-serif relative mb-0 mt-3 max-w-[270px] text-[36px]" style={{ lineHeight: 1.04, letterSpacing: 0 }}>
              Listo, <em>{name.trim()}</em>.
            </h1>
            <div className="mt-3.5 flex items-center gap-3">
              <img src="/assets/almanac/tres_puntos-cream.svg" alt="" aria-hidden="true" className="h-[27px] w-7 flex-none object-contain" />
              <span className="text-sm leading-[1.45] text-background/80">Te escribimos al {whatsapp} en menos de 48 horas.</span>
            </div>
          </section>
        </div>

        <div className="px-6 pt-[30px]">
          <h2 id="concierge-next" className="font-almanac-serif mb-0 text-[28px]" style={{ lineHeight: 1.05, letterSpacing: 0 }}>
            Lo que <em>sigue</em>
          </h2>
          <ol aria-labelledby="concierge-next" className="mb-0 mt-5 list-none p-0">
            {NEXT_STEPS.map((step, i) => {
              const isDone = i === 0
              const isLast = i === NEXT_STEPS.length - 1
              return (
                <li key={step.title} className="flex gap-4">
                  <div className="flex w-4 flex-none flex-col items-center pt-[3px]">
                    <StepMarker isDone={isDone} />
                    {!isLast && <span className="mt-1.5 w-[1.5px] flex-1 bg-foreground/14" aria-hidden="true" />}
                  </div>
                  <div className={`flex-1 ${isLast ? '' : 'pb-6'}`}>
                    <div className="flex items-baseline justify-between gap-2.5">
                      <h3
                        className={`font-almanac-serif mb-0 text-[21px] ${isDone ? 'text-foreground' : 'text-gray-700'}`}
                        style={{ lineHeight: 1.15, letterSpacing: 0 }}
                      >
                        {step.title}
                      </h3>
                      {step.when && <span className="flex-none text-[10.5px] font-medium uppercase tracking-[0.15em] text-muted">{step.when}</span>}
                    </div>
                    {step.text && <div className="mt-1 text-[13.5px] leading-[1.5] text-gray-700">{step.text}</div>}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {latestPost && (
          <div className="px-6 pt-7">
            <h2 className="almanac-label mb-0">Mientras tanto</h2>
            <Link href={`/blog/${latestPost.slug}`} className="mt-3 flex items-center gap-3.5">
              <span className="relative h-[84px] w-[74px] flex-none overflow-hidden rounded-[14px] bg-surface-2">
                {latestPost.coverUrl && <img src={latestPost.coverUrl} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="flex-1">
                <span className="font-almanac-serif block text-[20px] leading-[1.12]">{latestPost.title}</span>
                <span className="mt-1.5 block text-[12.5px] text-muted">En el Diario · {latestPost.minutes} min</span>
              </span>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
