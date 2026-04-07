// Hará Match - Professional Profile Page
// Purpose: Public profile view for professionals
// Design: 5 glass cards grouping info by user questions

import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ContactButton } from '@/app/components/ContactButton'
import { Chip } from '@/app/components/ui/Chip'
import { MODALITY_MAP, STYLE_MAP, SERVICE_TYPE_MAP } from '@/lib/design-constants'
import { PageBackground } from '@/app/components/ui/PageBackground'

interface Professional {
  slug: string
  name: string
  specialties: string[]
  modality: string[]
  style: string[] | null
  bio: string | null
  short_description: string | null
  experience_description: string | null
  instagram: string | null
  service_type: string[]
  offers_courses_online: boolean
  courses_presencial_location: string | null
  whatsapp: string
  country: string
  city: string | null
  online_only: boolean
  price_range_min: number | null
  price_range_max: number | null
  currency: string
  accepting_new_clients: boolean
  profile_image_url: string | null
}


async function getProfessional(slug: string): Promise<Professional | null> {
  const { data, error } = await supabaseAdmin
    .from('professionals')
    .select('slug, full_name, specialties, modality, style, bio, short_description, experience_description, instagram, service_type, offers_courses_online, courses_presencial_location, whatsapp, country, city, online_only, price_range_min, price_range_max, currency, accepting_new_clients, profile_image_url')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return null

  return {
    slug: data.slug,
    name: data.full_name,
    specialties: data.specialties,
    modality: data.modality,
    style: data.style,
    bio: data.bio,
    short_description: data.short_description,
    experience_description: data.experience_description,
    instagram: data.instagram,
    service_type: data.service_type ?? [],
    offers_courses_online: data.offers_courses_online ?? false,
    courses_presencial_location: data.courses_presencial_location,
    whatsapp: data.whatsapp,
    country: data.country,
    city: data.city,
    online_only: data.online_only,
    price_range_min: data.price_range_min,
    price_range_max: data.price_range_max,
    currency: data.currency ?? 'USD',
    accepting_new_clients: data.accepting_new_clients,
    profile_image_url: data.profile_image_url,
  }
}

function formatPrice(min: number | null, max: number | null, currency: string): string | null {
  if (!min && !max) return null
  if (min && max) return `${currency} ${min} – ${max}`
  if (min) return `Desde ${currency} ${min}`
  if (max) return `Hasta ${currency} ${max}`
  return null
}

function formatLocation(country: string, city: string | null, onlineOnly: boolean): string {
  if (onlineOnly) return 'Solo online'
  const parts = [city, country].filter(Boolean)
  return parts.join(', ')
}

