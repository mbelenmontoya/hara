// Custom hook to detect desktop vs mobile viewport
// Used to conditionally render reveal screen (mobile only)

'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect if viewport matches a media query
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(query)

    // Set initial value
    setMatches(mediaQuery.matches)

    // Update on changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}

/**
 * Convenience hook for desktop detection
 * Desktop is defined as viewport width >= 768px
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
