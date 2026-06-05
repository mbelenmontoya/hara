'use client'

// Contact footer strip — compact two-column section at the bottom of /profesionales.
// Left: short pitch. Right: name + email inline + message + send button.

import { useState } from 'react'
import { logError } from '@/lib/monitoring'

const fieldClass = 'w-full border border-outline rounded-xl px-3 py-2 text-sm text-foreground bg-surface placeholder:text-muted focus:outline-none focus:border-brand transition-colors'

export function ContactFooterForm() {
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [message,   setMessage]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Error al enviar. Intentá de nuevo.')
      }
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ContactFooterForm' })
      setError('No pudimos conectarnos. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 px-6 py-5 text-center">
        <p className="text-sm font-medium text-foreground">¡Gracias por escribirnos!</p>
        <p className="text-xs text-muted mt-0.5">Te respondemos a la brevedad.</p>
      </div>
    )
  }

  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 px-6 py-5">
      <div className="lg:flex lg:items-start lg:gap-10">

        {/* Left — pitch */}
        <div className="mb-4 lg:mb-0 lg:w-44 lg:flex-shrink-0 lg:pt-1">
          <p className="text-sm font-semibold text-foreground">¿Tenés alguna pregunta?</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">Escribinos y te respondemos a la brevedad.</p>
        </div>

        {/* Right — compact form */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              disabled={loading}
              className={`${fieldClass} flex-1 min-w-0`}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={loading}
              className={`${fieldClass} flex-1 min-w-0`}
            />
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="¿En qué te podemos ayudar?"
            rows={2}
            required
            disabled={loading}
            className={`${fieldClass} resize-none`}
          />

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!name.trim() || !email.trim() || !message.trim() || loading}
              className="px-5 py-2 rounded-full bg-brand text-white text-sm font-medium shadow-soft hover:shadow-elevated transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar consulta'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
