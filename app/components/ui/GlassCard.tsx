// Glass card container with frosted effect
// Matches the exact pattern from /profesionales/registro and /solicitar

import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  /** Set false to allow tooltip/popover content to overflow the card boundary. Default true. */
  overflowHidden?: boolean
}

export function GlassCard({ children, className = '', contentClassName = '', overflowHidden = true }: GlassCardProps) {
  return (
    <div className={`liquid-glass rounded-3xl shadow-elevated border border-outline/30 ${overflowHidden ? 'overflow-hidden' : 'overflow-visible'} ${className}`}>
      <div className={`p-6 ${contentClassName}`}>
        {children}
      </div>
    </div>
  )
}
