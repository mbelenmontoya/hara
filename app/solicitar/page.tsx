// Concierge request form (/solicitar), server shell.
// Loads the same "¿Cómo llegás?" cards as the home, the other curated specialties as chips,
// and the latest Diario post for the confirmation's "Mientras tanto".
// force-dynamic: the counts come from live data; never statically prerendered.

export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAllPractices } from '@/lib/practices'
import { logError } from '@/lib/monitoring'
import { buildHomeData } from '@/lib/home-arrival'
import { getActiveProfessionals } from '@/lib/active-professionals'
import { CURATED_SPECIALTY_KEYS, SPECIALTY_MAP } from '@/lib/design-constants'
import { readingMinutes } from '@/lib/diario'
import type { ConciergeLatestPost } from '@/lib/concierge-request'
import { SolicitarForm } from './SolicitarForm'

/** The newest published Diario post, or null when there is none or the query fails. */
async function getLatestPost(): Promise<ConciergeLatestPost | null> {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('slug, title, cover_image_url, body_html')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logError(new Error(error.message), { source: 'SolicitarPage.getLatestPost' })
    return null
  }
  if (!data) return null
  return { slug: data.slug, title: data.title, coverUrl: data.cover_image_url, minutes: readingMinutes(data.body_html ?? '') }
}

export default async function SolicitarPage() {
  const [professionals, catalog, latestPost] = await Promise.all([
    getActiveProfessionals('SolicitarPage'),
    getAllPractices().catch((err: unknown) => {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'SolicitarPage.getAllPractices' })
      return []
    }),
    getLatestPost(),
  ])

  const { cards } = buildHomeData(professionals, catalog)
  const cardKeys = new Set(cards.map((c) => c.key))
  const situations = CURATED_SPECIALTY_KEYS.filter((key) => !cardKeys.has(key)).map((key) => ({ key, label: SPECIALTY_MAP[key] }))

  return <SolicitarForm cards={cards} situations={situations} latestPost={latestPost} />
}
