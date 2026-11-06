'use client'

import { useState, useMemo } from 'react'
import type { Practice } from '@/lib/practices'
import { calculateProfileScore, type ScorableProfile } from '@/lib/profile-score'
import { ScoreRing, ScoreBreakdown } from '@/app/admin/professionals/[id]/review/components/ScoreDisplay'
import { PracticePicker } from '@/app/components/PracticePicker'
import { SpecialtySelector } from '@/app/registro/components/SpecialtySelector'
import { PlacesAutocomplete } from '@/app/components/PlacesAutocomplete'

// Full editable profile — all fields the professional can change
export interface EditableProfessional {
  id: string
  slug: string
  email: string
  full_name: string
  whatsapp: string
  instagram: string | null
  country: string
  city: string | null
  latitude: number | null
  longitude: number | null
  online_only: boolean
  modality: string[]
  specialties: string[]
  practices: string[]
  service_type: string[]
  bio: string | null
  short_description: string | null
  experience_description: string | null
  profile_image_url: string | null
  price_range_min: number | null
  price_range_max: number | null
  currency: string | null
  accepting_new_clients: boolean
}

// ─── ReadOnlyScorePanel ──────────────────────────────────────────────────────
// Structural read-only wrapper — never passes onOverride so editable inputs
// never appear (ScoreBreakdown renders them only when onOverride is provided).

