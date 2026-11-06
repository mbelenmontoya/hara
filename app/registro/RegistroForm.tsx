// "Soy profesional" application (design 12): four steps, then the confirmation in place.
// Sending creates the professional and their account (email + password, role professional).

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AsYouType, isValidPhoneNumber, parsePhoneNumberFromString, getCountryCallingCode, type CountryCode } from 'libphonenumber-js'
import type { PlaceData } from '@/app/components/PlacesAutocomplete'
import type { Practice } from '@/lib/practices'
import { RegistroBottomBar, RegistroColumn, RegistroHeader, RegistroSent } from './components/RegistroShell'
import { StepAbout, StepPersonal, StepPricing, StepProfile, type RegistroData, type RegistroUpdate } from './components/RegistroSteps'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PASSWORD_MIN = 8
const BIO_MIN = 50
// Below this many digits the number is still being typed, so no error yet
const PHONE_CHECK_MIN_DIGITS = 6
const INSTAGRAM_PATTERN = /^[a-zA-Z0-9._]{1,30}$/

const INITIAL: RegistroData = {
  full_name: '', email: '', password: '', whatsapp: '', instagram: '', country: '', city: '',
  latitude: null, longitude: null, modality: [], specialties: [], practices: [], service_type: [],
  price_range_min: '', price_range_max: '', currency: 'ARS', accepting_new_clients: true,
  short_description: '', bio: '', experience_description: '', profile_image: null,
}

function fullPhone(local: string, country: CountryCode): string {
  return `+${getCountryCallingCode(country)}${local.replace(/\D/g, '')}`
}

function priceInvalid(d: RegistroData): boolean {
  return !!d.price_range_min && !!d.price_range_max && Number(d.price_range_min) > Number(d.price_range_max)
}

/** Why the current step cannot continue yet, or '' when it can (design 12 hints, plus the password). */
function stepHint(d: RegistroData, step: number, phoneOk: boolean): string {
  if (step === 1) {
    if (d.password && d.password.length < PASSWORD_MIN) return `La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres.`
    if (d.password.length > 72) return 'La contraseña puede tener hasta 72 caracteres.'
    const ok = d.full_name.trim().length > 1 && EMAIL_PATTERN.test(d.email.trim()) && d.password.length >= PASSWORD_MIN && !!d.country && phoneOk
    return ok ? '' : 'Completá nombre, email, contraseña, ciudad y WhatsApp para seguir.'
  }
  if (step === 2) return d.modality.length && d.specialties.length ? '' : 'Elegí la modalidad y al menos una especialidad.'
  if (step === 3) return priceInvalid(d) ? 'Revisá los precios.' : ''
  return d.bio.trim().length >= BIO_MIN ? '' : `Contá un poco más sobre vos: mínimo ${BIO_MIN} caracteres.`
}

function buildPayload(d: RegistroData, country: CountryCode): FormData {
  const payload = new FormData()
  const phone = fullPhone(d.whatsapp, country)
  const parsed = parsePhoneNumberFromString(phone)
  const text: Record<string, string> = {
    full_name: d.full_name.trim(), email: d.email.trim(), password: d.password,
    whatsapp: parsed ? parsed.format('E.164') : phone, instagram: d.instagram, country: d.country, city: d.city,
    latitude: d.latitude != null ? String(d.latitude) : '', longitude: d.longitude != null ? String(d.longitude) : '',
    online_only: 'false', price_range_min: d.price_range_min, price_range_max: d.price_range_max, currency: d.currency,
    accepting_new_clients: String(d.accepting_new_clients), short_description: d.short_description, bio: d.bio,
    experience_description: d.experience_description,
  }
  for (const [k, v] of Object.entries(text)) payload.append(k, v)
  for (const k of ['modality', 'specialties', 'practices', 'service_type'] as const) payload.append(k, JSON.stringify(d[k]))
  if (d.profile_image) payload.append('profile_image', d.profile_image)
  return payload
}

export function RegistroForm({ practices }: { practices: Practice[] }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<RegistroData>(INITIAL)
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('AR')
  const [emailTouched, setEmailTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const update: RegistroUpdate = (field, value) => setData((prev) => ({ ...prev, [field]: value }))

  const digits = data.whatsapp.replace(/\D/g, '')
  const phoneOk = digits.length >= PHONE_CHECK_MIN_DIGITS && isValidPhoneNumber(fullPhone(data.whatsapp, phoneCountry))
  const emailError = emailTouched && data.email && !EMAIL_PATTERN.test(data.email.trim()) ? 'Revisá el email: parece que le falta algo.' : null
  const phoneError = phoneTouched && data.whatsapp && !phoneOk ? 'Revisá el número: no parece un WhatsApp válido para ese país.' : null
  const instagramError = data.instagram && !INSTAGRAM_PATTERN.test(data.instagram) ? 'No parece un usuario de Instagram válido.' : null
  const hint = stepHint(data, step, phoneOk)
  const canContinue = !hint && !(step === 1 && instagramError)

  function onPhone(value: string, country?: CountryCode) {
    const active = country ?? phoneCountry
    if (country) setPhoneCountry(country)
    update('whatsapp', new AsYouType(active).input(value))
  }

  function onCity(value: string, place?: PlaceData) {
    if (!place) {
      setData((prev) => ({ ...prev, city: value, country: '', latitude: null, longitude: null }))
      return
    }
    setData((prev) => ({ ...prev, city: place.city, country: place.countryCode, latitude: place.lat ?? null, longitude: place.lng ?? null }))
    setPhoneCountry(place.countryCode as CountryCode)
  }

  function onInstagram(value: string) {
    const user = value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '').replace(/\/+$/, '').split('?')[0]
    update('instagram', user)
  }

  function go(next: number) {
    setError(null)
    setStep(next)
    window.scrollTo?.({ top: 0 })
  }

  async function send() {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/professionals/register', { method: 'POST', body: buildPayload(data, phoneCountry) })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? 'No pudimos enviar tu solicitud. Revisá tu conexión e intentá de nuevo.')
        return
      }
      setSent(true)
      window.scrollTo?.({ top: 0 })
    } catch {
      setError('No pudimos enviar tu solicitud. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setSending(false)
    }
  }

  if (sent) return <RegistroSent name={data.full_name} email={data.email} />

  return (
    <RegistroColumn>
      <RegistroHeader step={step} />
      <div className="px-3.5">
        {step === 1 && (
          <StepPersonal
            data={data}
            update={update}
            phoneCountry={phoneCountry}
            emailError={emailError}
            phoneError={phoneError}
            instagramError={instagramError}
            onEmailBlur={() => setEmailTouched(true)}
            onPhone={onPhone}
            onPhoneBlur={() => setPhoneTouched(true)}
            onInstagram={onInstagram}
            onCity={onCity}
          />
        )}
        {step === 2 && <StepProfile data={data} update={update} practices={practices} />}
        {step === 3 && <StepPricing data={data} update={update} priceError={priceInvalid(data)} />}
        {step === 4 && <StepAbout data={data} update={update} />}
      </div>
      <p className="px-[22px] pb-[190px] pt-[18px] text-[12.5px] leading-normal text-muted">
        Al enviar este formulario, aceptás nuestros{' '}
        <Link href="/terminosyprivacidad" className="text-brand-dark underline">
          términos y privacidad
        </Link>
        .
      </p>
      <RegistroBottomBar
        step={step}
        canContinue={canContinue}
        sending={sending}
        hint={error ? '' : hint}
        error={error}
        onBack={() => go(step - 1)}
        onNext={() => (step < 4 ? go(step + 1) : send())}
      />
    </RegistroColumn>
  )
}
