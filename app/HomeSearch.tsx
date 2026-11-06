'use client'

// Whether the home search field is open, shared by everything that can open it:
// the dark button in the filter bar and Buscar in the bottom bar.
// Opening it brings the sticky filter bar into view. Other pages link to /#buscar to arrive with it open.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { HOME_SEARCH_ANCHOR } from '@/lib/home-search'

interface HomeSearch {
  searching: boolean
  openSearch: () => void
  closeSearch: () => void
}

const HomeSearchContext = createContext<HomeSearch | null>(null)

function scrollToBar(animate: boolean) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(HOME_SEARCH_ANCHOR)?.scrollIntoView({ behavior: animate && !reduce ? 'smooth' : 'auto', block: 'start' })
}

/** Holds the open state for the home search; wrap the whole home column in it. */
export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [searching, setSearching] = useState(false)
  // A scroll waiting for the field to render: focusing it moves the page, so the scroll has to come after.
  const [pendingScroll, setPendingScroll] = useState<{ animate: boolean } | null>(null)

  const openSearch = useCallback(() => {
    setSearching(true)
    setPendingScroll({ animate: true })
  }, [])
  const closeSearch = useCallback(() => setSearching(false), [])

  useEffect(() => {
    if (window.location.hash !== `#${HOME_SEARCH_ANCHOR}`) return
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    // Arriving from another page: jump straight to the bar, there is nothing to animate from.
    setSearching(true)
    setPendingScroll({ animate: false })
  }, [])

  useEffect(() => {
    if (!pendingScroll) return
    scrollToBar(pendingScroll.animate)
    setPendingScroll(null)
  }, [pendingScroll])

  const value = useMemo(() => ({ searching, openSearch, closeSearch }), [searching, openSearch, closeSearch])
  return <HomeSearchContext.Provider value={value}>{children}</HomeSearchContext.Provider>
}

/** The shared search state; only valid inside HomeSearchProvider. */
export function useHomeSearch(): HomeSearch {
  const ctx = useContext(HomeSearchContext)
  if (!ctx) throw new Error('useHomeSearch must be used inside HomeSearchProvider')
  return ctx
}

/** The 15px magnifier used by every search button on the home. */
export function Magnifier({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 15 15" className={`h-[15px] w-[15px] flex-none ${className}`} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="4.7" />
      <path d="M9.3 9.5 14 14" />
    </svg>
  )
}
