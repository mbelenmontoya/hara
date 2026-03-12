// Hará Match — Intake Form
// Purpose: Public form for people seeking a therapist/wellness professional
// One scrollable page, no steps. Submits to server action, redirects to /gracias

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createLead } from '@/app/actions/create-lead'
import { PlacesAutocomplete } from '@/app/components/PlacesAutocomplete'
import { isValidPhoneNumber, getCountryCallingCode, type CountryCode } from 'libphonenumber-js'

const INTENT_OPTIONS = [
  { value: 'anxiety', label: 'Ansiedad' },
  { value: 'depression', label: 'Depresión' },
  { value: 'stress', label: 'Estrés' },
  { value: 'trauma', label: 'Trauma' },
  { value: 'relationships', label: 'Relaciones' },
  { value: 'self-esteem', label: 'Autoestima' },
  { value: 'grief', label: 'Duelo' },
  { value: 'addiction', label: 'Adicciones' },
  { value: 'eating-disorders', label: 'Trastornos alimentarios' },
  { value: 'couples', label: 'Terapia de pareja' },
  { value: 'family', label: 'Terapia familiar' },
  { value: 'children', label: 'Niños y adolescentes' },
]

const MODALITY_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'ambos', label: 'Ambos' },
]

const URGENCY_OPTIONS = [
  { value: 'low', label: 'No es urgente, estoy explorando' },
  { value: 'medium', label: 'Me gustaría empezar pronto' },
  { value: 'high', label: 'Necesito ayuda lo antes posible' },
]

const STYLE_OPTIONS = [
  { value: 'cognitive-behavioral', label: 'Cognitivo-conductual' },
  { value: 'psychoanalytic', label: 'Psicoanalítico' },
  { value: 'humanistic', label: 'Humanista' },
  { value: 'systemic', label: 'Sistémico' },
  { value: 'gestalt', label: 'Gestalt' },
  { value: 'integrative', label: 'Integrativo' },
  { value: 'no-preference', label: 'No tengo preferencia' },
]

const CURRENCIES = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'MXN', label: 'MXN' },
]

const INPUT_CLASS = 'w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all'
const LABEL_CLASS = 'block text-sm font-medium text-foreground mb-2'
const HELPER_CLASS = 'text-xs text-muted mt-1.5'
const ERROR_CLASS = 'text-xs text-danger mt-1.5'

