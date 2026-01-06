// Hará UI v2 - Badge Component
// Purpose: Status indicators with cohesive palette

import { ReactNode } from 'react'

interface BadgeProps {
  variant?: 'new' | 'matched' | 'contacted' | 'converted' | 'closed' | 'default'
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variantStyles = {
    new: 'bg-brand-weak text-brand border-brand/20',
    matched: 'bg-brand text-white border-brand',
    contacted: 'bg-info-weak text-info border-info/20',
    converted: 'bg-success-weak text-success border-success/20',
    closed: 'bg-surface-2 text-muted border-outline',
    default: 'bg-surface-2 text-foreground border-outline',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
