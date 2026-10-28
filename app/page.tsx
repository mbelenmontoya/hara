// Hara Vital — Home (almanac design 7a).
// Server component: loads the active professionals (same query and ranking as the directory),
// turns them into the four "¿Cómo llegas hoy?" cards and a list, and renders the masthead.

import Image from 'next/image'
import { getAllPractices } from '@/lib/practices'
import { logError } from '@/lib/monitoring'
import { buildHomeData, featuredPicks } from '@/lib/home-arrival'
import { getActiveProfessionals } from '@/lib/active-professionals'
import { formatAlmanacDate, getMoonPhase } from '@/lib/moon-phase'
import { HomeArrival } from './HomeArrival'
import { HomeConcierge } from './HomeConcierge'
import { HomeBottomNav, HomeSearchProvider } from './HomeSearch'

// Always render fresh: ranking and Destacado expiry change behind the scenes, and so does the date.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [professionals, catalog] = await Promise.all([
    getActiveProfessionals('HomePage'),
    getAllPractices().catch((err: unknown) => {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'HomePage.getAllPractices' })
      return []
    }),
  ])

  const { cards, rows } = buildHomeData(professionals, catalog)
  const today = new Date()
  const moon = getMoonPhase(today)

  return (
    <HomeSearchProvider>
      <main className="min-h-screen bg-background font-almanac text-foreground">
        <div className="mx-auto w-full max-w-md px-[22px] pb-[110px] pt-6 md:max-w-xl">
          <div className="flex justify-center">
            <Image
              src="/assets/logo/logoreduccion.png"
              alt="Hara"
              width={66}
              height={53}
              priority
              className="h-11 w-auto object-contain"
            />
          </div>

          <div className="mt-[18px] flex items-center gap-2.5 border-y border-outline py-2.5">
            <span className="almanac-label flex-1">{formatAlmanacDate(today)}</span>
            {moon.crescent && (
              <img src="/assets/almanac/luna_creciente-ink.svg" alt="" aria-hidden="true" className="h-3.5 w-3 object-contain" />
            )}
            <span className="almanac-label">{moon.label}</span>
          </div>

          <h1 className="font-almanac-serif mt-[26px] text-[44px] leading-none tracking-tight">
            Hola.
            <br />
            ¿Cómo <em className="text-brand">estás</em> hoy?
          </h1>

          <HomeArrival cards={cards} rows={rows} professionals={professionals} practices={catalog.filter((p) => p.active)} featuredPicks={featuredPicks(rows)}>
            <HomeConcierge />
          </HomeArrival>
        </div>
      </main>
      <HomeBottomNav />
    </HomeSearchProvider>
  )
}
