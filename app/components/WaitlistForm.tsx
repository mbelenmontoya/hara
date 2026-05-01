// Pre-launch waitlist form — used on the homepage "Próximamente" page.
// Captures name (optional) + email and posts to /api/waitlist.

'use client'

import { useState } from 'react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status = 'idle' | 'loading' | 'success' | 'error'

export function WaitlistForm() {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState<Status>('idle')
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!EMAIL_RE.test(email.trim())) {
      setError('Ingresá un email válido')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'No pudimos guardar tu email. Intentá de nuevo.')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setError('No pudimos conectar. Intentá de nuevo.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-success-weak border border-success/20 p-5 text-center">
        <p className="text-foreground font-semibold mb-1">¡Listo!</p>
        <p className="text-sm text-muted">Te avisamos apenas estemos abiertos.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <input
        type="text"
        placeholder="Tu nombre (opcional)"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full rounded-2xl border border-outline bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-brand"
        autoComplete="name"
      />
      <input
        type="email"
        placeholder="Tu email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="w-full rounded-2xl border border-outline bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-brand"
        autoComplete="email"
      />
      {error && (
        <p role="alert" className="text-sm text-danger">{error}</p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full px-6 py-3.5 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Enviando…' : 'Avisame cuando abran'}
      </button>
    </form>
  )
}
