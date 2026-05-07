// Hará Match — Public professional directory
// Server component — no client JS required.
// Sorted by ranking_score DESC (computed by SQL trigger in migration 004).

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Chip } from '@/app/components/ui/Chip'
import { logError } from '@/lib/monitoring'
import { isEffectivelyDestacado } from '@/lib/ranking'

// Always render fresh — directory ranking + Destacado expiry change behind the scenes.
export const dynamic = 'force-dynamic'

interface DirectoryProfessional {
  slug: string
  full_name: string
  specialties: string[] | null
  modality: string[] | null
  short_description: string | null
  city: string | null
  country: string
  online_only: boolean
  profile_image_url: string | null
  price_range_min: number | null
  price_range_max: number | null
  currency: string | null
  rating_average: number | null
  rating_count: number | null
  subscription_tier: string | null
  tier_expires_at: string | null
}

function formatLocation(pro: DirectoryProfessional): string {
  if (pro.online_only) return 'Online'
  return [pro.city, pro.country].filter(Boolean).join(', ')
}

function formatPrice(pro: DirectoryProfessional): string | null {
  const { price_range_min: min, price_range_max: max, currency } = pro
  if (min == null && max == null) return null
  const cur = currency ?? 'USD'
  const fmt = (n: number) => `${cur === 'ARS' ? '$' : 'US$'}${n.toLocaleString('es-AR')}`
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`
  if (min != null) return `desde ${fmt(min)}`
  return `hasta ${fmt(max!)}`
}

function formatModality(pro: DirectoryProfessional): string | null {
  if (pro.online_only) return null // already shown as location
  const mods = pro.modality ?? []
  if (mods.length === 0) return null
  const labels = mods.map((m) => (m === 'online' ? 'Online' : m === 'presencial' ? 'Presencial' : m))
  return labels.join(' · ')
}

async function getProfessionals(): Promise<DirectoryProfessional[]> {
  const { data, error } = await supabaseAdmin
    .from('professionals')
    .select('slug, full_name, specialties, modality, short_description, city, country, online_only, profile_image_url, price_range_min, price_range_max, currency, rating_average, rating_count, subscription_tier, tier_expires_at')
    .eq('status', 'active')
    .eq('accepting_new_clients', true)
    .order('ranking_score', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    logError(error, { source: 'DirectoryPage.getProfessionals' })
    return []
  }

  return (data ?? []) as DirectoryProfessional[]
}

export default async function DirectoryPage() {
  const professionals = await getProfessionals()

  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 max-w-md md:max-w-[960px] mx-auto px-4 pt-8 pb-12 space-y-4">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profesionales</h1>
          <p className="text-sm text-muted mt-1">Elegí a quien querés contactar.</p>
        </div>

        {/* List */}
        {professionals.length === 0 ? (
          <GlassCard>
            <EmptyState
              title="Todavía no hay profesionales disponibles."
              description="Volvé pronto."
            />
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {professionals.map((pro) => (
              <ProfessionalCard key={pro.slug} professional={pro} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

function ProfessionalCard({ professional: pro }: { professional: DirectoryProfessional }) {
  const visibleSpecialties = (pro.specialties ?? []).slice(0, 3)
  const overflow = (pro.specialties?.length ?? 0) - visibleSpecialties.length
  const location = formatLocation(pro)
  const price = formatPrice(pro)
  const modality = formatModality(pro)
  const rating = Number(pro.rating_average ?? 0)
  const ratingCount = Number(pro.rating_count ?? 0)
  const isDestacado = isEffectivelyDestacado(pro.subscription_tier, pro.tier_expires_at)

  return (
    <article data-testid="professional-card" className="h-full">
      <Link href={`/p/${pro.slug}`} className="block h-full">
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-5 hover:shadow-strong transition-shadow h-full flex flex-col">

          {/* Top: avatar + identity */}
          <div className="flex items-start gap-3 mb-3">

            {/* Avatar */}
            <div className="flex-shrink-0">
              {pro.profile_image_url ? (
                <img
                  src={pro.profile_image_url}
                  alt={pro.full_name}
                  className="w-14 h-14 rounded-full object-cover shadow-soft border-2 border-white/60"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-weak to-info-weak flex items-center justify-center shadow-soft border-2 border-white/60">
                  <span className="text-xl font-semibold text-brand">
                    {pro.full_name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Identity column */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3
                  data-testid="professional-name"
                  className="text-sm font-semibold text-foreground truncate"
                >
                  {pro.full_name}
                </h3>
                {isDestacado && (
                  <span data-testid="destacado-chip">
                    <Chip variant="brand" label="Destacado" className="text-[10px] px-2 py-0.5" />
                  </span>
                )}
              </div>

              {ratingCount > 0 && (
                <p className="text-xs text-muted mt-0.5">
                  {rating.toFixed(1)} ★ · {ratingCount} {ratingCount === 1 ? 'reseña' : 'reseñas'}
                </p>
              )}
            </div>
          </div>

          {/* Short description */}
          {pro.short_description && (
            <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-3">
              {pro.short_description}
            </p>
          )}

          {/* Specialty chips */}
          {visibleSpecialties.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {visibleSpecialties.map((s) => (
                <Chip key={s} specialty={s} className="text-[11px] px-2 py-1" />
              ))}
              {overflow > 0 && (
                <span className="text-xs text-muted">+{overflow}</span>
              )}
            </div>
          )}

          {/* Bottom meta — pinned to bottom for visual alignment across cards */}
          <div className="mt-auto pt-2 space-y-1 text-xs text-muted">
            <p className="flex items-center gap-1.5">
              <span aria-hidden>📍</span>
              <span className="truncate">{location}</span>
            </p>
            {modality && (
              <p className="flex items-center gap-1.5">
                <span aria-hidden>💻</span>
                <span className="truncate">{modality}</span>
              </p>
            )}
            {price && (
              <p className="flex items-center gap-1.5">
                <span aria-hidden>💰</span>
                <span className="truncate">{price}</span>
              </p>
            )}
          </div>

        </div>
      </Link>
    </article>
  )
}
