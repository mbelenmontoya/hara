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

interface DirectoryProfessional {
  slug: string
  full_name: string
  specialties: string[] | null  // null-safe: DB arrays may be null even when typed non-nullable in schema
  city: string | null
  country: string
  online_only: boolean
  profile_image_url: string | null
}

function formatLocation(pro: DirectoryProfessional): string {
  if (pro.online_only) return 'Online'
  return [pro.city, pro.country].filter(Boolean).join(', ')
}

async function getProfessionals(): Promise<DirectoryProfessional[]> {
  const { data, error } = await supabaseAdmin
    .from('professionals')
    .select('slug, full_name, specialties, city, country, online_only, profile_image_url')
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

      <div className="relative z-10 max-w-md mx-auto px-4 pt-8 pb-12 space-y-4">

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
          <div className="space-y-3">
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

  return (
    <article data-testid="professional-card">
      <Link href={`/p/${pro.slug}`} className="block">
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-5 hover:shadow-strong transition-shadow">
          <div className="flex items-center gap-4">

            {/* Avatar — 56×56, mirrors /p/[slug]/page.tsx:135-148 scaled down */}
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

            {/* Info column */}
            <div className="min-w-0 flex-1">
              <h3
                data-testid="professional-name"
                className="text-sm font-semibold text-foreground truncate mb-1"
              >
                {pro.full_name}
              </h3>

              {visibleSpecialties.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  {visibleSpecialties.map((s) => (
                    <Chip key={s} specialty={s} className="text-[11px] px-2 py-1" />
                  ))}
                  {overflow > 0 && (
                    <span className="text-xs text-muted">+{overflow}</span>
                  )}
                </div>
              )}

              <p className="text-xs text-muted">{location}</p>
            </div>

            {/* Chevron — visual affordance for clickability */}
            <svg
              className="w-4 h-4 text-muted flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>

          </div>
        </div>
      </Link>
    </article>
  )
}