function ReadOnlyScorePanel({ score }: { score: ReturnType<typeof calculateProfileScore> }) {
  return (
    <div data-testid="score-panel" className="space-y-4">
      <div data-testid="score-total" className="text-center">
        <ScoreRing score={score.total} />
        <p className="text-xs text-muted mt-2">Puntos Hara</p>
      </div>
      {/* onOverride intentionally omitted — makes this panel read-only */}
      <ScoreBreakdown breakdown={score.breakdown} />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full rounded-[14px] bg-background px-3.5 py-[13px] text-base text-foreground outline-none placeholder:text-gray-700 focus-visible:ring-2 focus-visible:ring-brand'
const CARD_CLASS = 'min-w-0 space-y-4 rounded-3xl bg-gray-50 p-5 sm:p-6'

const MODALITY_OPTIONS = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
]

// ─── ProfileEditForm ─────────────────────────────────────────────────────────

interface Props {
  professional: EditableProfessional
  practices: Practice[]
}

export default function ProfileEditForm({ professional, practices }: Props) {
  const [fullName, setFullName] = useState(professional.full_name)
  const [whatsapp, setWhatsapp] = useState(professional.whatsapp)
  const [instagram, setInstagram] = useState(professional.instagram ?? '')
  const [city, setCity] = useState(professional.city ?? '')
  const [country, setCountry] = useState(professional.country)
  const [latitude, setLatitude] = useState<number | null>(professional.latitude)
  const [longitude, setLongitude] = useState<number | null>(professional.longitude)
  const [onlineOnly, setOnlineOnly] = useState(professional.online_only)
  const [modality, setModality] = useState<string[]>(professional.modality ?? [])
  const [specialties, setSpecialties] = useState<string[]>(professional.specialties ?? [])
  const [selectedPractices, setSelectedPractices] = useState<string[]>(professional.practices ?? [])
  const [serviceType] = useState<string[]>(professional.service_type ?? [])
  const [shortDescription, setShortDescription] = useState(professional.short_description ?? '')
  const [bio, setBio] = useState(professional.bio ?? '')
  const [experienceDescription, setExperienceDescription] = useState(professional.experience_description ?? '')
  const [priceMin, setPriceMin] = useState(professional.price_range_min?.toString() ?? '')
  const [priceMax, setPriceMax] = useState(professional.price_range_max?.toString() ?? '')
  const [currency, setCurrency] = useState(professional.currency ?? 'ARS')
  const [acceptingClients, setAcceptingClients] = useState(professional.accepting_new_clients)

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Live score — recomputes only when scored fields change
  const score = useMemo(() => {
    const profile: ScorableProfile = {
      profile_image_url: professional.profile_image_url,
      short_description: shortDescription || null,
      bio: bio || null,
      experience_description: experienceDescription || null,
      practices: selectedPractices.length > 0 ? selectedPractices : null,
      service_type: serviceType.length > 0 ? serviceType : null,
      city: onlineOnly ? null : (city || null),
      online_only: onlineOnly,
      instagram: instagram || null,
      whatsapp: whatsapp || null,
      modality: modality.length > 0 ? modality : null,
    }
    return calculateProfileScore(profile)
  }, [shortDescription, bio, experienceDescription, selectedPractices, serviceType, city, onlineOnly, instagram, whatsapp, modality, professional.profile_image_url])

  function handleInstagramChange(value: string) {
    let username = value.trim()
    username = username.replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    username = username.replace(/^@/, '').replace(/\/+$/, '').split('?')[0]
    setInstagram(username)
  }

  function toggleModality(value: string) {
    setModality(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(false)
    setSaving(true)

    try {
      const body = JSON.stringify({
        full_name: fullName.trim(),
        whatsapp,
        instagram: instagram || null,
        country,
        city: onlineOnly ? null : (city || null),
        latitude,
        longitude,
        online_only: onlineOnly,
        modality,
        specialties,
        practices: selectedPractices,
        service_type: serviceType,
        short_description: shortDescription || null,
        bio,
        experience_description: experienceDescription || null,
        price_range_min: priceMin ? parseInt(priceMin) : null,
        price_range_max: priceMax ? parseInt(priceMax) : null,
        currency,
        accepting_new_clients: acceptingClients,
      })

      const res = await fetch('/api/pro/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      })

      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error ?? 'Error al guardar los cambios')
      } else {
        setSaveSuccess(true)
      }
    } catch {
      setSaveError('Error de conexión. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      {/* Live score panel */}
      <aside aria-label="Índice Hara" className="order-2 rounded-3xl bg-gray-50 p-5 sm:p-6 lg:sticky lg:top-6">
        <h2 className="font-almanac-serif mb-5 text-[28px] leading-tight">
          Índice Hara
        </h2>
        <ReadOnlyScorePanel score={score} />
      </aside>

      {/* Edit form */}
        <form onSubmit={handleSubmit} aria-label="Editar perfil" className="order-1 min-w-0 space-y-5 [&_button]:min-h-11">

          {/* Personal */}
          <section className={CARD_CLASS}>
            <h3 className="font-almanac-serif mb-4 text-[28px] leading-tight">Datos personales</h3>

            <div>
              <label htmlFor="pro-name" className="block text-sm font-medium text-foreground mb-1">
                Nombre completo
              </label>
              <input id="pro-name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="pro-email" className="block text-sm font-medium text-foreground mb-1">
                Email
                <span className="ml-2 text-xs text-muted font-normal">(no editable)</span>
              </label>
              <input id="pro-email"
                type="email"
                value={professional.email}
                disabled
                className="w-full rounded-[14px] bg-surface-2 px-3.5 py-[13px] text-base text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="pro-whatsapp" className="block text-sm font-medium text-foreground mb-1">
                WhatsApp
              </label>
              <input id="pro-whatsapp"
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="+5491112345678"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="pro-instagram" className="block text-sm font-medium text-foreground mb-1">
                Instagram
              </label>
              <input id="pro-instagram"
                type="text"
                value={instagram}
                onChange={e => handleInstagramChange(e.target.value)}
                placeholder="tu_usuario"
                className={INPUT_CLASS}
              />
            </div>
          </section>

          {/* Location */}
          <section className={CARD_CLASS}>
            <h3 className="font-almanac-serif mb-4 text-[28px] leading-tight">Ubicación</h3>
            <label htmlFor="pro-city" className="block text-sm font-medium">Ciudad o localidad</label>
            <PlacesAutocomplete
              id="pro-city"
              className={INPUT_CLASS}
              value={city}
              onChange={(value, placeData) => {
                setCity(value)
                if (placeData) {
                  setCountry(placeData.country)
                  if (placeData.lat != null) setLatitude(placeData.lat)
                  if (placeData.lng != null) setLongitude(placeData.lng)
                }
              }}
              placeholder="Ciudad o localidad"
            />
            <label className="flex min-h-11 items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={e => setOnlineOnly(e.target.checked)}
                className="w-4 h-4 rounded accent-brand"
              />
              <span className="text-sm text-foreground">Solo atiendo online</span>
            </label>
          </section>

          {/* Modality */}
          <section className={CARD_CLASS} role="group" aria-labelledby="pro-modality-label">
            <h3 id="pro-modality-label" className="font-almanac-serif mb-4 text-[28px] leading-tight">Modalidad de atención</h3>
            <div className="flex flex-wrap gap-3">
              {MODALITY_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex min-h-11 items-center gap-2 rounded-full bg-background px-4 cursor-pointer focus-within:ring-2 focus-within:ring-brand">
                  <input
                    type="checkbox"
                    checked={modality.includes(value)}
                    onChange={() => toggleModality(value)}
                    className="w-4 h-4 accent-brand"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Practices */}
          <section className={CARD_CLASS}>
            <h3 className="font-almanac-serif mb-4 text-[28px] leading-tight">Prácticas</h3>
            <PracticePicker
              practices={practices}
              selected={selectedPractices}
              onChange={setSelectedPractices}
              label="Prácticas holísticas"
            />
          </section>

          {/* Specialties */}
          <section className={CARD_CLASS}>
            <SpecialtySelector
              selected={specialties}
              onChange={setSpecialties}
            />
          </section>

          {/* Descriptions */}
          <section className={CARD_CLASS}>
            <h3 className="font-almanac-serif mb-4 text-[28px] leading-tight">Descripciones</h3>

            <div>
              <label htmlFor="pro-short-description" className="block text-sm font-medium text-foreground mb-1">
                Descripción corta
              </label>
              <textarea id="pro-short-description"
                value={shortDescription}
                onChange={e => setShortDescription(e.target.value)}
                placeholder="Una descripción breve de tu práctica..."
                rows={2}
                className={`${INPUT_CLASS} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="pro-bio" className="block text-sm font-medium text-foreground mb-1">
                Biografía
              </label>
              <textarea id="pro-bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Contá quién sos y tu camino en esta práctica..."
                rows={4}
                className={`${INPUT_CLASS} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="pro-experience" className="block text-sm font-medium text-foreground mb-1">
                Experiencia
              </label>
              <textarea id="pro-experience"
                value={experienceDescription}
                onChange={e => setExperienceDescription(e.target.value)}
                placeholder="Describí tu formación y experiencia..."
                rows={3}
                className={`${INPUT_CLASS} resize-y`}
              />
            </div>
          </section>

          {/* Service & pricing */}
          <section className={CARD_CLASS}>
            <h3 className="font-almanac-serif mb-4 text-[28px] leading-tight">Servicio y precios</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex-1">
                <label htmlFor="pro-price-min" className="block text-sm font-medium text-foreground mb-1">Precio mínimo</label>
              <input id="pro-price-min"
                  type="number"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  placeholder="0"
                  min={0}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="pro-price-max" className="block text-sm font-medium text-foreground mb-1">Precio máximo</label>
              <input id="pro-price-max"
                  type="number"
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  placeholder="0"
                  min={0}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="pro-currency" className="block text-sm font-medium text-foreground mb-1">Moneda</label>
              <select id="pro-currency"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <label className="flex min-h-11 items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptingClients}
                onChange={e => setAcceptingClients(e.target.checked)}
                className="w-4 h-4 rounded accent-brand"
              />
              <span className="text-sm text-foreground">Aceptando nuevos clientes</span>
            </label>
          </section>

          {/* Save feedback */}
          {saveSuccess && (
            <div role="status" className="rounded-2xl bg-success-weak p-4 text-sm text-success-dark">
              ¡Cambios guardados exitosamente!
            </div>
          )}
          {saveError && (
            <div role="alert" className="rounded-2xl bg-danger-weak p-4 text-sm text-danger-dark">
              {saveError}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="min-h-12 w-full rounded-2xl bg-brand-dark px-6 py-3.5 text-base font-medium text-gray-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>

        </form>
    </div>
  )
}
