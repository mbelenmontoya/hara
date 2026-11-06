'use client'

// Frame of the "Soy profesional" application (design 12): header with progress,
// step title, the fixed bottom bar (hint, send error, Atrás / Continuar) and the "¡Solicitud enviada!" screen.

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, type ReactNode } from 'react'

export const STEP_LABELS = ['Datos', 'Perfil', 'Tarifas', 'Sobre vos'] as const

const STEP_TITLES: Array<[string, string, string]> = [
  ['Datos ', 'personales', 'Lo básico para que te encuentren y te puedan escribir.'],
  ['Perfil ', 'profesional', 'Qué hacés y para qué te buscan.'],
  ['Tarifas y ', 'disponibilidad', 'Todo es opcional. Lo podés completar más adelante.'],
  ['Sobre ', 'vos', 'Es lo que va a leer alguien antes de escribirte.'],
]

const LOGO = '/assets/logo/logoreduccion.png'
const COLUMN = 'mx-auto w-full max-w-md md:max-w-xl'

/** Logo, "SOY PROFESIONAL", the 4-part progress and the step title. `step` is 1 to 4. */
export function RegistroHeader({ step }: { step: number }) {
  const [plain, accent, sub] = STEP_TITLES[step - 1]
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [step])
  return (
    <div className="px-5 pt-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
        <Link href="/" className="justify-self-start py-2.5 text-[13.5px] font-medium text-brand-dark">
          ← Volver
        </Link>
        <Image src={LOGO} alt="Hara" width={66} height={53} className="h-[38px] w-auto object-contain" priority />
        <span />
      </div>
      <p className="almanac-label mb-0 mt-5 text-brand">Soy profesional</p>
      <ol className="mt-3 grid grid-cols-4 gap-[5px]" aria-label="Progreso">
        {STEP_LABELS.map((label, i) => (
          <li key={label} aria-current={i + 1 === step ? 'step' : undefined}>
            <span className={`block h-[3px] rounded-sm transition-colors duration-500 ${i + 1 <= step ? 'bg-brand' : 'bg-foreground/12'}`} />
            <span className={`mt-[7px] block text-[11px] font-medium ${i + 1 === step ? 'text-foreground' : 'text-gray-500'}`}>{label}</span>
          </li>
        ))}
      </ol>
      <p className="almanac-label mb-0 mt-6">PASO {step} DE 4</p>
      <h1 ref={heading} tabIndex={-1} className="font-almanac-serif mb-0 mt-2 text-[40px] leading-[1.02] outline-none">
        {plain}
        <span className="italic text-brand">{accent}</span>
      </h1>
      <p className="mt-2 text-[14.5px] leading-normal text-gray-700">{sub}</p>
    </div>
  )
}

interface BottomBarProps {
  step: number
  canContinue: boolean
  sending: boolean
  hint: string
  error: string | null
  onBack: () => void
  onNext: () => void
}

