// Hara Vital — Public professional directory
// Server component — fetches professionals + practices catalog in parallel.
// Sorted by ranking_score DESC (computed by SQL trigger in migration 004).

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getActivePractices } from '@/lib/practices'
import { logError } from '@/lib/monitoring'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { ProfessionalsDirectory } from './components/ProfessionalsDirectory'
import { ContactFooterForm } from '@/app/components/ContactFooterForm'
import type { DirectoryProfessional } from './components/ProfessionalsDirectory'

// Always render fresh — directory ranking + Destacado expiry change behind the scenes.
export const dynamic = 'force-dynamic'

async function getProfessionals(): Promise<DirectoryProfessional[]> {
  const { data, error } = await supabaseAdmin
    .from('professionals')
    .select('slug, full_name, specialties, practices, modality, short_description, city, country, latitude, longitude, online_only, profile_image_url, price_range_min, price_range_max, currency, rating_average, rating_count, subscription_tier, tier_expires_at, ranking_score')
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
  const [professionals, practices] = await Promise.all([
    getProfessionals(),
    getActivePractices().catch((err: unknown) => {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'DirectoryPage.getActivePractices' })
      return []
    }),
  ])

  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 container-public pt-8 pb-12 space-y-4">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profesionales</h1>
          <p className="text-sm text-muted mt-1">Elegí a quien querés contactar.</p>
        </div>

        {/* Directory — search + grid */}
        <ProfessionalsDirectory professionals={professionals} practices={practices} />

        {/* Contact footer */}
        <ContactFooterForm />

      </div>
    </div>
  )
}
