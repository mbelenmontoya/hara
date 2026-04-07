// Hará UI v2 - Button Component
// Purpose: Primary interactive element with tactile, accessible design
// Brand: Warm, premium, trustworthy

'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'default',
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    primary: 'bg-brand text-white hover:bg-brand-hover btn-press-glow shadow-elevated hover:shadow-strong transition-all duration-150',
    secondary: 'bg-surface border border-outline text-foreground hover:bg-surface-2 hover:border-muted btn-press-inset shadow-soft transition-all duration-150',
    ghost: 'text-foreground hover:bg-surface-2 active:opacity-80 transition-all duration-120',
    link: 'text-brand hover:text-brand-hover underline-offset-4 hover:underline transition-colors duration-120',
  }

  const sizeStyles = {
    default: 'px-5 py-3 text-base rounded-full min-h-[44px]',
    sm: 'px-4 py-2 text-sm rounded-full min-h-[36px]',
    lg: 'px-6 py-4 text-lg rounded-full min-h-[52px]',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
