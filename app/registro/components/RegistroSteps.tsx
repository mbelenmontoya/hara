// The four step bodies of the "Soy profesional" application (design 12), each one cream card of fields.
// Presentational: RegistroForm owns the state, validation and submit.

'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js'
import { PlacesAutocomplete, type PlaceData } from '@/app/components/PlacesAutocomplete'
import { SpecialtySelector } from '@/app/registro/components/SpecialtySelector'
import type { Practice } from '@/lib/practices'

export interface RegistroData {
  full_name: string
  email: string
  password: string
  whatsapp: string
  instagram: string
  country: string
  city: string
  latitude: number | null
  longitude: number | null
  modality: string[]
  specialties: string[]
  practices: string[]
  service_type: string[]
  price_range_min: string
  price_range_max: string
  currency: string
  accepting_new_clients: boolean
  short_description: string
  bio: string
  experience_description: string
  profile_image: File | null
}

export type RegistroUpdate = <K extends keyof RegistroData>(field: K, value: RegistroData[K]) => void

export const FIELD = 'w-full rounded-[14px] bg-background px-3.5 py-[13px] text-base text-foreground focus-visible:ring-2 focus-visible:ring-brand outline-none placeholder:text-gray-500'
const CARD = 'mt-5 flex flex-col gap-[22px] rounded-3xl bg-gray-50 px-[18px] py-5'
const HELP = 'text-[12.5px] leading-[1.45] text-muted'
const ERROR = 'text-[12.5px] leading-[1.45] text-danger-dark'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export const PHONE_COUNTRIES: CountryCode[] = [
  'AR', 'MX', 'CO', 'CL', 'PE', 'UY', 'BR', 'EC', 'VE', 'BO', 'PY', 'CR', 'PA', 'DO', 'GT', 'HN', 'SV', 'NI', 'CU',
  'ES', 'PT', 'FR', 'IT', 'DE', 'GB', 'NL', 'BE', 'CH', 'AT', 'IE', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'RO', 'GR', 'HR', 'US',
]

function Field({ label, htmlFor, required, optional, children }: { label: string; htmlFor?: string; required?: boolean; optional?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="flex items-baseline gap-1.5 text-[14px] font-medium">
        {label}
        {required && <span className="text-brand">*</span>}
        {optional && <span className="text-[12px] font-normal text-gray-500">Opcional</span>}
      </label>
      {children}
    </div>
  )
}

