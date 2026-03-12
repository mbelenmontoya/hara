// Hook for managing reveal to deck transition animation
// Handles animation state and timing
// Uses sessionStorage to skip reveal on revisits within the same session

import { useState } from 'react'

// Transition timing (from INTERACTION CONSTANTS)
const REVEAL_TO_DECK_TRANSITION_MS = 420

// sessionStorage key prefix for tracking which codes have been revealed
const REVEALED_KEY_PREFIX = 'hara_revealed_'

function hasBeenRevealed(trackingCode: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(`${REVEALED_KEY_PREFIX}${trackingCode}`) === 'true'
  } catch {
    return false
  }
}

function markAsRevealed(trackingCode: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(`${REVEALED_KEY_PREFIX}${trackingCode}`, 'true')
  } catch {
    // sessionStorage unavailable — reveal will show again, not critical
  }
}

interface UseRevealTransitionResult {
  revealing: boolean
  isTransitioning: boolean
  startTransition: () => void
}

/**
 * Manages the reveal screen to deck view transition
 * Coordinates animation states and timing
 * Skips reveal if user already saw it this session (e.g. returning from profile page)
 * @param trackingCode - The current tracking code to check session history
 * @returns Reveal state, transition state, and trigger function
 */
export function useRevealTransition(trackingCode: string): UseRevealTransitionResult {
  const [revealing, setRevealing] = useState(() => !hasBeenRevealed(trackingCode))
  const [isTransitioning, setIsTransitioning] = useState(false)

  function startTransition() {
    setIsTransitioning(true)

    // After animation completes, finalize transition and remember for this session
    setTimeout(() => {
      setRevealing(false)
      setIsTransitioning(false)
      markAsRevealed(trackingCode)
    }, REVEAL_TO_DECK_TRANSITION_MS)
  }

  return {
    revealing,
    isTransitioning,
    startTransition,
  }
}
