// The bodies of the concierge form steps (/solicitar, almanac design 9a).
// Each step only renders the answers; the state, navigation and sending live in SolicitarForm.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { isValidPhoneNumber, type CountryCode } from 'libphonenumber-js'
import { PlacesAutocomplete, type PlaceData } from '@/app/components/PlacesAutocomplete'
import { SCHEDULE_OPTIONS, needsPlace, type ConciergeModality, type ConciergeState } from '@/lib/concierge-request'
import type { ArrivalCard as ArrivalCardData } from '@/lib/home-arrival'
import { ArrivalCard } from '../ArrivalCard'

const MODALITY_OPTIONS: { value: Exclude<ConciergeModality, ''>; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'ambos', label: 'Ambos' },
]

const CURRENCIES = ['ARS', 'USD', 'EUR', 'MXN'] as const

const SEEN_BEFORE_OPTIONS: { value: 'si' | 'no'; label: string }[] = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
]

export const URGENCY_OPTIONS: { value: 'low' | 'medium' | 'high'; label: string }[] = [
  { value: 'low', label: 'No es urgente, estoy explorando' },
  { value: 'medium', label: 'Me gustaría empezar pronto' },
  { value: 'high', label: 'Necesito ayuda lo antes posible' },
]

// Below this length the number is still being typed, so no error is shown yet.
const PHONE_CHECK_MIN_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const ALMANAC_INPUT_CLASS =
  'font-almanac w-full rounded-2xl bg-gray-50 p-[15px] text-base text-foreground outline-none shadow-[inset_0_0_0_1.5px] shadow-foreground/10 placeholder:text-muted focus:shadow-foreground/30'

export interface Situation {
  key: string
  label: string
}

export type ConciergeUpdate = (patch: Partial<ConciergeState>) => void

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function StepTitle({ children, subtitle }: { children: ReactNode; subtitle: string }) {
  return (
    <>
      <h1 className="font-almanac-serif mb-0 text-[40px]" style={{ lineHeight: 1.02, letterSpacing: '-0.5px' }}>
        {children}
      </h1>
      <div className="mt-2 text-[14.5px] leading-[1.5] text-gray-700">{subtitle}</div>
    </>
  )
}

export function SectionLabel({ children, className = 'mt-[22px]' }: { children: ReactNode; className?: string }) {
  return <h2 className={`almanac-label mb-0 ${className}`}>{children}</h2>
}