export default function SolicitarPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Form state
  const [intentTags, setIntentTags] = useState<string[]>([])
  const [country, setCountry] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [city, setCity] = useState('')
  const [locationDisplay, setLocationDisplay] = useState('')
  const [modality, setModality] = useState('')
  const [urgency, setUrgency] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Advanced fields
  const [stylePreference, setStylePreference] = useState<string[]>([])
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [email, setEmail] = useState('')

  function toggleIntent(value: string) {
    setIntentTags(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  function toggleStyle(value: string) {
    setStylePreference(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  function handleLocationChange(value: string, placeData?: { city: string; country: string; countryCode: string; formattedAddress: string }) {
    if (placeData) {
      setCity(placeData.city)
      setCountry(placeData.country)
      setCountryCode(placeData.countryCode)
      setLocationDisplay(placeData.formattedAddress)

      // Auto-fill country calling code prefix if whatsapp is empty
      try {
        const callingCode = getCountryCallingCode(placeData.countryCode as CountryCode)
        if (!whatsapp || whatsapp === '+') {
          setWhatsapp(`+${callingCode}`)
          setPhoneError(null)
        }
      } catch {
        // Unknown country code — don't prefill
      }
    } else {
      setLocationDisplay(value)
    }
  }

  function handleWhatsappChange(value: string) {
    setWhatsapp(value)

    // Live validation
    if (!value) {
      setPhoneError(null)
      return
    }

    if (!value.startsWith('+')) {
      setPhoneError('Debe empezar con + y el código de país')
      return
    }

    // Only validate once they've typed enough digits (at least 8 chars including +)
    if (value.length < 8) {
      setPhoneError(null)
      return
    }

    // Validate against detected country if available, otherwise general validation
    const isValid = countryCode
      ? isValidPhoneNumber(value, countryCode as CountryCode)
      : isValidPhoneNumber(value)

    if (!isValid) {
      const countryHint = countryCode ? ` para ${country}` : ''
      setPhoneError(`El número no parece válido${countryHint}`)
    } else {
      setPhoneError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (intentTags.length === 0) {
      setSubmitError('Seleccioná al menos un tema')
      return
    }
    if (!countryCode && !country) {
      setSubmitError('Buscá y seleccioná tu ubicación')
      return
    }
    if (!whatsapp) {
      setSubmitError('Ingresá tu WhatsApp')
      return
    }
    if (phoneError) {
      setSubmitError('Corregí el número de WhatsApp antes de enviar')
      return
    }

    setSubmitting(true)

    try {
      await createLead({
        intent_tags: intentTags,
        country: countryCode || country,
        city: city || undefined,
        online_ok: modality !== 'presencial',
        modality_preference: modality ? [modality] : undefined,
        urgency: urgency || undefined,
        whatsapp,
        style_preference: stylePreference.length > 0 ? stylePreference : undefined,
        budget_min: budgetMin ? parseInt(budgetMin) : undefined,
        budget_max: budgetMax ? parseInt(budgetMax) : undefined,
        currency: currency || undefined,
        email: email || undefined,
      })

      router.push('/gracias')
    } catch {
      setSubmitError('Hubo un error. Intentá de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">

      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: '#FBF7F2',
          backgroundImage: 'url(/assets/illustrations/rizki-kurniawan-SSp6eC-LKBU-unsplash.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-md mx-auto px-4 pt-8 pb-12">

        <h1 className="text-2xl font-semibold text-foreground mb-2 text-center">
          Encontrá tu profesional ideal
        </h1>
        <p className="text-sm text-muted text-center mb-8">
          Contanos qué buscás y te conectamos con 3 profesionales que se ajustan a vos.
        </p>

        <form onSubmit={handleSubmit}>

          {/* Card: What are you looking for */}
          <div className="liquid-glass rounded-3xl shadow-elevated border border-white/30 p-6 mb-4">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">
              ¿En qué necesitás ayuda? *
            </h2>
            <div className="flex flex-wrap gap-2">
              {INTENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleIntent(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    intentTags.includes(opt.value)
                      ? 'bg-brand text-white border-brand'
                      : 'bg-surface-2 text-foreground border-outline hover:border-brand/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card: Location + modality */}
          <div className="liquid-glass rounded-3xl shadow-elevated border border-white/30 p-6 mb-4">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">
              ¿Dónde estás? *
            </h2>

            <div className="space-y-4">
              <div>
                <label className={LABEL_CLASS}>Ubicación</label>
                <PlacesAutocomplete
                  value={locationDisplay}
                  onChange={handleLocationChange}
                  placeholder="Empezá a escribir tu ciudad..."
                  className={INPUT_CLASS}
                />
                <p className={HELPER_CLASS}>
                  Seleccioná tu ciudad de la lista. Esto también detecta tu país.
                </p>
              </div>

              <div>
                <label className={LABEL_CLASS}>¿Cómo preferís las sesiones?</label>
                <div className="flex gap-2">
                  {MODALITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setModality(opt.value)}
                      className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                        modality === opt.value
                          ? 'bg-brand text-white border-brand'
                          : 'bg-surface border-outline text-foreground hover:border-brand/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Urgency */}
          <div className="liquid-glass rounded-3xl shadow-elevated border border-white/30 p-6 mb-4">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">
              ¿Qué tan urgente es?
            </h2>
            <div className="space-y-2">
              {URGENCY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUrgency(opt.value)}
                  className={`w-full px-4 py-3 text-sm text-left rounded-xl border transition-all ${
                    urgency === opt.value
                      ? 'bg-brand text-white border-brand'
                      : 'bg-surface border-outline text-foreground hover:border-brand/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card: WhatsApp */}
          <div className="liquid-glass rounded-3xl shadow-elevated border border-white/30 p-6 mb-4">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">
              ¿Cómo te contactamos? *
            </h2>
            <div>
              <label className={LABEL_CLASS}>WhatsApp</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => handleWhatsappChange(e.target.value)}
                placeholder={countryCode ? `Ej: +${getCountryCallingCode(countryCode as CountryCode)}...` : 'Ej: +5491123456789'}
                className={`${INPUT_CLASS} ${phoneError ? 'border-danger focus:ring-danger/50 focus:border-danger' : ''}`}
              />
              {phoneError ? (
                <p className={ERROR_CLASS}>{phoneError}</p>
              ) : (
                <p className={HELPER_CLASS}>
                  Solo te escribimos para enviarte las recomendaciones.
                </p>
              )}
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-sm text-brand font-medium mb-4 flex items-center justify-center gap-1"
          >
            {showAdvanced ? 'Ocultar opciones adicionales' : 'Más opciones'}
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Advanced fields */}
          {showAdvanced && (
            <div className="liquid-glass rounded-3xl shadow-elevated border border-white/30 p-6 mb-4">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">
                Opciones adicionales
              </h2>

              <div className="space-y-5">
                <div>
                  <label className={LABEL_CLASS}>¿Tenés preferencia de enfoque?</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleStyle(opt.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                          stylePreference.includes(opt.value)
                            ? 'bg-brand text-white border-brand'
                            : 'bg-surface-2 text-foreground border-outline hover:border-brand/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className={HELPER_CLASS}>Si no sabés, no te preocupes — nosotros lo consideramos.</p>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Presupuesto por sesión</label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-3 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all w-24"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      placeholder="Mín"
                      className={`flex-1 ${INPUT_CLASS}`}
                    />
                    <span className="text-muted">–</span>
                    <input
                      type="number"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      placeholder="Máx"
                      className={`flex-1 ${INPUT_CLASS}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className={INPUT_CLASS}
                  />
                  <p className={HELPER_CLASS}>Opcional. Para enviarte las recomendaciones también por email.</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="p-4 bg-danger-weak border border-danger/20 rounded-xl text-sm text-danger mb-4">
              {submitError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !!phoneError}
            className="w-full px-6 py-4 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Encontrar mis 3 opciones'}
          </button>

          <p className="text-xs text-muted text-center mt-4">
            Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
          </p>

        </form>
      </div>
    </div>
  )
}
