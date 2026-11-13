// Admin, Professional Review Page (design 13)
// Header with photo, score ring and the action bar per status; Sobre, Perfil profesional,
// editable score criteria and contact data. Opening it marks the professional read.

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminLayout } from '@/app/components/AdminLayout'
import { Modal } from '@/app/components/ui/Modal'
import { useAdminToast } from '@/app/admin/components/AdminToast'
import { ADMIN_BACK_LINK, ADMIN_BTN_SECONDARY, AdminEmpty, AdminError, AdminSkeleton } from '@/app/admin/components/AdminUI'
import { calculateProfileScore, type ScorableProfile } from '@/lib/profile-score'
import { logError } from '@/lib/monitoring'
import type { Practice } from '@/lib/practices'
import { ReviewHeader, type ReviewHeaderProfessional } from './components/ReviewHeader'
import { AboutCard, ContactCard, CriteriaCard, ProfileCard, type ReviewProfessional } from './components/ReviewSections'

interface Professional extends ReviewHeaderProfessional, ReviewProfessional {
  id: string
  needs_practice_review: boolean
  score_overrides: Record<string, number>
}

function toScorable(p: Professional): ScorableProfile {
  return {
    profile_image_url: p.profile_image_url,
    short_description: p.short_description,
    bio: p.bio,
    experience_description: p.experience_description,
    practices: p.practices,
    service_type: p.service_type,
    city: p.city,
    online_only: p.online_only,
    instagram: p.instagram,
    whatsapp: p.whatsapp,
    modality: p.modality,
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error desconocido'
}

export default function ProfessionalReviewPage() {
  const id = useParams().id as string
  // The toast lives inside AdminLayout, so the page body is a child of it
  return (
    <AdminLayout markRead={{ kind: 'professionals', id }}>
      <Link href="/admin/professionals" className={ADMIN_BACK_LINK}>
        ← Profesionales
      </Link>
      <ReviewBody id={id} />
    </AdminLayout>
  )
}

function ReviewBody({ id }: { id: string }) {
  const toast = useAdminToast()
  const [professional, setProfessional] = useState<Professional | null>(null)
  const [catalogPractices, setCatalogPractices] = useState<Practice[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [editedPractices, setEditedPractices] = useState<string[] | null>(null)
  const [scoreOverrides, setScoreOverrides] = useState<Record<string, number>>({})
  const [imageUploading, setImageUploading] = useState(false)
  const [savingVisibility, setSavingVisibility] = useState(false)

  const fetchProfessional = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/professionals/${id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Error al cargar el profesional')
      }
      const { professional: data, practices: catalogData } = await res.json()
      setProfessional(data)
      setScoreOverrides(data.score_overrides ?? {})
      if (Array.isArray(catalogData)) setCatalogPractices(catalogData)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfessionalReviewPage.fetchProfessional' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProfessional()
  }, [fetchProfessional])

  async function handleImageUpload(file: File) {
    setImageUploading(true)
    try {
      const fd = new FormData()
      fd.append('profile_image', file)
      const res = await fetch(`/api/admin/professionals/${id}/image`, { method: 'POST', body: fd })
      const body = await res.json()
      if (!res.ok) return toast.show(body.error ?? 'No pudimos subir la foto.', 'err')
      setProfessional((prev) => (prev ? { ...prev, profile_image_url: body.url } : prev))
      toast.show('Foto actualizada.')
    } catch {
      toast.show('Error de red al subir la foto.', 'err')
    } finally {
      setImageUploading(false)
    }
  }

  async function handleVisibilityChange(field: 'show_email' | 'show_whatsapp', visible: boolean) {
    setSavingVisibility(true)
    try {
      const res = await fetch(`/api/admin/professionals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_contact_visibility', [field]: visible }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'No se pudo actualizar la visibilidad.')
      setProfessional((prev) => (prev ? { ...prev, [field]: visible } : prev))
      toast.show('Visibilidad actualizada.')
    } catch (err) {
      toast.show(errorMessage(err), 'err')
    } finally {
      setSavingVisibility(false)
    }
  }

  function handleReset(key: string) {
    const next = { ...scoreOverrides }
    delete next[key]
    setScoreOverrides(next)
  }

  async function handleResendInvite() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/professionals/${id}/invite`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return toast.show(body.error ?? 'No se pudo reenviar el acceso.', 'err')
      }
      toast.show(`Le reenviamos el acceso a ${professional?.email}.`)
    } catch {
      toast.show('Error de red al reenviar el acceso.', 'err')
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/professionals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          ...(editedPractices !== null && editedPractices.length > 0 && { practices: editedPractices }),
          ...(Object.keys(scoreOverrides).length > 0 && { score_overrides: scoreOverrides }),
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al aprobar')
      setProfessional((prev) => (prev ? { ...prev, status: 'active' } : prev))
      toast.show('Perfil aprobado. Ya es público y le mandamos el email para crear su contraseña.')
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfessionalReviewPage.handleApprove' })
      toast.show(errorMessage(err), 'err')
    } finally {
      setBusy(false)
    }
  }

  function handleRejected(reason: string) {
    setRejectOpen(false)
    setProfessional((prev) => (prev ? { ...prev, status: 'rejected', rejection_reason: reason } : prev))
    toast.show(`Rechazaste el perfil de ${professional?.full_name}.`)
  }

  if (loading) return <AdminSkeleton />
  if (!professional) {
    return (
      <AdminEmpty title="Profesional no encontrado" text="No pudimos cargar este perfil. Volvé a la lista y probá de nuevo.">
        <Link href="/admin/professionals" className={ADMIN_BTN_SECONDARY}>
          Volver a profesionales
        </Link>
      </AdminEmpty>
    )
  }

  const score = calculateProfileScore(toScorable(professional), scoreOverrides)

  return (
    <>
      <ReviewHeader
        pro={professional}
        total={score.total}
        imageUploading={imageUploading}
        busy={busy}
        onPhoto={handleImageUpload}
        onApprove={handleApprove}
        onReject={() => setRejectOpen(true)}
        onResend={handleResendInvite}
      />

      <div className="mt-3 grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <AboutCard pro={professional} />
          <ProfileCard pro={professional} catalog={catalogPractices} onPractices={setEditedPractices} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <CriteriaCard
            score={score}
            overrides={scoreOverrides}
            onSet={(key, value) => setScoreOverrides((prev) => ({ ...prev, [key]: value }))}
            onReset={handleReset}
          />
          <ContactCard
            pro={professional}
            savingVisibility={savingVisibility}
            onVisibilityChange={handleVisibilityChange}
          />
        </div>
      </div>

      {rejectOpen && (
        <RejectDialog id={id} name={professional.full_name} email={professional.email} onCancel={() => setRejectOpen(false)} onRejected={handleRejected} />
      )}
    </>
  )
}

