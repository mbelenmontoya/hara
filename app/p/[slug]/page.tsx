// Hara Vital - Professional Profile Page
// force-dynamic: calls getAllPractices() at render time; must not be statically prerendered.
// Uses getAllPractices (not getActivePractices) so deactivated practices on
// existing pros still render with their human label, not the raw key.

export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MODALITY_MAP, SERVICE_TYPE_MAP } from '@/lib/design-constants'
import { getAllPractices } from '@/lib/practices'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { isEffectivelyDestacado } from '@/lib/ranking'
import { ProfileHero } from './components/ProfileHero'
import { ProfileExpertise } from './components/ProfileExpertise'
import { ProfileAbout } from './components/ProfileAbout'
import { ProfileReviews } from './components/ProfileReviews'
import { ProfileLogistics } from './components/ProfileLogistics'
import { ProfileContact } from './components/ProfileContact'
import { RevealOnScroll } from '@/app/components/ui/RevealOnScroll'
import type { Professional, Review } from './types'

async function getProfessional(slug: string): Promise<Professional | null> {
  const { data, error } = await supabaseAdmin
    .from('professionals')
    .select('id, slug, full_name, specialties, modality, practices, bio, short_description, experience_description, instagram, service_type, offers_courses_online, courses_presencial_location, whatsapp, country, city, online_only, price_range_min, price_range_max, currency, accepting_new_clients, profile_image_url, subscription_tier, tier_expires_at, rating_average, rating_count')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    slug: data.slug,
    name: data.full_name,
    specialties: data.specialties,
    modality: data.modality,
    practices: data.practices ?? [],
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
    subscription_tier: data.subscription_tier ?? null,
    tier_expires_at: data.tier_expires_at ?? null,
    rating_average: Number(data.rating_average ?? 0),
    rating_count: Number(data.rating_count ?? 0),
  }
}

async function getRecentReviews(professionalId: string): Promise<Review[]> {
  const { data } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, text, reviewer_name, submitted_at')
    .eq('professional_id', professionalId)
    .eq('is_hidden', false)
    .order('submitted_at', { ascending: false })
    .limit(5)
  return (data ?? []) as Review[]
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
  return [city, country].filter(Boolean).join(', ')
}

export default async function ProfessionalProfilePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { from?: string }
}) {
  const professional = await getProfessional(params.slug)
  if (!professional) notFound()

  const reviews = await getRecentReviews(professional.id)
  const catalogPractices = await getAllPractices()

  const practiceLabelMap = Object.fromEntries(catalogPractices.map((p) => [p.key, p.label]))
  const modalityLabels = professional.modality.map((m) => MODALITY_MAP[m] || m)
  const practiceLabels = professional.practices.map((k) => practiceLabelMap[k] ?? k)
  const serviceTypeLabels = professional.service_type.map((s) => SERVICE_TYPE_MAP[s] || s)
  const location = formatLocation(professional.country, professional.city, professional.online_only)
  const priceRange = formatPrice(professional.price_range_min, professional.price_range_max, professional.currency)
  const isDestacado = isEffectivelyDestacado(professional.subscription_tier, professional.tier_expires_at)

  const fromPath = searchParams.from
  const backHref = fromPath && fromPath.startsWith('/r/') ? fromPath : '/'
  const backLabel = fromPath && fromPath.startsWith('/r/') ? 'Volver a recomendaciones' : 'Ir al inicio'
  const showReviewCapture = !fromPath?.startsWith('/r/')

  return (
    <div className="min-h-screen bg-background" data-testid="professional-profile">
      <PageBackground />

      <div className="relative z-10 container-public pt-8 pb-12 space-y-4">

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

        {/* Two-column on desktop: left = content, right = sticky contact sidebar */}
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start space-y-4 lg:space-y-0">

          {/* Left column */}
          <div className="space-y-4">
            {/* ProfileHero is above the fold — no reveal */}
            <ProfileHero
              name={professional.name}
              shortDescription={professional.short_description}
              profileImageUrl={professional.profile_image_url}
              location={location}
              acceptingNewClients={professional.accepting_new_clients}
              isDestacado={isDestacado}
            />

            <RevealOnScroll delay={0}>
              <ProfileExpertise
                specialties={professional.specialties}
                practiceLabels={practiceLabels}
                serviceTypeLabels={serviceTypeLabels}
              />
            </RevealOnScroll>

            <RevealOnScroll delay={100}>
              <ProfileAbout
                bio={professional.bio}
                experienceDescription={professional.experience_description}
              />
            </RevealOnScroll>

            <RevealOnScroll delay={200}>
              <ProfileReviews
                ratingAverage={professional.rating_average}
                ratingCount={professional.rating_count}
                reviews={reviews}
              />
            </RevealOnScroll>

            <RevealOnScroll delay={300}>
              <ProfileLogistics
                modalityLabels={modalityLabels}
                location={location}
                onlineOnly={professional.online_only}
                city={professional.city}
                priceRange={priceRange}
                offersCoursesOnline={professional.offers_courses_online}
                coursesPresencialLocation={professional.courses_presencial_location}
              />
            </RevealOnScroll>
          </div>

          {/* Right column — sticky contact card on desktop, inline on mobile */}
          <div className="lg:sticky lg:top-8">
            <RevealOnScroll delay={100}>
              <ProfileContact
                slug={professional.slug}
                name={professional.name}
                whatsapp={professional.whatsapp}
                instagram={professional.instagram}
                showReviewCapture={showReviewCapture}
              />
            </RevealOnScroll>
          </div>

        </div>

        <p className="text-xs text-muted text-center pt-2">
          Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
        </p>

      </div>
    </div>
  )
}
