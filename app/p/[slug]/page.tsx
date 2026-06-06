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
import { ProfileViewTracker } from './components/ProfileViewTracker'
import { ProfileHero } from './components/ProfileHero'
import { ProfileAbout } from './components/ProfileAbout'
import { ProfileContact } from './components/ProfileContact'
import { ProfileLocation } from './components/ProfileLocation'
import { ProfileDetails } from './components/ProfileDetails'
import { ProfileReviews } from './components/ProfileReviews'
import { ProfileReviewForm } from './components/ProfileReviewForm'
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
  const isDestacado = isEffectivelyDestacado(professional.subscription_tier, professional.tier_expires_at)

  const fromPath = searchParams.from
  const backHref = fromPath && fromPath.startsWith('/r/') ? fromPath : '/'
  const backLabel = fromPath && fromPath.startsWith('/r/') ? 'Volver a recomendaciones' : 'Ir al inicio'

  const hasPresencialLocation = !professional.online_only && !!professional.city

  return (
    <div className="min-h-screen bg-background" data-testid="professional-profile">
      <PageBackground />
      <ProfileViewTracker slug={professional.slug} />

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

        {/* 1. Full-width hero */}
        <ProfileHero
          name={professional.name}
          shortDescription={professional.short_description}
          profileImageUrl={professional.profile_image_url}
          location={location}
          acceptingNewClients={professional.accepting_new_clients}
          isDestacado={isDestacado}
          ratingAverage={professional.rating_average}
          ratingCount={professional.rating_count}
        />

        {/* 2. Two-column: Sobre mí (left) | Contacto sticky (right) */}
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 space-y-4 lg:space-y-0">
          <RevealOnScroll delay={0}>
            <ProfileAbout
              bio={professional.bio}
              experienceDescription={professional.experience_description}
            />
          </RevealOnScroll>
          <div className="lg:sticky lg:top-8">
            <RevealOnScroll delay={0}>
              <ProfileContact
                slug={professional.slug}
                name={professional.name}
                whatsapp={professional.whatsapp}
                instagram={professional.instagram}
              />
            </RevealOnScroll>
          </div>
        </div>

        {/* 3. Ubicación (left) | Detalles (right) — or Detalles full-width when online-only */}
        {hasPresencialLocation ? (
          <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 space-y-4 lg:space-y-0">
            <RevealOnScroll delay={0}>
              <ProfileLocation
                city={professional.city}
                location={location}
                onlineOnly={professional.online_only}
              />
            </RevealOnScroll>
            <RevealOnScroll delay={0}>
              <ProfileDetails
                specialties={professional.specialties}
                practiceLabels={practiceLabels}
                serviceTypeLabels={serviceTypeLabels}
                modalityLabels={modalityLabels}
              />
            </RevealOnScroll>
          </div>
        ) : (
          <RevealOnScroll delay={0}>
            <ProfileDetails
              specialties={professional.specialties}
              practiceLabels={practiceLabels}
              serviceTypeLabels={serviceTypeLabels}
              modalityLabels={modalityLabels}
            />
          </RevealOnScroll>
        )}

        {/* 4. Full-width: existing reviews (hidden when none) */}
        <RevealOnScroll delay={0}>
          <ProfileReviews
            ratingAverage={professional.rating_average}
            ratingCount={professional.rating_count}
            reviews={reviews}
          />
        </RevealOnScroll>

        {/* 5. Full-width: open review form */}
        <ProfileReviewForm professionalSlug={professional.slug} />

        <p className="text-xs text-muted text-center pt-2">
          Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
        </p>

      </div>
    </div>
  )
}
