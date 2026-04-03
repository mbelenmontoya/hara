// Glass card container with frosted effect
// Matches the exact pattern from /profesionales/registro and /solicitar

import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div className={`liquid-glass rounded-3xl shadow-elevated border border-outline/30 overflow-hidden ${className}`}>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
