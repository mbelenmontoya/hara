// Hará UI - Input Components
// Purpose: Form inputs with label + helper/error pattern
// Accessibility: labels, error messages, proper ARIA attributes

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helper?: string
  error?: string
}

export function Input({ label, helper, error, className = '', ...props }: InputProps) {
  const inputId = props.id || props.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-3 bg-surface border ${error ? 'border-error' : 'border-outline'} rounded text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
      {helper && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-muted">
          {helper}
        </p>
      )}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helper?: string
  error?: string
}

export function Textarea({ label, helper, error, className = '', ...props }: TextareaProps) {
  const inputId = props.id || props.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full px-4 py-3 bg-surface border ${error ? 'border-error' : 'border-outline'} rounded text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[88px] ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
      {helper && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-muted">
          {helper}
        </p>
      )}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helper?: string
  error?: string
  children: ReactNode
}

export function Select({ label, helper, error, className = '', children, ...props }: SelectProps) {
  const inputId = props.id || props.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full px-4 py-3 bg-surface border ${error ? 'border-error' : 'border-outline'} rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
      {helper && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-muted">
          {helper}
        </p>
      )}
    </div>
  )
}
