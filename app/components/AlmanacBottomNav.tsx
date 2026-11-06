'use client'

// The almanac bottom bar with public navigation and one professional account entry,
// with a dot and a darker label on the page you are on. It sits under the filter panels (z-40).

import Link from 'next/link'

export type AlmanacTab = 'inicio' | 'diario' | 'ayuda'

interface AlmanacBottomNavProps {
  active: AlmanacTab
}

const TABS: { key: AlmanacTab | 'ingresar'; label: string; href: string }[] = [
  { key: 'inicio', label: 'Inicio', href: '/' },
  { key: 'diario', label: 'Diario', href: '/blog' },
  { key: 'ayuda', label: 'Ayuda', href: '/que-es-hara' },
  { key: 'ingresar', label: 'Ingresar', href: '/pro/login' },
]

// py-2 makes each tab a 44px touch target; the bar's padding is reduced by the same 8px to keep the design's 12px / 30px.
const ITEM = 'flex min-w-0 flex-col items-center gap-1.5 py-2'

function TabFace({ label, isActive }: { label: string; isActive: boolean }) {
  return (
    <>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-brand' : 'bg-transparent'}`} aria-hidden="true" />
      <span className={`whitespace-nowrap text-[11.5px] tracking-[0.6px] ${isActive ? 'font-medium text-foreground' : 'font-normal text-muted'}`}>{label}</span>
    </>
  )
}

/** Fixed bottom navigation shared by the home, the Diario and Ayuda. */
export function AlmanacBottomNav({ active }: AlmanacBottomNavProps) {
  return (
    <nav aria-label="Principal" className="font-almanac fixed inset-x-0 bottom-0 z-30 border-t border-foreground/10 bg-background/95 backdrop-blur-[16px]">
      <div className="mx-auto grid w-full max-w-md grid-cols-4 px-3 pb-[22px] pt-1 md:max-w-xl">
        {TABS.map((tab) => {
          const isActive = tab.key === active
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
