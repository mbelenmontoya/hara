// Professional Registration Form
// Multi-step form for professionals to submit their profile

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AsYouType, isValidPhoneNumber, parsePhoneNumberFromString, getCountryCallingCode, type CountryCode } from 'libphonenumber-js'
import { PlacesAutocomplete } from '@/app/components/PlacesAutocomplete'
import { SpecialtySelector } from '@/app/profesionales/registro/components/SpecialtySelector'

// Form steps
const STEPS = [
  { id: 'personal', title: 'Datos personales' },
  { id: 'professional', title: 'Perfil profesional' },
  { id: 'pricing', title: 'Tarifas y disponibilidad' },
  { id: 'bio', title: 'Sobre vos' },
]

// Options for select fields
const COUNTRIES = [
  { value: 'AR', label: 'Argentina' },
  { value: 'MX', label: 'México' },
  { value: 'CO', label: 'Colombia' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Perú' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'ES', label: 'España' },
  { value: 'US', label: 'Estados Unidos' },
]

const MODALITIES = [
  { value: 'online', label: 'Online' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'ambos', label: 'Ambos' },
]


const STYLES = [
  { value: 'cognitive-behavioral', label: 'Cognitivo-conductual' },
  { value: 'psychoanalytic', label: 'Psicoanalítico' },
  { value: 'humanistic', label: 'Humanista' },
  { value: 'systemic', label: 'Sistémico' },
  { value: 'gestalt', label: 'Gestalt' },
  { value: 'integrative', label: 'Integrativo' },
]

const SERVICE_TYPES = [
  { value: 'individual', label: 'Sesiones individuales' },
  { value: 'grupal', label: 'Sesiones grupales' },
]

const CURRENCIES = [
  { value: 'ARS', label: 'ARS (Peso argentino)' },
  { value: 'USD', label: 'USD (Dólar)' },
  { value: 'EUR', label: 'EUR (Euro)' },
  { value: 'MXN', label: 'MXN (Peso mexicano)' },
]

// Countries for the phone flag dropdown (LATAM + Europe + US)
const PHONE_COUNTRIES: CountryCode[] = [
  // LATAM
  'AR', 'MX', 'CO', 'CL', 'PE', 'UY', 'BR', 'EC',
  'VE', 'BO', 'PY', 'CR', 'PA', 'DO', 'GT', 'HN', 'SV', 'NI', 'CU',
  // Europe
  'ES', 'PT', 'FR', 'IT', 'DE', 'GB', 'NL', 'BE', 'CH', 'AT',
  'IE', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'RO', 'GR', 'HR',
  // US
  'US',
]

function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
}

interface FormData {
  full_name: string
  email: string
  whatsapp: string
  instagram: string
  country: string
  city: string
  modality: string[]
  online_only: boolean
  specialties: string[]
  style: string[]
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

const initialFormData: FormData = {
  full_name: '',
  email: '',
  whatsapp: '',
  instagram: '',
  country: '',
  city: '',
  modality: [],
  online_only: false,
  specialties: [],
  style: [],
  service_type: [],
  price_range_min: '',
  price_range_max: '',
  currency: 'USD',
  accepting_new_clients: true,
  short_description: '',
  bio: '',
  experience_description: '',
  profile_image: null,
}

// Available backgrounds (illustrations only)
const BACKGROUNDS = [
  { id: 'rizki-1', label: 'Rizki 1', path: '/assets/illustrations/rizki-kurniawan-SSp6eC-LKBU-unsplash.svg' },
  { id: 'rizki-2', label: 'Rizki 2', path: '/assets/illustrations/rizki-kurniawan-iVnWczl8eqg-unsplash.svg' },
  { id: 'denisse', label: 'Denisse', path: '/assets/illustrations/denisse-diaz-hFtlz_mtAPQ-unsplash.svg' },
  { id: 'jo-yee-1', label: 'Jo Yee 1', path: '/assets/illustrations/jo-yee-leong-8ekcOvJnLlo-unsplash.svg' },
  { id: 'jo-yee-2', label: 'Jo Yee 2', path: '/assets/illustrations/jo-yee-leong-FX8yJf4ykCA-unsplash.svg' },
  { id: 'silverfork', label: 'Silverfork', path: '/assets/illustrations/silverfork-studio-MtMPXbN_3-k-unsplash.svg' },
  { id: 'smaili', label: 'Smaili', path: '/assets/illustrations/smaili-aziz-TM1U0qcItKY-unsplash.svg' },
  { id: 'none', label: 'Sin fondo', path: null },
]

export default function ProfessionalRegistrationPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('AR')
  const [instagramError, setInstagramError] = useState<string | null>(null)
  const [backgroundPath, setBackgroundPath] = useState<string | null>('/assets/illustrations/rizki-kurniawan-SSp6eC-LKBU-unsplash.svg')
  const [showBgPicker, setShowBgPicker] = useState(false)

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function handleInstagramChange(value: string) {
    // Strip common prefixes to extract just the username
    let username = value.trim()
    username = username.replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    username = username.replace(/^@/, '')
    username = username.replace(/\/+$/, '') // trailing slashes
    username = username.split('?')[0] // query params

    updateField('instagram', username)

    if (!username) {
      setInstagramError(null)
      return
    }
    // Instagram usernames: 1-30 chars, letters, numbers, periods, underscores
    const valid = /^[a-zA-Z0-9._]{1,30}$/.test(username)
    setInstagramError(valid ? null : 'No parece un usuario de Instagram válido')
  }

