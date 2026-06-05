'use client'

// Open review form — star rating 1–5 + name + email + comment
// Email is required for identity validation and duplicate prevention.
// Submits to POST /api/reviews/direct (no token required)

import { useState } from 'react'
import { logError } from '@/lib/monitoring'

interface ProfileReviewFormProps {
  professionalSlug: string
}

const inputClass = 'w-full border border-outline rounded-2xl px-4 py-3 text-sm text-foreground bg-surface/80 focus:outline-none focus:border-brand transition-colors'

export function ProfileReviewForm({ professionalSlug }: ProfileReviewFormProps) {
  const [rating, setRating]       = useState(0)
  const [hovered, setHovered]     = useState(0)
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [text, setText]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/reviews/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_slug: professionalSlug,
          rating,
          reviewer_name: name.trim(),
          reviewer_email: email.trim(),
          text: text.trim() || undefined,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Error al enviar. Intentá de nuevo.')
      }
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfileReviewForm' })
      setError('No pudimos conectarnos. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6 text-center">
        <p className="text-base font-semibold text-foreground">¡Gracias por tu comentario!</p>
        <p className="text-sm text-muted mt-1">Va a aparecer en el perfil en breve.</p>
      </div>
    )
  }

  const active = hovered || rating
  const canSubmit = rating > 0 && name.trim().length > 0 && email.trim().length > 0

  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
      <p className="text-sm text-foreground text-center mb-5">
        ¿Ya tuviste una sesión? Tu comentario le puede ayudar a otras personas.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star rating */}
        <div className="flex justify-center gap-2" role="group" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} estrellas`}
              onClick={() => setRating((prev) => (prev === n ? 0 : n))}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className={`text-3xl leading-none focus:outline-none transition-transform hover:scale-110 ${n <= active ? 'text-amber-300' : 'text-muted/40'}`}
            >
              ★
            </button>
          ))}
        </div>

        {/* Name + Email — same row */}
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            required
            disabled={loading}
            className={`${inputClass} flex-1 min-w-0`}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            disabled={loading}
            className={`${inputClass} flex-1 min-w-0`}
          />
        </div>

        {/* Comment */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Contanos cómo fue tu sesión..."
          rows={3}
          disabled={loading}
          className={`${inputClass} resize-none`}
        />

        {error && (
          <p className="text-xs text-danger text-center">{error}</p>
        )}

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-[30%] min-w-[160px] py-3 px-6 rounded-full bg-brand text-white text-sm font-medium shadow-soft hover:shadow-elevated transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Dejar comentario'}
          </button>
        </div>
      </form>
    </div>
  )
}
