'use client'

// Client review controls: professional link dropdown + approve/reject buttons.
// Posts an unconfirmed auto-link (professional_link_confirmed=false) are visually
// flagged so the admin can confirm or clear before approving.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/app/components/ui/Alert'
import { Button } from '@/app/components/ui/Button'
import { GlassCard } from '@/app/components/ui/GlassCard'

interface Professional {
  id: string
  full_name: string
  slug: string
}

interface PostInfo {
  id: string
  status: 'submitted' | 'published' | 'rejected'
  professional_id: string | null
  professional_link_confirmed: boolean
  rejection_reason: string | null
  author_name: string
}

interface Props {
  post: PostInfo
  professionals: Professional[]
}

export function BlogReviewClient({ post, professionals }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Link state: '' = clear link, 'keep' = leave unchanged, or a UUID
  const initialLink = post.professional_id ?? ''
  const [selectedProId, setSelectedProId] = useState<string>(initialLink)
  const [rejectionReason, setRejectionReason] = useState(post.rejection_reason ?? '')

  const isAlreadyFinal = post.status === 'published' || post.status === 'rejected'
  const hasUnconfirmedAutoLink = !!post.professional_id && !post.professional_link_confirmed

  async function handleAction(action: 'approve' | 'reject') {
    setSubmitting(true)
    setError(null)

    // Build professional_id update:
    //  - '' means the admin explicitly cleared → send null
    //  - a UUID means set/replace → send UUID
    //  - initialLink === selectedProId with confirmed=true → include for clarity, confirm=true
    const body: Record<string, unknown> = { action }
    if (action === 'reject') body.rejection_reason = rejectionReason.trim()

    if (selectedProId === '') {
      body.professional_id = null
    } else if (selectedProId !== initialLink || !post.professional_link_confirmed) {
      body.professional_id = selectedProId
    }

    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? 'Error al guardar')
        setSubmitting(false)
        return
      }
      router.push('/admin/blog')
      router.refresh()
    } catch {
      setError('Error de red')
      setSubmitting(false)
    }
  }

  return (
    <GlassCard>
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Revisión</p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {isAlreadyFinal && (
        <Alert variant="info" className="mb-4">
          Esta nota ya está <strong>{post.status === 'published' ? 'publicada' : 'rechazada'}</strong>.
        </Alert>
      )}

      {/* Professional link */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-foreground mb-2" htmlFor="pro-link">
          Vínculo a profesional
        </label>
        {hasUnconfirmedAutoLink && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-info-weak border border-info/20 text-xs text-info">
            Auto-vinculado por email a <strong>{professionals.find(p => p.id === post.professional_id)?.full_name ?? post.professional_id}</strong> — confirmá o quitá el vínculo antes de publicar.
          </div>
        )}
        <select
          id="pro-link"
          value={selectedProId}
          onChange={(e) => setSelectedProId(e.target.value)}
          disabled={isAlreadyFinal || submitting}
          className="w-full px-3 py-2.5 bg-surface border border-outline rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-60"
        >
          <option value="">Sin vínculo</option>
          {professionals.map(p => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
        <p className="text-xs text-muted mt-1.5">Si la nota pertenece a un profesional de Hara, seleccionalo.</p>
      </div>

      {/* Rejection reason (for reject action) */}
      {!isAlreadyFinal && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-foreground mb-2" htmlFor="rejection-reason">
            Motivo de rechazo (si rechazás)
          </label>
          <textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            disabled={submitting}
            rows={3}
            placeholder="Explicá brevemente por qué la nota no va a publicarse..."
            className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none"
          />
        </div>
      )}

      {!isAlreadyFinal && (
        <div className="flex gap-3">
          <Button
            onClick={() => handleAction('approve')}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? 'Guardando...' : 'Aprobar y publicar'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleAction('reject')}
            disabled={submitting || !rejectionReason.trim()}
            className="flex-1"
          >
            Rechazar
          </Button>
        </div>
      )}
    </GlassCard>
  )
}
