'use client'

// Client review controls (design 13): "Vínculo con Hara" select plus approve, or reject with a reason.
// Posts with an unconfirmed auto-link (professional_link_confirmed=false) are flagged so the admin
// can confirm or clear the link before approving. After an action the page refreshes in place.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/app/components/ui/Modal'
import { useAdminToast } from '@/app/admin/components/AdminToast'
import { ADMIN_BTN_PRIMARY, ADMIN_BTN_SECONDARY, AdminCard, AdminCardTitle, AdminError } from '@/app/admin/components/AdminUI'

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
  const toast = useAdminToast()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const initialLink = post.professional_id ?? ''
  const [selectedProId, setSelectedProId] = useState<string>(initialLink)

  const isAlreadyFinal = post.status === 'published' || post.status === 'rejected'
  const hasUnconfirmedAutoLink = !!post.professional_id && !post.professional_link_confirmed
  const linkedName = professionals.find((p) => p.id === post.professional_id)?.full_name ?? post.professional_id

  /** Sends the action; returns an error message, or '' when it worked. */
  async function handleAction(action: 'approve' | 'reject'): Promise<string> {
    // '' means the admin cleared the link → null; a changed or unconfirmed id is sent to confirm it
    const body: Record<string, unknown> = { action }
    if (action === 'reject') body.rejection_reason = rejectionReason.trim()
    if (selectedProId === '') body.professional_id = null
    else if (selectedProId !== initialLink || !post.professional_link_confirmed) body.professional_id = selectedProId

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        return data.error ?? 'Error al guardar'
      }
      toast.show(action === 'approve' ? 'Nota publicada en el Diario.' : `Nota rechazada. Le avisamos a ${post.author_name}.`)
      router.refresh()
      return ''
    } catch {
      return 'Error de red'
    } finally {
      setSubmitting(false)
    }
  }

  async function approve() {
    setError(null)
    const problem = await handleAction('approve')
    if (problem) setError(problem)
  }

  async function reject() {
    if (!rejectionReason.trim()) return setError('Escribí el motivo antes de rechazar.')
    setError(null)
    const problem = await handleAction('reject')
    if (problem) setError(problem)
    else setRejectOpen(false)
  }

  return (
    <>
      <AdminCard>
        <AdminCardTitle>Vínculo con Hara</AdminCardTitle>
        <select
          id="pro-link"
          aria-label="Vínculo con Hara"
          value={selectedProId}
          onChange={(e) => setSelectedProId(e.target.value)}
          disabled={isAlreadyFinal || submitting}
          className="mt-1 w-full cursor-pointer rounded-[13px] bg-background px-[13px] py-3 text-[14.5px] outline-none disabled:opacity-60"
        >
          <option value="">Sin vínculo</option>
          <option value="hara-vital">Hara Vital (editorial)</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
        {hasUnconfirmedAutoLink && !isAlreadyFinal && (
          <p className="mt-2 text-[12.5px] leading-[1.45] text-warning-dark">
            Se vinculó solo por email a {linkedName}. Confirmá o quitá el vínculo antes de publicar.
          </p>
        )}
        {selectedProId === 'hara-vital' && (
          <p className="mt-2 text-[12.5px] leading-[1.45] text-brand-dark">
            Se publica como nota editorial de Hara Vital: el autor se muestra como &quot;Hara Vital&quot; con el logo de Hara.
          </p>
        )}
      </AdminCard>

      {isAlreadyFinal ? (
        <p className="px-1.5 text-[14px] leading-normal text-gray-700">
          {post.status === 'published' ? 'Publicada en el Diario.' : `Rechazada. Motivo: ${post.rejection_reason || 'sin motivo'}`}
        </p>
      ) : (
        <AdminCard>
          <p className="text-[13.5px] leading-[1.45] text-gray-700">Al aprobarla, se publica en el Diario.</p>
          {error && !rejectOpen && <AdminError text={error} />}
          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setRejectOpen(true)
              }}
              disabled={submitting}
              className="inline-flex flex-none rounded-[14px] border-[1.5px] border-danger-dark/35 px-[15px] py-[9.5px] text-[14px] font-medium text-danger-dark"
            >
              Rechazar
            </button>
            <span className="flex-1" />
            <button type="button" onClick={approve} disabled={submitting} className={ADMIN_BTN_PRIMARY}>
              {submitting ? 'Guardando…' : 'Aprobar'}
            </button>
          </div>
        </AdminCard>
      )}

      {rejectOpen && (
        <Modal
          open
          onClose={() => !submitting && setRejectOpen(false)}
          title="Rechazar la nota"
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectOpen(false)} disabled={submitting} className={ADMIN_BTN_SECONDARY}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={reject}
                disabled={submitting}
                className="inline-flex flex-none rounded-[14px] bg-danger-dark px-[17px] py-[11px] text-[14px] font-medium text-gray-50 disabled:opacity-60"
              >
                {submitting ? 'Rechazando…' : 'Rechazar'}
              </button>
            </div>
          }
        >
          <p className="text-[14px] leading-normal text-gray-700">Escribí el motivo. Le avisamos a {post.author_name} por email.</p>
          <textarea
            id="rejection-reason"
            aria-label="Motivo del rechazo"
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value)
              setError(null)
            }}
            placeholder="Por ejemplo: la nota necesita más desarrollo antes de publicarse."
            className="mt-3.5 block min-h-[110px] w-full resize-none rounded-[13px] bg-background px-[13px] py-3 text-[15px] leading-[1.55] outline-none placeholder:text-gray-500"
          />
          {error && <AdminError text={error} />}
        </Modal>
      )}
    </>
  )
}
