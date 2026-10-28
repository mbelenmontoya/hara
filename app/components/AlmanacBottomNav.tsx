'use client'

// The almanac bottom bar (Claude Design 11a, 9e, 9g): Inicio, Buscar, Diario and Ayuda,
// with a dot and a darker label on the page you are on. It sits under the filter panels (z-40).
// Buscar opens the home search in place when the page passes onSearch; elsewhere it links to /#buscar.

import Link from 'next/link'
import { HOME_SEARCH_ANCHOR } from '@/lib/home-search'

export type AlmanacTab = 'inicio' | 'diario' | 'ayuda'

interface AlmanacBottomNavProps {
  active: AlmanacTab
  onSearch?: () => void
}

const TABS: { key: AlmanacTab | 'buscar'; label: string; href: string }[] = [
  { key: 'inicio', label: 'Inicio', href: '/' },
  { key: 'buscar', label: 'Buscar', href: `/#${HOME_SEARCH_ANCHOR}` },
  { key: 'diario', label: 'Diario', href: '/blog' },
  { key: 'ayuda', label: 'Ayuda', href: '/que-es-hara' },
]

// py-2 makes each tab a 44px touch target; the bar's padding is reduced by the same 8px to keep the design's 12px / 30px.
const ITEM = 'flex min-w-[56px] flex-col items-center gap-1.5 py-2'

function TabFace({ label, isActive }: { label: string; isActive: boolean }) {
  return (
    <>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-brand' : 'bg-transparent'}`} aria-hidden="true" />
      <span className={`text-[11.5px] tracking-[0.6px] ${isActive ? 'font-medium text-foreground' : 'font-normal text-muted'}`}>{label}</span>
    </>
  )
}

/** Fixed bottom navigation shared by the home, the Diario and Ayuda. */
export function AlmanacBottomNav({ active, onSearch }: AlmanacBottomNavProps) {
  return (
    <nav aria-label="Principal" className="font-almanac fixed inset-x-0 bottom-0 z-30 border-t border-foreground/10 bg-background/95 backdrop-blur-[16px]">
      <div className="mx-auto flex w-full max-w-md justify-between px-[26px] pb-[22px] pt-1 md:max-w-xl">
        {TABS.map((tab) => {
          const isActive = tab.key === active
          if (tab.key === 'buscar' && onSearch) {
            return (
              <button key={tab.key} type="button" onClick={onSearch} className={ITEM}>
                <TabFace label={tab.label} isActive={false} />
              </button>
            )
          }
          return (
            <Link key={tab.key} href={tab.href} aria-current={isActive ? 'page' : undefined} className={ITEM}>
              <TabFace label={tab.label} isActive={isActive} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