  function handleEmailChange(value: string) {
    updateField('email', value)
    if (!value) {
      setEmailError(null)
      return
    }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    setEmailError(valid ? null : 'El email no parece válido')
  }

  function handleWhatsappChange(value: string, country?: CountryCode) {
    const activeCountry = country || phoneCountry
    const formatter = new AsYouType(activeCountry)
    const formatted = formatter.input(value)
    updateField('whatsapp', formatted)

    if (!value) {
      setPhoneError(null)
      return
    }
    // Only validate once enough digits are typed
    const digits = value.replace(/\D/g, '')
    if (digits.length < 6) {
      setPhoneError(null)
      return
    }
    // Prepend calling code for validation since user types local number
    const callingCode = getCountryCallingCode(activeCountry)
    const fullNumber = `+${callingCode}${digits}`
    const valid = isValidPhoneNumber(fullNumber)
    setPhoneError(valid ? null : 'El número no parece válido')
  }

  function handlePhoneBlur() {
    if (!formData.whatsapp) return
    // Re-validate on blur with current country
    handleWhatsappChange(formData.whatsapp)
  }

  const toggleArrayField = (field: 'modality' | 'specialties' | 'style' | 'service_type', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Personal
        return formData.full_name && formData.email && !emailError && formData.whatsapp && !phoneError && formData.country
      case 1: // Professional
        return formData.modality.length > 0 && formData.specialties.length > 0
      case 2: // Pricing
        return true // Optional step
      case 3: // Bio
        return formData.bio.length >= 50
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const payload = new FormData()
      payload.append('full_name', formData.full_name)
      payload.append('email', formData.email)
      const digits = formData.whatsapp.replace(/\D/g, '')
      const callingCode = getCountryCallingCode(phoneCountry)
      const fullNumber = `+${callingCode}${digits}`
      const parsedPhone = parsePhoneNumberFromString(fullNumber)
      payload.append('whatsapp', parsedPhone ? parsedPhone.format('E.164') : fullNumber)
      payload.append('instagram', formData.instagram)
      payload.append('country', formData.country)
      payload.append('city', formData.city)
      payload.append('online_only', String(formData.online_only))
      payload.append('modality', JSON.stringify(formData.modality))
      payload.append('specialties', JSON.stringify(formData.specialties))
      payload.append('style', JSON.stringify(formData.style))
      payload.append('service_type', JSON.stringify(formData.service_type))
      payload.append('price_range_min', formData.price_range_min)
      payload.append('price_range_max', formData.price_range_max)
      payload.append('currency', formData.currency)
      payload.append('accepting_new_clients', String(formData.accepting_new_clients))
      payload.append('short_description', formData.short_description)
      payload.append('bio', formData.bio)
      payload.append('experience_description', formData.experience_description)
      if (formData.profile_image) {
        payload.append('profile_image', formData.profile_image)
      }

      const response = await fetch('/api/professionals/register', {
        method: 'POST',
        body: payload,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al enviar el formulario')
      }

      // Success - redirect to confirmation
      router.push('/profesionales/registro/confirmacion')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: '#FBF7F2',
          backgroundImage: backgroundPath ? `url(${backgroundPath})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start pt-8 pb-12 px-4">
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx <= currentStep ? 'bg-brand w-8' : 'bg-outline/50 w-6'
              }`}
            />
          ))}
        </div>

        {/* Step title */}
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          {STEPS[currentStep].title}
        </h1>
        <p className="text-sm text-muted mb-6">
          Paso {currentStep + 1} de {STEPS.length}
        </p>

        {/* Form card */}
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 w-full max-w-md overflow-hidden">
          <div className="p-6 space-y-5">
            {/* Step 0: Personal */}
            {currentStep === 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    placeholder="Ej: María García López"
                    className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                  />
                  {emailError && (
                    <p className="text-xs text-danger mt-1.5">{emailError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Ubicación *
                  </label>
                  <PlacesAutocomplete
                    value={formData.city}
                    onChange={(value, placeData) => {
                      if (placeData) {
                        updateField('city', placeData.city)
                        updateField('country', placeData.countryCode)
                        // Auto-set phone country from location
                        const code = placeData.countryCode as CountryCode
                        setPhoneCountry(code)
                        if (formData.whatsapp) handleWhatsappChange(formData.whatsapp, code)
                      } else {
                        updateField('city', value)
                      }
                    }}
                    placeholder="Buscar ciudad..."
                    className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                  />
                  <p className="text-xs text-muted mt-1.5">
                    Empezá a escribir y seleccioná tu ciudad
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    WhatsApp *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountry}
                      onChange={(e) => {
                        const code = e.target.value as CountryCode
                        setPhoneCountry(code)
                        if (formData.whatsapp) handleWhatsappChange(formData.whatsapp, code)
                      }}
                      className="px-3 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-sm min-w-[120px]"
                    >
                      {PHONE_COUNTRIES.map(code => (
                        <option key={code} value={code}>
                          {countryCodeToFlag(code)} +{getCountryCallingCode(code)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => handleWhatsappChange(e.target.value)}
                      onBlur={handlePhoneBlur}
                      placeholder="1123456789"
                      className="flex-1 px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                    />
                  </div>
                  {phoneError ? (
                    <p className="text-xs text-danger mt-1.5">{phoneError}</p>
                  ) : (
                    <p className="text-xs text-muted mt-1.5">
                      Tu número local, sin código de país
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => handleInstagramChange(e.target.value)}
                    placeholder="tu_usuario"
                    className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                  />
                  {instagramError ? (
                    <p className="text-xs text-danger mt-1.5">{instagramError}</p>
                  ) : (
                    <p className="text-xs text-muted mt-1.5">
                      Opcional — solo tu nombre de usuario, sin @
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Step 1: Professional */}
            {currentStep === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Modalidad de atención *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MODALITIES.map(m => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => toggleArrayField('modality', m.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.modality.includes(m.value)
                            ? 'bg-brand text-white'
                            : 'bg-surface border border-outline text-foreground hover:border-brand/50'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <SpecialtySelector
                  selected={formData.specialties}
                  onChange={(specialties) => updateField('specialties', specialties)}
                />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Enfoque terapéutico
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleArrayField('style', s.value)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          formData.style.includes(s.value)
                            ? 'bg-brand text-white'
                            : 'bg-surface border border-outline text-foreground hover:border-brand/50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Tipo de servicio
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_TYPES.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleArrayField('service_type', s.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.service_type.includes(s.value)
                            ? 'bg-brand text-white'
                            : 'bg-surface border border-outline text-foreground hover:border-brand/50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Pricing */}
            {currentStep === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Moneda
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Precio mínimo
                    </label>
                    <input
                      type="number"
                      value={formData.price_range_min}
                      onChange={(e) => updateField('price_range_min', e.target.value)}
                      placeholder="Ej: 50"
                      className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Precio máximo
                    </label>
                    <input
                      type="number"
                      value={formData.price_range_max}
                      onChange={(e) => updateField('price_range_max', e.target.value)}
                      placeholder="Ej: 100"
                      className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Precio por sesión individual (opcional)
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => updateField('accepting_new_clients', !formData.accepting_new_clients)}
                    className={`w-12 h-7 rounded-full transition-all ${
                      formData.accepting_new_clients ? 'bg-brand' : 'bg-outline'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        formData.accepting_new_clients ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-foreground">
                    Estoy aceptando nuevos pacientes
                  </span>
                </div>
              </>
            )}

            {/* Step 3: Bio */}
            {currentStep === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Foto de perfil
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {formData.profile_image ? (
                        <img
                          src={URL.createObjectURL(formData.profile_image)}
                          alt="Vista previa"
                          className="w-20 h-20 rounded-full object-cover shadow-soft border-2 border-white/60"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-weak to-info-weak flex items-center justify-center shadow-soft border-2 border-white/60">
                          <span className="text-2xl font-semibold text-brand">
                            {formData.full_name.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center px-4 py-2 bg-surface border border-outline rounded-full text-sm font-medium text-foreground hover:border-brand/50 transition-all cursor-pointer">
                        {formData.profile_image ? 'Cambiar foto' : 'Elegir foto'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            if (file && file.size > 5 * 1024 * 1024) {
                              setError('La imagen no puede pesar más de 5 MB')
                              return
                            }
                            updateField('profile_image', file)
                          }}
                        />
                      </label>
                      <p className="text-xs text-muted mt-1.5">
                        JPG, PNG o WebP. Máximo 5 MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Frase corta sobre vos
                  </label>
                  <input
                    type="text"
                    value={formData.short_description}
                    onChange={(e) => updateField('short_description', e.target.value)}
                    placeholder="Ej: Psicóloga especializada en ansiedad y estrés laboral"
                    className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                  />
                  <p className="text-xs text-muted mt-1.5">
                    Una línea que aparece debajo de tu nombre en el perfil
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Sobre vos *
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Contá un poco sobre tu enfoque, cómo trabajás y qué pueden esperar tus pacientes..."
                    rows={5}
                    className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all resize-none"
                  />
                  <p className={`text-xs mt-1.5 ${formData.bio.length >= 50 ? 'text-success' : 'text-muted'}`}>
                    {formData.bio.length}/50 caracteres mínimo
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Sobre tu experiencia
                  </label>
                  <textarea
                    value={formData.experience_description}
                    onChange={(e) => updateField('experience_description', e.target.value)}
                    placeholder="Formación, años de experiencia, instituciones donde trabajaste, certificaciones..."
                    rows={4}
                    className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all resize-none"
                  />
                  <p className="text-xs text-muted mt-1.5">
                    Opcional — ayuda a generar confianza en tu perfil
                  </p>
                </div>

                <div className="bg-info-weak border border-info/20 rounded-xl p-4">
                  <p className="text-sm text-info">
                    Tu perfil será revisado por nuestro equipo antes de ser publicado.
                    Te contactaremos por email cuando esté activo.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="px-6 pb-4">
              <div className="bg-danger-weak border border-danger/20 rounded-xl p-3">
                <p className="text-sm text-danger">{error}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="px-6 pb-6 flex gap-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-6 py-3.5 bg-surface border border-outline text-foreground font-semibold rounded-full hover:bg-surface-2 btn-press-inset transition-all"
              >
                Atrás
              </button>
            )}
            
            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 px-6 py-3.5 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="flex-1 px-6 py-3.5 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted mt-6 text-center max-w-sm">
          Al enviar este formulario, aceptás nuestros términos de servicio y política de privacidad.
        </p>
      </div>

      {/* Background Picker Button */}
      <button
        onClick={() => setShowBgPicker(!showBgPicker)}
        className="fixed bottom-4 right-4 z-[100] w-12 h-12 bg-brand text-white rounded-full shadow-strong flex items-center justify-center hover:bg-brand-hover active:scale-95 transition-all"
        aria-label="Cambiar fondo"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Background Picker Panel */}
      {showBgPicker && (
        <div className="fixed bottom-20 right-4 z-[100] w-72 bg-surface rounded-2xl shadow-strong border border-outline overflow-hidden">
          <div className="p-4 border-b border-outline bg-surface-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">Cambiar fondo</h3>
              <span className="text-xs text-muted bg-warning-weak text-warning px-2 py-0.5 rounded-full">DEV</span>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto p-2">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setBackgroundPath(bg.path)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                  backgroundPath === bg.path
                    ? 'bg-brand-weak text-brand font-medium'
                    : 'text-foreground hover:bg-surface-2'
                }`}
              >
                <div 
                  className="w-10 h-10 rounded-lg border border-outline flex-shrink-0 bg-background"
                  style={{
                    backgroundImage: bg.path ? `url(${bg.path})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <span className="truncate">{bg.label}</span>
                {backgroundPath === bg.path && (
                  <svg className="w-4 h-4 ml-auto text-brand flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