/** Fixed bar: the send error (or else the missing-field hint) above Atrás / Continuar. */
export function RegistroBottomBar({ step, canContinue, sending, hint, error, onBack, onNext }: BottomBarProps) {
  const isLast = step === 4
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-background/95 backdrop-blur-[16px]">
      <div className={`${COLUMN} flex flex-col gap-2.5 px-5 pb-8 pt-3`}>
        {error ? (
          <div role="alert" className="flex items-center gap-2.5 rounded-[14px] bg-danger-weak px-3.5 py-3">
            <span className="h-[18px] w-[18px] flex-none rounded-full bg-danger-dark text-center text-[12px] font-semibold leading-[18px] text-gray-50" aria-hidden="true">
              !
            </span>
            <p className="text-[13.5px] leading-[1.45] text-danger-dark">{error}</p>
          </div>
        ) : (
          hint && <p className="text-[12.5px] leading-[1.4] text-muted">{hint}</p>
        )}
        <div className="flex gap-2">
          {step > 1 && (
            <button type="button" onClick={onBack} className="rounded-2xl bg-surface-2 px-[18px] py-[15px] text-[15px] font-medium">
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue || sending}
            className="flex-1 rounded-2xl bg-brand-dark py-[15px] text-center text-[15px] font-medium text-gray-50 transition-colors duration-300 disabled:bg-brand-dark/30"
          >
            {isLast ? (sending ? 'Enviando...' : 'Enviar solicitud') : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Page column used by the form and the confirmation. */
export function RegistroColumn({ children }: { children: ReactNode }) {
  return <main className="font-almanac min-h-screen bg-background text-foreground"><div className={COLUMN}>{children}</div></main>
}

const NEXT_STEPS: Array<[string, string]> = [
  ['Revisamos tu perfil', 'Una persona del equipo lee todo lo que mandaste.'],
  ['Ya podés entrar con tu email y contraseña', 'Vas a ver tu perfil mientras lo revisamos. Lo editás cuando esté aprobado.'],
  ['Tu perfil se activa', 'Y empezás a recibir solicitudes.'],
]

/** "¡Solicitud enviada!" with the applicant's first name and email (design 12, sent state). */
export function RegistroSent({ name, email }: { name: string; email: string }) {
  const first = name.trim().split(' ')[0]
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  return (
    <RegistroColumn>
      <div className="px-6 pb-12 pt-6">
        <Image src={LOGO} alt="Hara" width={66} height={53} className="h-[38px] w-auto object-contain" priority />
        <p className="almanac-label mb-0 mt-11 text-brand">Soy profesional · Solicitud enviada</p>
        <h1 ref={heading} tabIndex={-1} className="font-almanac-serif mb-0 mt-3 text-[46px] leading-none outline-none">
          ¡Solicitud <span className="italic text-brand">enviada</span>!
        </h1>
        <p className="mt-3.5 text-[15.5px] leading-[1.6] text-gray-800">
          Gracias, {first}. Recibimos tu información y el equipo de Hara va a revisar tu perfil. Te escribimos a{' '}
          <span className="font-medium">{email.trim()}</span> en 24 a 48 horas.
        </p>
        <div className="relative mt-[30px] overflow-hidden rounded-[28px] bg-foreground px-[22px] py-6 text-background">
          <img src="/assets/almanac/orbita_punteada-cream.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -right-6 -top-4 h-[176px] w-[130px] opacity-50" />
          <h2 className="font-almanac-serif relative mb-0 text-[28px] leading-[1.05]">
            ¿Qué <span className="italic">sigue</span>?
          </h2>
          <ol className="relative mt-5">
            {NEXT_STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex flex-col items-center">
                  <span
                    className={`font-almanac-serif flex h-7 w-7 items-center justify-center rounded-full text-[16px] ${
                      i === 0 ? 'bg-brand-weak text-brand-dark' : 'border-[1.5px] border-background/35'
                    }`}
                  >
                    {i + 1}
                  </span>
                  {i < NEXT_STEPS.length - 1 && <span className="w-[1.5px] flex-1 bg-background/20" />}
                </span>
                <span className={`pt-[3px] ${i < NEXT_STEPS.length - 1 ? 'pb-5' : ''}`}>
                  <span className="block text-[15px] font-medium">{title}</span>
                  <span className="mt-[3px] block text-[13.5px] leading-[1.45] text-background/70">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-5 text-[13.5px] leading-normal text-gray-700">
          ¿Te equivocaste en algo? Respondé el email de confirmación y lo corregimos antes de publicar.
        </p>
        <div className="mt-5 flex gap-2">
          <Link href="/pro/login" className="flex-1 rounded-2xl bg-brand-dark py-[15px] text-center text-[15px] font-medium text-gray-50">
            Entrar a mi perfil
          </Link>
          <Link href="/" className="rounded-2xl bg-surface-2 px-[18px] py-[15px] text-[15px] font-medium">
            Volver a Hara
          </Link>
        </div>
      </div>
    </RegistroColumn>
  )
}