/** Dark-selected segmented control (modality, currency). */
function Segmented({ options, value, onPick }: { options: Array<{ value: string; label: string }>; value: string; onPick: (v: string) => void }) {
  return (
    <div className="grid gap-[3px] rounded-[14px] bg-surface-2 p-[3px]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onPick(o.value)}
          className={`rounded-[11px] px-1 py-2.5 text-center text-[13.5px] font-medium ${value === o.value ? 'bg-foreground text-background' : 'text-gray-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface PersonalProps {
  data: RegistroData
  update: RegistroUpdate
  phoneCountry: CountryCode
  emailError: string | null
  phoneError: string | null
  instagramError: string | null
  onEmailBlur: () => void
  onPhone: (value: string, country?: CountryCode) => void
  onPhoneBlur: () => void
  onInstagram: (value: string) => void
  onCity: (value: string, place?: PlaceData) => void
}

export function StepPersonal(p: PersonalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const { data, update } = p
  return (
    <div className={CARD}>
      <Field label="Nombre completo" htmlFor="reg-name" required>
        <input id="reg-name" value={data.full_name} onChange={(e) => update('full_name', e.target.value)} placeholder="Ej: María García López" className={FIELD} />
      </Field>
      <Field label="Email" htmlFor="reg-email" required>
        <input id="reg-email" type="email" inputMode="email" autoComplete="email" aria-invalid={!!p.emailError} aria-describedby={p.emailError ? 'reg-email-error' : undefined} value={data.email} onChange={(e) => update('email', e.target.value)} onBlur={p.onEmailBlur} placeholder="tu@email.com" className={`${FIELD} ${p.emailError ? 'shadow-[inset_0_0_0_1.5px] shadow-danger-dark' : ''}`} />
        {p.emailError && <p id="reg-email-error" className={ERROR}>{p.emailError}</p>}
      </Field>
      <Field label="Contraseña" htmlFor="reg-password" required>
        <div className="flex items-center rounded-[14px] bg-background pr-2">
          <input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72} aria-describedby="reg-password-help" value={data.password} onChange={(e) => update('password', e.target.value)} placeholder="Mínimo 8 caracteres" className={`${FIELD} min-w-0 flex-1`} />
          <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)} className="px-2 text-[13px] font-medium text-brand-dark">
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <p id="reg-password-help" className={HELP}>La vas a usar para entrar a tu perfil.</p>
      </Field>
      <Field label="Ubicación" htmlFor="reg-city" required>
        <PlacesAutocomplete id="reg-city" value={data.city} onChange={p.onCity} placeholder="Buscar ciudad..." className={FIELD} />
        <p className={HELP}>Empezá a escribir y seleccioná tu ciudad</p>
      </Field>
      <Field label="Dirección exacta" htmlFor="reg-address" optional>
        <PlacesAutocomplete
          id="reg-address"
          value=""
          onChange={(_v, place) => {
            if (!place) return
            update('latitude', place.lat ?? null)
            update('longitude', place.lng ?? null)
          }}
          types={['establishment', 'geocode']}
          placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
          className={FIELD}
        />
        <p className={HELP}>Para mostrar un pin preciso en el mapa. Si lo dejás vacío, usamos el centro de tu ciudad.</p>
      </Field>
      <Field label="WhatsApp" htmlFor="reg-whatsapp" required>
        <div className="flex gap-2">
          <select
            aria-label="Código de país"
            value={p.phoneCountry}
            onChange={(e) => p.onPhone(data.whatsapp, e.target.value as CountryCode)}
            className="flex-none cursor-pointer rounded-[14px] bg-surface-2 px-3 text-[15px] font-medium focus-visible:ring-2 focus-visible:ring-brand outline-none"
          >
            {PHONE_COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {code} +{getCountryCallingCode(code)}
              </option>
            ))}
          </select>
          <input id="reg-whatsapp" type="tel" inputMode="tel" aria-invalid={!!p.phoneError} aria-describedby={p.phoneError ? 'reg-phone-error' : undefined} value={data.whatsapp} onChange={(e) => p.onPhone(e.target.value)} onBlur={p.onPhoneBlur} placeholder="1123456789" className={`${FIELD} min-w-0 ${p.phoneError ? 'shadow-[inset_0_0_0_1.5px] shadow-danger-dark' : ''}`} />
        </div>
        {p.phoneError ? <p id="reg-phone-error" className={ERROR}>{p.phoneError}</p> : <p className={HELP}>Tu número local, sin código de país</p>}
      </Field>
      <Field label="Instagram" htmlFor="reg-instagram" optional>
        <div className="flex items-center rounded-[14px] bg-background px-3.5">
          <span className="text-base text-gray-500">@</span>
          <input id="reg-instagram" value={data.instagram} onChange={(e) => p.onInstagram(e.target.value)} placeholder="tuusuario" className="min-w-0 flex-1 bg-transparent px-1 py-[13px] text-base focus-visible:ring-2 focus-visible:ring-brand outline-none placeholder:text-gray-500" />
        </div>
        {p.instagramError ? <p className={ERROR}>{p.instagramError}</p> : <p className={HELP}>Solo el usuario, sin @</p>}
      </Field>
    </div>
  )
}

const MODALITIES = [
  { value: 'online', label: 'Online' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'ambos', label: 'Ambos' },
]
const SERVICE_TYPES = [
  { value: 'individual', label: 'Sesiones individuales' },
  { value: 'grupal', label: 'Sesiones grupales' },
]

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function StepProfile({ data, update, practices }: { data: RegistroData; update: RegistroUpdate; practices: Practice[] }) {
  const sorted = useMemo(() => practices.slice().sort((a, b) => a.label.localeCompare(b.label)), [practices])
  return (
    <div className={CARD}>
      <Field label="Modalidad de atención" required>
        <Segmented options={MODALITIES} value={data.modality[0] ?? ''} onPick={(v) => update('modality', [v])} />
      </Field>
      <SpecialtySelector selected={data.specialties} onChange={(next) => update('specialties', next)} />
      <Field label="Práctica">
        <div className="flex flex-wrap gap-[7px]">
          {sorted.map((pr) => {
            const on = data.practices.includes(pr.key)
            return (
              <button
                key={pr.key}
                type="button"
                aria-pressed={on}
                onClick={() => update('practices', toggle(data.practices, pr.key))}
                className={`rounded-full border-[1.5px] px-[13px] py-2 text-[13.5px] font-medium ${on ? 'border-foreground bg-foreground text-background' : 'border-foreground/12 bg-background'}`}
              >
                {pr.label}
              </button>
            )
          })}
        </div>
        <p className={HELP}>¿Qué tipo de práctica ofrecés? Podés elegir varias.</p>
      </Field>
      <Field label="Tipo de servicio">
        <div className="flex flex-col gap-0.5">
          {SERVICE_TYPES.map((s) => {
            const on = data.service_type.includes(s.value)
            return (
              <button key={s.value} type="button" aria-pressed={on} onClick={() => update('service_type', toggle(data.service_type, s.value))} className="flex items-center gap-3 py-[9px] text-left text-[15px]">
                <span className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] border-[1.5px] text-[12px] font-semibold text-gray-50 ${on ? 'border-brand-dark bg-brand-dark' : 'border-foreground/30'}`} aria-hidden="true">
                  {on ? '✓' : ''}
                </span>
                {s.label}
              </button>
            )
          })}
        </div>
      </Field>
    </div>
  )
}

const CURRENCIES = ['ARS', 'USD', 'EUR', 'MXN'].map((c) => ({ value: c, label: c }))

