'use client'

// ReviewerEmailCapture — optional inline email input below the WhatsApp button
// on /p/[slug]. Shown only on direct profile visits (not in concierge flow).
// On submit: stores email in localStorage keyed by professional slug so the
// next ContactButton click includes it in the contact_click event payload.
// Also writes the email to the most recent direct contact_click event for this
// session (if one exists within the last 5 minutes) via /api/contact-email.

import { useState } from 'react'
import { logError } from '@/lib/monitoring'

interface ReviewerEmailCaptureProps {
  professionalSlug: string
  sessionId?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ReviewerEmailCapture({ professionalSlug, sessionId }: ReviewerEmailCaptureProps) {
  const [email,       setEmail]     = useState('')
  const [submitted,   setSubmitted] = useState(false)
  const [error,       setError]     = useState('')
  const [loading,     setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!EMAIL_RE.test(email)) {
      setError('Email inválido. Por favor revisá el formato.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professional_slug: professionalSlug, email, session_id: sessionId }),
      })
      if (res.ok) {
        // Store in localStorage so the next ContactButton click picks it up
        localStorage.setItem(`reviewer-email:${professionalSlug}`, email)
        setSubmitted(true)
      } else {
        setError('No pudimos guardar tu email. Intentá de nuevo.')
      }
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ReviewerEmailCapture' })
      setError('No pudimos conectarnos. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <p className="text-xs text-muted text-center mt-3" role="status">
        ¡Gracias! Te avisamos cómo te fue.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 w-full max-w-xs mx-auto">
      <p className="text-xs text-muted text-center mb-2">
        ¿Querés contarnos cómo te fue? Dejanos tu email (opcional).
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          placeholder="tu@email.com"
          disabled={loading}
          className="flex-1 border border-outline rounded-full px-4 py-2 text-sm text-foreground bg-surface focus:outline-none focus:border-brand min-w-0"
        />
        <button
          type="submit"
          disabled={loading || !email}
          className="px-4 py-2 text-sm font-medium bg-brand text-white rounded-full shadow-soft hover:shadow-elevated transition-shadow disabled:opacity-50"
        >
          {loading ? '...' : 'Avisame'}
        </button>
      </div>
      {error && <p className="text-xs text-danger text-center mt-1">{error}</p>}
    </form>
  )
}
