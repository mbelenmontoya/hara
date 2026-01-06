// Hará UI - Alert Component
// Purpose: Contextual messages for success/info/warning/error states

import { ReactNode } from 'react'

interface AlertProps {
  variant?: 'success' | 'info' | 'warning' | 'error'
  title?: string
  children: ReactNode
  className?: string
}

export function Alert({ variant = 'info', title, children, className = '' }: AlertProps) {
  const variantStyles = {
    success: 'bg-success-weak border-success/20 text-success',
    info: 'bg-info-weak border-info/20 text-info',
    warning: 'bg-warning-weak border-warning/20 text-warning',
    error: 'bg-danger-weak border-danger/20 text-danger',
  }

  const icons = {
    success: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  return (
    <div className={`p-4 rounded-lg border ${variantStyles[variant]} ${className} animate-in fade-in slide-in-from-top-1 duration-200`}>
      <div className="flex gap-3">
        {icons[variant]}
        <div className="flex-1">
          {title && <p className="font-semibold mb-1">{title}</p>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}