interface RejectDialogProps {
  id: string
  name: string
  email: string
  onCancel: () => void
  onRejected: (reason: string) => void
}

function RejectDialog({ id, name, email, onCancel, onRejected }: RejectDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function reject() {
    const text = reason.trim()
    if (!text) return setError('Escribí el motivo antes de rechazar.')
    setSending(true)
    try {
      const res = await fetch(`/api/admin/professionals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejection_reason: text }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al rechazar')
      onRejected(text)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfessionalReviewPage.handleReject' })
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open
      onClose={() => !sending && onCancel()}
      title={`Rechazar a ${name}`}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={sending} className={ADMIN_BTN_SECONDARY}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={reject}
            disabled={sending}
            className="inline-flex flex-none rounded-[14px] bg-danger-dark px-[17px] py-[11px] text-[14px] font-medium text-gray-50 disabled:opacity-60"
          >
            {sending ? 'Rechazando…' : 'Rechazar'}
          </button>
        </div>
      }
    >
      <p className="text-[14px] leading-normal text-gray-700">Escribí el motivo. Se lo mandamos por email a {email}.</p>
      <textarea
        value={reason}
        onChange={(e) => {
          setReason(e.target.value)
          setError('')
        }}
        aria-label="Motivo del rechazo"
        placeholder="Por ejemplo: falta contar cómo trabajás y qué puede esperar quien te consulte."
        className="mt-3.5 block min-h-[110px] w-full resize-none rounded-[13px] bg-background px-[13px] py-3 text-[15px] leading-[1.55] outline-none placeholder:text-gray-500"
      />
      {error && <AdminError text={error} />}
    </Modal>
  )
}
