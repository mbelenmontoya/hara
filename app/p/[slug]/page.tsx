// Hara Vital - Professional Profile Page
// force-dynamic: calls getAllPractices() at render time; must not be statically prerendered.
// Uses getAllPractices (not getActivePractices) so deactivated practices on
// existing pros still render with their human label, not the raw key.

export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MODALITY_MAP, SERVICE_TYPE_MAP } from '@/lib/design-constants'
import { getAllPractices } from '@/lib/practices'
import { resolveProfileSpecialties } from '@/lib/profile-specialties'
import { isEffectivelyDestacado } from '@/lib/ranking'
import { ProfileViewTracker } from './components/ProfileViewTracker'
import { ProfileHero } from './components/ProfileHero'
import { ProfileFacts } from './components/ProfileFacts'
import { ProfileAbout } from './components/ProfileAbout'
import { ProfileContact } from './components/ProfileContact'
import { ProfileLocation } from './components/ProfileLocation'
import { ProfileDetails, ProfileDetailRows } from './components/ProfileDetails'
import { ProfileReviews } from './components/ProfileReviews'
import { ProfileReviewForm } from './components/ProfileReviewForm'
import { ProfilePosts } from './components/ProfilePosts'
import type { Professional, Review } from './types'

async function getProfessional(slug: string): Promise<Professional | null> {
  const { data, error } = await supabaseAdmin
    .from('professionals')
    .select('id, slug, full_name, specialties, modality, practices, bio, short_description, experience_description, instagram, email, service_type, offers_courses_online, courses_presencial_location, whatsapp, country, city, online_only, price_range_min, price_range_max, currency, accepting_new_clients, profile_image_url, subscription_tier, tier_expires_at, rating_average, rating_count')
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
    email: data.email,
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

  // Fetch confirmed published posts by this professional (limit 10)
  const { data: blogPostsData } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title, published_at')
    .eq('professional_id', professional.id)
    .eq('status', 'published')
    .eq('professional_link_confirmed', true)
    .order('published_at', { ascending: false })
    .limit(10)
  const blogPosts = (blogPostsData ?? []) as { id: string; slug: string; title: string; published_at: string | null }[]

  const practiceLabelMap = Object.fromEntries(catalogPractices.map((p) => [p.key, p.label]))
  const modalityLabels = professional.modality.map((m) => MODALITY_MAP[m] || m)
  const resolved = resolveProfileSpecialties(
    { practiceKeys: professional.practices, specialties: professional.specialties },
    catalogPractices
  )
  const primaryPractice = resolved.practiceKeys[0] ? practiceLabelMap[resolved.practiceKeys[0]] ?? null : null
  const serviceTypeLabels = professional.service_type.map((s) => SERVICE_TYPE_MAP[s] || s)
  const location = formatLocation(professional.country, professional.city, professional.online_only)
  const isDestacado = isEffectivelyDestacado(professional.subscription_tier, professional.tier_expires_at)

  const fromPath = searchParams.from
  const backHref = fromPath && fromPath.startsWith('/r/') ? fromPath : '/'
  const backLabel = fromPath && fromPath.startsWith('/r/') ? 'Volver a recomendaciones' : 'Ir al inicio'

  const hasPresencialLocation = !professional.online_only && !!professional.city

  return (
    <div className="min-h-screen bg-background font-almanac text-foreground" data-testid="professional-profile">
      <ProfileViewTracker slug={professional.slug} />

      <div className="mx-auto w-full max-w-md px-5 pb-32 pt-4 md:max-w-xl">
        <a
          href={backHref}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-foreground transition-opacity hover:opacity-80"
          aria-label={backLabel}
          title={backLabel}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>

        <ProfileHero
          name={professional.name}
          shortDescription={professional.short_description}
          profileImageUrl={professional.profile_image_url}
          location={location}
          primaryPractice={primaryPractice}
          isDestacado={isDestacado}
        />

        <div className="mt-5">
          <ProfileFacts
            ratingAverage={professional.rating_average}
            ratingCount={professional.rating_count}
            priceMin={professional.price_range_min}
            priceMax={professional.price_range_max}
            currency={professional.currency}
            acceptingNewClients={professional.accepting_new_clients}
          />
        </div>

        <div className="mt-4">
          <ProfileContact
            slug={professional.slug}
            name={professional.name}
            whatsapp={professional.whatsapp}
            instagram={professional.instagram}
            email={professional.email}
          />
        </div>

        <div className="mt-10 space-y-9">
          <ProfileDetails specialties={resolved.specialtyKeys} />

          <ProfileAbout
            bio={professional.bio}
            experienceDescription={professional.experience_description}
          />

          <ProfileDetailRows
            serviceTypeLabels={serviceTypeLabels}
            modalityLabels={modalityLabels}
            location={location}
          />

          {hasPresencialLocation && (
            <ProfileLocation
              city={professional.city}
              location={location}
              onlineOnly={professional.online_only}
            />
          )}

          <ProfileReviews
            ratingAverage={professional.rating_average}
            ratingCount={professional.rating_count}
            reviews={reviews}
          />

          {blogPosts.length > 0 && (
            <ProfilePosts
              posts={blogPosts}
              firstName={professional.name.split(' ')[0]}
            />
          )}

          <ProfileReviewForm professionalSlug={professional.slug} />

          <p className="text-center text-xs text-muted">
            Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
          </p>
        </div>
      </div>
    </div>
  )
}
