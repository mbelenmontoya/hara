// Hook for handling touch-based swipe gestures
// Manages touch events and navigation between cards

import { useState } from 'react'

// Swipe gesture threshold (from INTERACTION CONSTANTS)
const SWIPE_THRESHOLD_PX = 70

interface UseSwipeGestureProps {
  currentIndex: number
  maxIndex: number
  onNavigate: (newIndex: number) => void
}

interface UseSwipeGestureResult {
  dragOffset: number
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: () => void
}

/**
 * Manages swipe gesture state and navigation
 * @param currentIndex - Current card index
 * @param maxIndex - Maximum card index (length - 1)
 * @param onNavigate - Callback when navigation occurs
 * @returns Touch event handlers and drag offset state
 */
export function useSwipeGesture({
  currentIndex,
  maxIndex,
  onNavigate,
}: UseSwipeGestureProps): UseSwipeGestureResult {
  const [touchStartX, setTouchStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX)
    setDragOffset(0)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartX) return
    setDragOffset(e.touches[0].clientX - touchStartX)
  }

  function handleTouchEnd() {
    if (Math.abs(dragOffset) > SWIPE_THRESHOLD_PX) {
      // Swipe left (negative offset) - go to next card
      if (dragOffset < 0 && currentIndex < maxIndex) {
        onNavigate(currentIndex + 1)
      }
      // Swipe right (positive offset) - go to previous card
      else if (dragOffset > 0 && currentIndex > 0) {
        onNavigate(currentIndex - 1)
      }
    }

    setDragOffset(0)
    setTouchStartX(0)
  }

  return {
    dragOffset,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
