'use client'

// ReviewSubmitForm — star rating + text + name form for the public review page
// No auth required — gated by the single-use token from the URL.

import { useState } from 'react'
import { Alert } from '@/app/components/ui/Alert'
import { logError } from '@/lib/monitoring'

interface ReviewSubmitFormProps {
  token: string
  professionalName: string
}

const STAR_LABELS = ['', '1 estrella', '2 estrellas', '3 estrellas', '4 estrellas', '5 estrellas']

export function ReviewSubmitForm({ token, professionalName }: ReviewSubmitFormProps) {
  const [rating,        setRating]        = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [text,          setText]          = useState('')
  const [reviewerName,  setReviewerName]  = useState('')
  const [submitted,     setSubmitted]     = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [loading,       setLoading]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rating,
          text:          text.trim() || null,
          reviewer_name: reviewerName.trim() || null,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const body = await res.json() as { error?: string }
        setError(body?.error ?? 'No se pudo enviar la reseña. Intentá de nuevo.')
      }
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ReviewSubmitForm' })
      setError('No se pudo conectar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8" role="status">
        <p className="text-2xl mb-2">🌟</p>
        <h2 className="text-xl font-bold text-foreground mb-2">¡Gracias por tu reseña!</h2>
        <p className="text-sm text-muted">Tu opinión ayuda a otros usuarios a encontrar el profesional ideal.</p>
      </div>
    )
  }

  const displayRating = hoveredRating || rating

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-sm font-medium text-foreground mb-3 text-center">
          Calificá tu experiencia con {professionalName}
        </p>

        {/* Star picker */}
        <div className="flex justify-center gap-2" role="group" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={STAR_LABELS[star]}
              aria-pressed={rating === star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="text-3xl transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
            >
              {star <= displayRating ? '★' : '☆'}
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-xs text-muted text-center mt-1">{STAR_LABELS[rating]}</p>
        )}
      </div>

      {/* Text area */}
      <div>
        <label htmlFor="review-text" className="block text-sm font-medium text-foreground mb-1">
          Comentario <span className="text-muted font-normal text-xs">— opcional</span>
        </label>
        <textarea
          id="review-text"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Contá cómo fue tu experiencia..."
          className="w-full border border-outline rounded-xl px-4 py-3 text-sm text-foreground bg-surface focus:outline-none focus:border-brand resize-none"
        />
      </div>

      {/* Name field */}
      <div>
        <label htmlFor="reviewer-name" className="block text-sm font-medium text-foreground mb-1">
          Tu nombre <span className="text-muted font-normal text-xs">— opcional</span>
        </label>
        <input
          id="reviewer-name"
          type="text"
          value={reviewerName}
          onChange={e => setReviewerName(e.target.value)}
          maxLength={80}
          placeholder="Ej: María P."
          className="w-full border border-outline rounded-full px-4 py-2.5 text-sm text-foreground bg-surface focus:outline-none focus:border-brand"
        />
        <p className="text-xs text-muted mt-1">Si preferís el anonimato, dejalo en blanco.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <button
        type="submit"
        disabled={rating === 0 || loading}
        className="w-full px-6 py-4 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Enviando...' : 'Enviar reseña'}
      </button>
    </form>
  )
}