export default async function ProfessionalProfilePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { from?: string }
}) {
  const professional = await getProfessional(params.slug)

  if (!professional) {
    notFound()
  }

  // Back link: if from recommendations, go back there. Otherwise go home.
  const fromPath = searchParams.from
  const backHref = fromPath && fromPath.startsWith('/r/') ? fromPath : '/'
  const backLabel = fromPath && fromPath.startsWith('/r/') ? 'Volver a recomendaciones' : 'Ir al inicio'


  const modalityLabels = professional.modality.map(m => MODALITY_MAP[m] || m)
  const styleLabels = (professional.style || []).map(s => STYLE_MAP[s] || s)
  const serviceTypeLabels = professional.service_type.map(s => SERVICE_TYPE_MAP[s] || s)
  const location = formatLocation(professional.country, professional.city, professional.online_only)
  const priceRange = formatPrice(professional.price_range_min, professional.price_range_max, professional.currency)

  return (
    <div className="min-h-screen bg-background" data-testid="professional-profile">
      <PageBackground />

      {/* Content */}
      <div className="relative z-10 max-w-md mx-auto px-4 pt-8 pb-12 space-y-4">

        {/* Back button */}
        <a
          href={backHref}
          className="inline-flex items-center gap-2 px-4 py-2 liquid-glass rounded-full shadow-soft border border-outline/30 text-sm text-foreground hover:shadow-elevated transition-shadow"
          aria-label={backLabel}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </a>

        {/* Card 1: Identity — "Who is this person?" */}
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">

          {/* Avatar */}
          <div className="flex justify-center mb-4">
            {professional.profile_image_url ? (
              <img
                src={professional.profile_image_url}
                alt={professional.name}
                className="w-20 h-20 rounded-full object-cover shadow-soft border-2 border-white/60"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-weak to-info-weak flex items-center justify-center shadow-soft border-2 border-white/60">
                <span className="text-2xl font-semibold text-brand">
                  {professional.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-foreground text-center mb-1">
            {professional.name}
          </h1>

          {/* Short description */}
          {professional.short_description && (
            <p className="text-sm text-muted text-center italic mb-3">
              {professional.short_description}
            </p>
          )}

          {/* Location */}
          <p className="text-sm text-muted text-center mb-4">
            <svg className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {location}
          </p>

          {/* Accepting clients */}
          {professional.accepting_new_clients && (
            <div className="flex justify-center">
              <Chip label="Aceptando nuevos pacientes" variant="success" />
            </div>
          )}
        </div>

        {/* Card 2: Expertise — "Can they help me?" */}
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Especialidades</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {professional.specialties.map(s => (
              <Chip key={s} specialty={s} />
            ))}
          </div>

          {styleLabels.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Enfoque terapéutico</h3>
              <p className="text-sm text-foreground">{styleLabels.join(', ')}</p>
            </div>
          )}

          {serviceTypeLabels.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Tipo de servicio</h3>
              <p className="text-sm text-foreground">{serviceTypeLabels.join(' & ')}</p>
            </div>
          )}
        </div>

        {/* Card 3: About — "What's their approach?" */}
        {(professional.bio || professional.experience_description) && (
          <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">

            {professional.bio && (
              <div className={professional.experience_description ? 'mb-6' : ''}>
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Sobre mí</h2>
                <p className="text-sm text-foreground leading-relaxed">{professional.bio}</p>
              </div>
            )}

            {professional.experience_description && (
              <div>
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Sobre la experiencia</h2>
                <p className="text-sm text-foreground leading-relaxed">{professional.experience_description}</p>
              </div>
            )}
          </div>
        )}

        {/* Card 4: Logistics — "How do I see them?" */}
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Modalidad</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {modalityLabels.map(label => (
              <Chip key={label} label={label} variant="neutral" />
            ))}
          </div>

          {!professional.online_only && professional.city && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Ubicación presencial</h3>
              <p className="text-sm text-foreground">{location}</p>
            </div>
          )}

          {priceRange && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Rango de precios</h3>
              <p className="text-sm text-foreground">{priceRange}</p>
            </div>
          )}

          {(professional.offers_courses_online || professional.courses_presencial_location) && (
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Cursos</h3>
              <div className="space-y-1">
                {professional.offers_courses_online && (
                  <p className="text-sm text-foreground">Online</p>
                )}
                {professional.courses_presencial_location && (
                  <p className="text-sm text-foreground">Presenciales — {professional.courses_presencial_location}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card 5: Contact — "How do I reach them?" */}
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Contacto</h2>

          <div className="space-y-3 mb-6">
            <div>
              <h3 className="text-xs text-muted mb-1">WhatsApp</h3>
              <p className="text-sm text-foreground">{professional.whatsapp}</p>
            </div>

            {professional.instagram && (
              <div>
                <h3 className="text-xs text-muted mb-1">Instagram</h3>
                <a
                  href={professional.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand hover:underline"
                >
                  {professional.instagram.replace('https://www.instagram.com/', '@').replace(/[?/].*$/, '')}
                </a>
              </div>
            )}
          </div>

          <ContactButton
            professionalSlug={professional.slug}
            professionalName={professional.name}
            whatsappNumber={professional.whatsapp}
            trackingCode="direct-profile-visit"
            rank={0}
            className="w-full"
          />
        </div>

        {/* Privacy */}
        <p className="text-xs text-muted text-center pt-2">
          Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
        </p>

      </div>
    </div>
  )
}
