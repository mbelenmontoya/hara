'use client'

// Concierge request form (/solicitar, almanac design 9a): four steps with a progress bar
// and an Atrás / Continuar bar. Holds the answers and the navigation; the step bodies live in ConciergeSteps.

import { useState } from 'react'
import Link from 'next/link'
import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js'
import { createLead } from '@/app/actions/create-lead'
import type { PlaceData } from '@/app/components/PlacesAutocomplete'
import {
  EMPTY_CONCIERGE_STATE,
  isStepComplete,
  toLeadInput,
  type ConciergeLatestPost,
  type ConciergeState,
  type ConciergeStep,
} from '@/lib/concierge-request'
import type { ArrivalCard as ArrivalCardData } from '@/lib/home-arrival'
import { ConciergeConfirmation } from './ConciergeConfirmation'
import { StepFour, StepOne, StepThree, StepTwo, type Situation } from './ConciergeSteps'

const STEP_COUNT = 4
const STEPS: ConciergeStep[] = [1, 2, 3, 4]

export interface SolicitarFormProps {
  cards: ArrivalCardData[]
  situations: Situation[]
  latestPost: ConciergeLatestPost | null
}

/** Calling code prefix ("+54") for a place's country, or null when the code is unknown. */
function callingCodePrefix(countryCode: string): string | null {
  try {
    return `+${getCountryCallingCode(countryCode as CountryCode)}`
  } catch {
    return null
  }
}

export function SolicitarForm({ cards, situations, latestPost }: SolicitarFormProps) {
  const [state, setState] = useState<ConciergeState>(EMPTY_CONCIERGE_STATE)
  const [step, setStep] = useState<ConciergeStep>(1)
  const [zonaText, setZonaText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [leadId, setLeadId] = useState<string | null>(null)

  const update = (patch: Partial<ConciergeState>) => setState((prev) => ({ ...prev, ...patch }))

  function goTo(next: ConciergeStep) {
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  function handleZonaChange(value: string, place?: PlaceData) {
    setZonaText(place ? place.formattedAddress : value)
    if (!place) {
      update({ place: null })
      return
    }
    const prefix = callingCodePrefix(place.countryCode)
    setState((prev) => ({
      ...prev,
      place: { city: place.city, country: place.country, countryCode: place.countryCode, display: place.formattedAddress },
      whatsapp: prefix && (!prev.whatsapp || prev.whatsapp === '+') ? prefix : prev.whatsapp,
    }))
  }

  async function send() {
    setSendError(null)
    setSending(true)
    try {
      const { lead_id } = await createLead(toLeadInput(state))
      setLeadId(lead_id)
      window.scrollTo({ top: 0 })
    } catch {
      setSendError('Hubo un error. Intentá de nuevo.')
    } finally {
      setSending(false)
    }
  }

  if (leadId) {
    return <ConciergeConfirmation leadId={leadId} name={state.name} whatsapp={state.whatsapp} latestPost={latestPost} />
  }

  const labelByKey = new Map([...cards, ...situations].map((c) => [c.key, c.label]))
  const intentLabels = state.intents.map((key) => labelByKey.get(key) ?? key)
  const isLastStep = step === STEP_COUNT
  const canContinue = isStepComplete(state, step) && !sending

  return (
    <main className="font-almanac min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-md px-5 pt-6 md:max-w-xl">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-[22px] font-light">
            ×
          </Link>
          <span className="almanac-label">Concierge · Gratis</span>
          <span className="w-10" aria-hidden="true" />
        </div>
        <div className="mt-5 flex gap-[5px]" aria-hidden="true">
          {STEPS.map((n) => (
            <span key={n} className={`h-[3px] flex-1 rounded-sm transition-colors duration-500 ${n <= step ? 'bg-foreground' : 'bg-foreground/12'}`} />
          ))}
        </div>
        <p className="almanac-label mb-0 mt-3">Paso {step} de {STEP_COUNT}</p>

        <div className="pb-36 pt-5">
          {step === 1 && <StepOne state={state} cards={cards} situations={situations} onChange={update} />}
          {step === 2 && <StepTwo state={state} zonaText={zonaText} onZonaChange={handleZonaChange} onChange={update} />}
          {step === 3 && <StepThree state={state} onChange={update} />}
          {step === 4 && <StepFour state={state} intentLabels={intentLabels} onChange={update} onEdit={() => goTo(1)} />}
          {sendError && (
            <p role="alert" className="mb-0 mt-4 text-[13.5px] text-danger">
              {sendError}
            </p>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-foreground/10 bg-background/94 backdrop-blur-[16px]">
        <div className="mx-auto flex w-full max-w-md gap-2 px-5 pb-8 pt-3 md:max-w-xl">
          {step > 1 && (
            <button
              type="button"
              onClick={() => goTo((step - 1) as ConciergeStep)}
              className="rounded-2xl bg-surface-2 px-[18px] py-[15px] text-[15px] font-medium"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => (isLastStep ? send() : goTo((step + 1) as ConciergeStep))}
            className="flex-1 rounded-2xl bg-foreground py-[15px] text-center text-[15px] font-medium text-gray-50 transition-colors duration-300 disabled:bg-foreground/25"
          >
            {isLastStep ? (sending ? 'Enviando...' : 'Enviar solicitud') : 'Continuar'}
          </button>
        </div>
      </div>
    </main>
  )
}