export function Chip({ label, isSelected, onToggle }: { label: string; isSelected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onToggle}
      className={`rounded-full border-[1.5px] px-[15px] py-[9px] text-[13.5px] font-medium transition-colors ${
        isSelected ? 'border-foreground bg-foreground text-background' : 'border-foreground/15 text-foreground'
      }`}
    >
      {label}
    </button>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[]
  value: T | ''
  onSelect: (value: T) => void
}) {
  return (
    <div className="mt-2.5 grid gap-[3px] rounded-[14px] bg-surface-2 p-[3px]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onSelect(opt.value)}
          className={`rounded-[11px] px-1 py-2.5 text-center text-[13.5px] font-medium ${
            value === opt.value ? 'bg-surface text-foreground shadow-soft' : 'text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface StepOneProps {
  state: ConciergeState
  cards: ArrivalCardData[]
  situations: Situation[]
  onChange: ConciergeUpdate
}

/** Step 1: "¿Cómo llegás?" cards and the optional "¿Qué está pasando?" chips, all saved as intents. */
export function StepOne({ state, cards, situations, onChange }: StepOneProps) {
  const pick = (key: string) => onChange({ intents: toggle(state.intents, key) })
  return (
    <>
      <StepTitle subtitle="Elegí lo que más se parezca. No tiene que ser exacto.">
        ¿Cómo <em className="text-brand">llegás</em>?
      </StepTitle>
      {cards.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {cards.map((card) => (
            <ArrivalCard key={card.key} card={card} isSelected={state.intents.includes(card.key)} onToggle={() => pick(card.key)} />
          ))}
        </div>
      )}
      {situations.length > 0 && (
        <>
          <SectionLabel className="mt-[26px]">¿Qué está pasando? · Opcional</SectionLabel>
          <div className="mt-2.5 flex flex-wrap gap-[7px]">
            {situations.map((s) => (
              <Chip key={s.key} label={s.label} isSelected={state.intents.includes(s.key)} onToggle={() => pick(s.key)} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

interface StepTwoProps {
  state: ConciergeState
  zonaText: string
  onZonaChange: (value: string, place?: PlaceData) => void
  onChange: ConciergeUpdate
}

/** Step 2: "¿Qué te acomoda?": format, area (only in person), schedule and budget. */
export function StepTwo({ state, zonaText, onZonaChange, onChange }: StepTwoProps) {
  return (
    <>
      <StepTitle subtitle="Solo te proponemos gente que cumpla con esto.">
        ¿Qué te <em className="text-brand">acomoda</em>?
      </StepTitle>

      <SectionLabel className="mt-6">Formato</SectionLabel>
      <Segmented options={MODALITY_OPTIONS} value={state.modality} onSelect={(modality) => onChange({ modality })} />

      {needsPlace(state.modality) && (
        <>
          <SectionLabel>Zona</SectionLabel>
          <div className="mt-2.5">
            <PlacesAutocomplete value={zonaText} onChange={onZonaChange} placeholder="Tu ciudad o barrio" className={ALMANAC_INPUT_CLASS} />
          </div>
        </>
      )}

      <SectionLabel>Horario · Elegí los que quieras</SectionLabel>
      <div className="mt-2.5 flex flex-wrap gap-[7px]">
        {SCHEDULE_OPTIONS.map((option) => (
          <Chip
            key={option}
            label={option}
            isSelected={state.schedule.includes(option)}
            onToggle={() => onChange({ schedule: toggle(state.schedule, option) })}
          />
        ))}
      </div>

      <SectionLabel>Presupuesto por sesión · Opcional</SectionLabel>
      <div className="mt-2.5 flex gap-2">
        <input
          inputMode="numeric"
          aria-label="Mínimo"
          placeholder="Mín"
          value={state.budgetMin}
          onChange={(e) => onChange({ budgetMin: e.target.value.replace(/\D/g, '') })}
          className={`${ALMANAC_INPUT_CLASS} min-w-0 flex-1`}
        />
        <input
          inputMode="numeric"
          aria-label="Máximo"
          placeholder="Máx"
          value={state.budgetMax}
          onChange={(e) => onChange({ budgetMax: e.target.value.replace(/\D/g, '') })}
          className={`${ALMANAC_INPUT_CLASS} min-w-0 flex-1`}
        />
        <select
          aria-label="Moneda"
          value={state.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
          className="font-almanac flex-none rounded-2xl bg-surface-2 px-3.5 text-base text-foreground outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </>
  )
}

/** Step 3: "Contanos.": their own words, whether they went to someone before, and how soon. */
export function StepThree({ state, onChange }: { state: ConciergeState; onChange: ConciergeUpdate }) {
  return (
    <>
      <StepTitle subtitle="Con tus palabras. Lo lee una persona del equipo, y nadie más.">
        <em className="text-brand">Contanos</em>.
      </StepTitle>
      <textarea
        aria-label="Con tus palabras"
        value={state.words}
        onChange={(e) => onChange({ words: e.target.value })}
        className={`${ALMANAC_INPUT_CLASS} mt-5 block min-h-[150px] resize-none leading-[1.55]`}
      />

      <SectionLabel className="mt-6">¿Fuiste con alguien antes?</SectionLabel>
      <Segmented options={SEEN_BEFORE_OPTIONS} value={state.seenBefore} onSelect={(seenBefore) => onChange({ seenBefore })} />

      <SectionLabel>¿Qué tan pronto?</SectionLabel>
      <div className="mt-2.5 flex flex-wrap gap-[7px]">
        {URGENCY_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            isSelected={state.urgency === opt.value}
            onToggle={() => onChange({ urgency: state.urgency === opt.value ? '' : opt.value })}
          />
        ))}
      </div>
    </>
  )
}

/** The message under the WhatsApp field, or null while it is empty, short or valid. */
function phoneError(state: ConciergeState): string | null {
  const { whatsapp, place } = state
  if (!whatsapp || whatsapp === '+') return null
  if (!whatsapp.startsWith('+')) return 'Debe empezar con + y el código de país'
  if (whatsapp.length < PHONE_CHECK_MIN_LENGTH) return null
  const isValid = place ? isValidPhoneNumber(whatsapp, place.countryCode as CountryCode) : isValidPhoneNumber(whatsapp)
  return isValid ? null : `El número no parece válido${place ? ` para ${place.country}` : ''}`
}

function emailError(email: string): string | null {
  return email && !EMAIL_PATTERN.test(email) ? 'El email no parece válido' : null
}

function Field({ id, label, error, children }: { id: string; label: string; error: string | null; children: ReactNode }) {
  return (
    <>
      <label htmlFor={id} className="almanac-label mt-[18px] block">{label}</label>
      <div className="mt-2.5">{children}</div>
      {error && <div className="mt-1.5 text-[12.5px] text-danger">{error}</div>}
    </>
  )
}

/** The "Tu solicitud" rows, each only when it was answered. */
function summaryRows(state: ConciergeState, intentLabels: string[]): { label: string; value: string }[] {
  const modality = MODALITY_OPTIONS.find((m) => m.value === state.modality)?.label
  const budget = [state.budgetMin, state.budgetMax].filter(Boolean).join(' a ')
  const urgency = URGENCY_OPTIONS.find((u) => u.value === state.urgency)?.label
  const rows = [
    { label: 'Cómo llegás', value: intentLabels.join(', ') },
    { label: 'Formato', value: modality ?? '' },
    { label: 'Zona', value: needsPlace(state.modality) ? state.place?.display ?? '' : '' },
    { label: 'Horario', value: state.schedule.join(', ') },
    { label: 'Presupuesto', value: budget ? `${budget} ${state.currency}` : '' },
    { label: 'Qué tan pronto', value: urgency ?? '' },
  ]
  return rows.filter((r) => r.value)
}

interface StepFourProps {
  state: ConciergeState
  intentLabels: string[]
  onChange: ConciergeUpdate
  onEdit: () => void
}

/** Step 4: "¿Dónde te escribimos?": name, WhatsApp, email, the summary and the privacy consent. */
export function StepFour({ state, intentLabels, onChange, onEdit }: StepFourProps) {
  return (
    <>
      <StepTitle subtitle="Por WhatsApp, solo para mandarte tus tres opciones.">
        ¿Dónde te <em className="text-brand">escribimos</em>?
      </StepTitle>

      <Field id="concierge-name" label="Tu nombre" error={null}>
        <input
          id="concierge-name"
          autoComplete="given-name"
          placeholder="Como quieras que te llamemos"
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={ALMANAC_INPUT_CLASS}
        />
      </Field>
      <Field id="concierge-whatsapp" label="WhatsApp" error={phoneError(state)}>
        <input
          id="concierge-whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+54 9 11 1234 5678"
          value={state.whatsapp}
          onChange={(e) => onChange({ whatsapp: e.target.value })}
          className={ALMANAC_INPUT_CLASS}
        />
      </Field>
      <Field id="concierge-email" label="Email" error={emailError(state.email)}>
        <input
          id="concierge-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={state.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={ALMANAC_INPUT_CLASS}
        />
      </Field>

      <section aria-labelledby="concierge-summary" className="mt-6 rounded-[22px] bg-gray-50 p-[18px]">
        <div className="flex items-baseline justify-between">
          <h2 id="concierge-summary" className="almanac-label mb-0">Tu solicitud</h2>
          <button type="button" onClick={onEdit} className="text-[13px] font-medium text-brand-dark">Editar</button>
        </div>
        <dl className="mb-0 mt-2">
          {summaryRows(state, intentLabels).map((row) => (
            <div key={row.label} className="flex justify-between gap-3.5 border-b border-foreground/8 py-[9px] text-sm leading-[1.4]">
              <dt className="flex-none text-muted">{row.label}</dt>
              <dd className="m-0 text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-[18px] flex items-start gap-3">
        <input
          id="concierge-consent"
          type="checkbox"
          checked={state.consent}
          onChange={(e) => onChange({ consent: e.target.checked })}
          className="mt-0.5 h-[22px] w-[22px] flex-none accent-foreground"
        />
        <div className="text-[13.5px] leading-[1.5] text-gray-700">
          <label htmlFor="concierge-consent">Acepto que Hara use estos datos solo para recomendarme profesionales.</label>{' '}
          <Link href="/terminosyprivacidad" className="text-brand-dark underline">Ver privacidad</Link>
        </div>
      </div>
    </>
  )
}
