'use client'

import { useState, useMemo } from 'react'
import type { Practice } from '@/lib/practices'
import { calculateProfileScore, type ScorableProfile } from '@/lib/profile-score'
import { ScoreRing, ScoreBreakdown } from '@/app/admin/professionals/[id]/review/components/ScoreDisplay'
import { PracticePicker } from '@/app/components/PracticePicker'
import { SpecialtySelector } from '@/app/registro/components/SpecialtySelector'
import { PlacesAutocomplete } from '@/app/components/PlacesAutocomplete'
import { GlassCard } from '@/app/components/ui/GlassCard'

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
  const [serviceType, setServiceType] = useState<string[]>(professional.service_type ?? [])
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
    <div className="space-y-6">
      {/* Live score panel */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Índice Hara
        </h2>
        <ReadOnlyScorePanel score={score} />
      </GlassCard>

      {/* Edit form */}
      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Personal */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Datos personales</h3>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email
                <span className="ml-2 text-xs text-muted font-normal">(no editable)</span>
              </label>
              <input
                type="email"
                value={professional.email}
                disabled
                className="w-full px-4 py-3 bg-surface-2 border border-outline rounded-xl text-muted cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                WhatsApp
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="+5491112345678"
                className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Instagram
              </label>
              <input
                type="text"
                value={instagram}
                onChange={e => handleInstagramChange(e.target.value)}
                placeholder="tu_usuario"
                className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
              />
            </div>
          </section>

          {/* Location */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Ubicación</h3>
            <PlacesAutocomplete
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
            <label className="flex items-center gap-3 cursor-pointer">
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
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Modalidad de atención</h3>
            <div className="flex flex-wrap gap-3">
              {MODALITY_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
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
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Prácticas</h3>
            <PracticePicker
              practices={practices}
              selected={selectedPractices}
              onChange={setSelectedPractices}
              label="Prácticas holísticas"
            />
          </section>

          {/* Specialties */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Especialidades</h3>
            <SpecialtySelector
              selected={specialties}
              onChange={setSpecialties}
            />
          </section>

          {/* Descriptions */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Descripciones</h3>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Descripción corta
              </label>
              <textarea
                value={shortDescription}
                onChange={e => setShortDescription(e.target.value)}
                placeholder="Una descripción breve de tu práctica..."
                rows={2}
                className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Biografía
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Contá quién sos y tu camino en esta práctica..."
                rows={4}
                className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Experiencia
              </label>
              <textarea
                value={experienceDescription}
                onChange={e => setExperienceDescription(e.target.value)}
                placeholder="Describí tu formación y experiencia..."
                rows={3}
                className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all resize-none"
              />
            </div>
          </section>

          {/* Service & pricing */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Servicio y precios</h3>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">Precio mín</label>
                <input
                  type="number"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">Precio máx</label>
                <input
                  type="number"
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                />
              </div>
              <div className="w-28">
                <label className="block text-sm font-medium text-foreground mb-1">Moneda</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
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
            <div className="p-3 bg-success-weak border border-success/20 rounded-xl text-sm text-success">
              ¡Cambios guardados exitosamente!
            </div>
          )}
          {saveError && (
            <div className="p-3 bg-danger-weak border border-danger/20 rounded-xl text-sm text-danger">
              {saveError}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full px-6 py-3.5 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>

        </form>
      </GlassCard>
    </div>
  )
}
