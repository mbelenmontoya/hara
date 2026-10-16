// Loads the active professionals who accept new clients, in ranking order.
// Shared by the home (/) and the concierge form (/solicitar), so both show the same "¿Cómo llegás?" cards.

import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'
import type { DirectoryProfessional } from '@/app/profesionales/components/ProfessionalsDirectory'

/** Active professionals accepting new clients, ranked; logs and returns [] on a query error. */
export async function getActiveProfessionals(source: string): Promise<DirectoryProfessional[]> {
  const { data, error } = await supabaseAdmin
    .from('professionals')
    .select('slug, full_name, short_description, profile_image_url, city, country, online_only, modality, latitude, longitude, ranking_score, practices, specialties, price_range_min, price_range_max, currency, rating_average, rating_count, subscription_tier, tier_expires_at')
    .eq('status', 'active')
    .eq('accepting_new_clients', true)
    .order('ranking_score', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    logError(error, { source: `${source}.getActiveProfessionals` })
    return []
  }

  return (data ?? []).map((p) => ({
    ...p,
    rating_average: p.rating_average == null ? null : Number(p.rating_average),
    rating_count: p.rating_count == null ? null : Number(p.rating_count),
    latitude: p.latitude == null ? null : Number(p.latitude),
    longitude: p.longitude == null ? null : Number(p.longitude),
    ranking_score: p.ranking_score == null ? null : Number(p.ranking_score),
  })) as DirectoryProfessional[]
}
