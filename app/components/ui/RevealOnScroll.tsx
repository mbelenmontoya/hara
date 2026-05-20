'use client'

// Wraps children in a fade-up reveal triggered when the element scrolls into view.
// Uses IntersectionObserver; unobserves after first reveal so scroll-back does not re-hide.
// Respects prefers-reduced-motion — shows content immediately with no animation.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TRANSITION_EASING } from '@/lib/design-constants'

interface RevealOnScrollProps {
  children: ReactNode
  delay?: number // ms stagger delay, e.g. 100, 200
  className?: string
}

export function RevealOnScroll({ children, delay = 0, className }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)

    if (mq.matches) {
      setVisible(true)
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const style: React.CSSProperties = reducedMotion
    ? {}
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: visible
          ? `opacity 500ms ${TRANSITION_EASING} ${delay}ms, transform 500ms ${TRANSITION_EASING} ${delay}ms`
          : 'none',
      }

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  )
}
