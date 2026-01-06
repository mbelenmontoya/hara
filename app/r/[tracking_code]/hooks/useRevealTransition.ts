// Hook for managing reveal to deck transition animation
// Handles animation state and timing

import { useState } from 'react'

// Transition timing (from INTERACTION CONSTANTS)
const REVEAL_TO_DECK_TRANSITION_MS = 420

interface UseRevealTransitionResult {
  revealing: boolean
  isTransitioning: boolean
  startTransition: () => void
}

/**
 * Manages the reveal screen to deck view transition
 * Coordinates animation states and timing
 * @returns Reveal state, transition state, and trigger function
 */
export function useRevealTransition(): UseRevealTransitionResult {
  const [revealing, setRevealing] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

  function startTransition() {
    setIsTransitioning(true)

    // After animation completes, finalize transition
    setTimeout(() => {
      setRevealing(false)
      setIsTransitioning(false)
    }, REVEAL_TO_DECK_TRANSITION_MS)
  }

  return {
    revealing,
    isTransitioning,
    startTransition,
  }
}