export function StepPricing({ data, update, priceError }: { data: RegistroData; update: RegistroUpdate; priceError: boolean }) {
  const price = (field: 'price_range_min' | 'price_range_max', label: string) => (
    <div>
      <label htmlFor={`reg-${field}`} className="mb-1.5 block text-[12.5px] text-muted">{label}</label>
      <div className="flex items-center gap-1.5 rounded-[14px] bg-background px-3">
        <span className="text-[13px] font-medium text-gray-500">{data.currency}</span>
        <input id={`reg-${field}`} inputMode="numeric" value={data[field]} onChange={(e) => update(field, e.target.value.replace(/\D/g, ''))} placeholder="0" className="min-w-0 flex-1 bg-transparent py-[13px] text-base focus-visible:ring-2 focus-visible:ring-brand outline-none" />
      </div>
    </div>
  )
  return (
    <div className={CARD}>
      <Field label="Moneda">
        <Segmented options={CURRENCIES} value={data.currency} onPick={(v) => update('currency', v)} />
      </Field>
      <Field label="Precio por sesión">
        <div className="grid grid-cols-2 gap-2">
          {price('price_range_min', 'Precio mínimo')}
          {price('price_range_max', 'Precio máximo')}
        </div>
        {priceError && <p className={ERROR}>El mínimo no puede ser mayor que el máximo.</p>}
        <p className={HELP}>Precio por sesión individual (opcional)</p>
      </Field>
      <div className="flex items-center gap-3.5 pt-1">
        <div className="flex-1">
          <p className="text-[14px] font-medium">Estoy aceptando nuevas consultas</p>
          <p className="mt-0.5 text-[12.5px] text-muted">Lo podés cambiar cuando quieras.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.accepting_new_clients}
          aria-label="Estoy aceptando nuevas consultas"
          onClick={() => update('accepting_new_clients', !data.accepting_new_clients)}
          className={`relative h-[26px] w-11 flex-none rounded-full transition-colors ${data.accepting_new_clients ? 'bg-brand-dark' : 'bg-foreground/18'}`}
        >
          <span className={`absolute top-[2px] h-[22px] w-[22px] rounded-full bg-gray-50 shadow-soft transition-all ${data.accepting_new_clients ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
    </div>
  )
}

export function StepAbout({ data, update }: { data: RegistroData; update: RegistroUpdate }) {
  const [photoError, setPhotoError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    const url = data.profile_image ? URL.createObjectURL(data.profile_image) : null
    setPreview(url)
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [data.profile_image])
  const bioLength = data.bio.trim().length

  function pickPhoto(file: File | undefined) {
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setPhotoError('El archivo tiene que ser JPG, PNG o WebP.')
    if (file.size > MAX_PHOTO_BYTES) return setPhotoError('La foto pesa más de 5 MB. Probá con una más liviana.')
    setPhotoError('')
    update('profile_image', file)
  }

  return (
    <div className={CARD}>
      <Field label="Foto de perfil">
        <div className="flex items-center gap-4">
          <div className="flex h-[78px] w-[78px] flex-none items-center justify-center overflow-hidden rounded-full bg-background shadow-[inset_0_0_0_1.5px] shadow-foreground/14">
            {preview ? <img src={preview} alt="Vista previa" className="h-full w-full object-cover" /> : <span className="text-[11.5px] text-gray-500">Sin foto</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="w-fit cursor-pointer rounded-[13px] bg-surface-2 px-4 py-2.5 text-[14px] font-medium text-brand-dark focus-within:ring-2 focus-within:ring-brand">
              {preview ? 'Cambiar foto' : 'Elegir foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </label>
            <p className={HELP}>JPG, PNG o WebP. Máximo 5 MB.</p>
          </div>
        </div>
        {photoError && <p className={ERROR}>{photoError}</p>}
      </Field>
      <Field label="Frase corta sobre vos" htmlFor="reg-short">
        <input id="reg-short" value={data.short_description} onChange={(e) => update('short_description', e.target.value)} placeholder="Ej: Facilitadora de constelaciones familiares y diseño humano" className={FIELD} />
        <p className={HELP}>Una línea que aparece debajo de tu nombre</p>
      </Field>
      <Field label="Sobre vos" htmlFor="reg-bio" required>
        <textarea id="reg-bio" value={data.bio} onChange={(e) => update('bio', e.target.value)} placeholder="Contá tu enfoque, cómo trabajás y qué pueden esperar quienes te consulten..." className={`${FIELD} min-h-[150px] resize-none leading-[1.55]`} />
        <p className={`-mt-0.5 text-[12px] font-medium ${bioLength >= 50 ? 'text-success-dark' : 'text-gray-500'}`}>{bioLength} / 50 mínimo</p>
      </Field>
      <Field label="Sobre tu experiencia" htmlFor="reg-exp" optional>
        <textarea id="reg-exp" value={data.experience_description} onChange={(e) => update('experience_description', e.target.value)} placeholder="Formación, años de experiencia, instituciones, certificaciones..." className={`${FIELD} min-h-[110px] resize-none leading-[1.55]`} />
        <p className={HELP}>Contarlo ayuda a generar confianza en tu perfil.</p>
      </Field>
    </div>
  )
}
