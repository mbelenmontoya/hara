// Admin — Professional Review Page
// Shows submitted profile with score preview, completeness breakdown,
// and approve/reject actions. Uses standard liquid-glass design system.

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { SectionHeader } from '@/app/components/ui/SectionHeader'
import { Chip } from '@/app/components/ui/Chip'
import { Badge } from '@/app/components/ui/Badge'
import { Button } from '@/app/components/ui/Button'
import { Modal } from '@/app/components/ui/Modal'
import { Alert } from '@/app/components/ui/Alert'
import {
  calculateProfileScore,
  type ProfileScore,
  type ScorableProfile,
} from '@/lib/profile-score'
import { MODALITY_MAP, STYLE_MAP, STATUS_CONFIG } from '@/lib/design-constants'
import { logError } from '@/lib/monitoring'
import { SpecialtyMapper } from './components/SpecialtyMapper'
import { ScoreRing, ScoreBreakdown } from './components/ScoreDisplay'

// ============================================================================
// TYPES
// ============================================================================

interface Professional {
  id: string
  slug: string
  status: string
  full_name: string
  email: string
  whatsapp: string
  country: string
  city: string | null
  online_only: boolean
  modality: string[]
  specialties: string[]
  style: string[] | null
  bio: string | null
  short_description: string | null
  experience_description: string | null
  instagram: string | null
  service_type: string[]
  price_range_min: number | null
  price_range_max: number | null
  currency: string
  accepting_new_clients: boolean
  profile_image_url: string | null
  created_at: string
  rejection_reason: string | null
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ProfessionalReviewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [professional, setProfessional] = useState<Professional | null>(null)
  const [score, setScore] = useState<ProfileScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [editedSpecialties, setEditedSpecialties] = useState<string[] | null>(null)

  const fetchProfessional = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/professionals/${id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Error al cargar el profesional')
      }
      const { professional: data } = await res.json()
      setProfessional(data)

      const scorable: ScorableProfile = {
        profile_image_url: data.profile_image_url,
        short_description: data.short_description,
        bio: data.bio,
        experience_description: data.experience_description,
        specialties: data.specialties,
        service_type: data.service_type,
        city: data.city,
        online_only: data.online_only,
        instagram: data.instagram,
        whatsapp: data.whatsapp,
        modality: data.modality,
      }
      setScore(calculateProfileScore(scorable))
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfessionalReviewPage.fetchProfessional' })
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProfessional()
  }, [fetchProfessional])

  async function handleApprove() {
    setActionLoading(true)
    setActionResult(null)
    try {
      const res = await fetch(`/api/admin/professionals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          ...(editedSpecialties !== null && { specialties: editedSpecialties }),
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al aprobar')
      setActionResult({ type: 'success', message: `Perfil aprobado. Ya es visible en /p/${professional?.slug}` })
      setProfessional((prev) => prev ? { ...prev, status: 'active' } : prev)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfessionalReviewPage.handleApprove' })
      setActionResult({ type: 'error', message: err instanceof Error ? err.message : 'Error desconocido' })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) return
    setActionLoading(true)
    setActionResult(null)
    try {
      const res = await fetch(`/api/admin/professionals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejection_reason: rejectionReason }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al rechazar')
      setRejectModalOpen(false)
      setRejectionReason('')
      setActionResult({ type: 'success', message: 'Perfil rechazado.' })
      setProfessional((prev) => prev ? { ...prev, status: 'rejected', rejection_reason: rejectionReason } : prev)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfessionalReviewPage.handleReject' })
      setActionResult({ type: 'error', message: err instanceof Error ? err.message : 'Error desconocido' })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted">Cargando perfil...</div>
      </AdminLayout>
    )
  }

  if (error || !professional) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Alert variant="error">{error || 'Profesional no encontrado'}</Alert>
          <Button variant="secondary" onClick={() => router.push('/admin/professionals')}>
            Volver a la lista
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const statusConfig = STATUS_CONFIG[professional.status] || STATUS_CONFIG.draft
  const isReviewable = professional.status === 'submitted'

  const modalityLabels = professional.modality.map((m) => MODALITY_MAP[m] || m)
  const styleLabels = (professional.style || []).map((s) => STYLE_MAP[s] || s)
  const location = professional.online_only
    ? 'Solo online'
    : [professional.city, professional.country].filter(Boolean).join(', ')
  const registeredDate = new Date(professional.created_at).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <GlassCard>
          <button
            onClick={() => router.push('/admin/professionals')}
            className="text-sm text-muted hover:text-foreground mb-3 inline-flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver a profesionales
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {professional.profile_image_url ? (
                <img
                  src={professional.profile_image_url}
                  alt={professional.full_name}
                  className="w-14 h-14 rounded-full object-cover shadow-soft border-2 border-white/60 flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-weak to-info-weak flex items-center justify-center shadow-soft border-2 border-white/60 flex-shrink-0">
                  <span className="text-lg font-semibold text-brand">
                    {professional.full_name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-foreground">{professional.full_name}</h2>
                <p className="text-xs text-muted mt-1.5">
                  Registrado el {registeredDate} · <span className="font-mono">{professional.slug}</span>
                </p>
              </div>
            </div>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
        </GlassCard>

        {/* Action result */}
        {actionResult && (
          <Alert variant={actionResult.type === 'success' ? 'success' : 'error'}>
            {actionResult.message}
          </Alert>
        )}

        {/* Rejection reason (if already rejected) */}
        {professional.status === 'rejected' && professional.rejection_reason && (
          <Alert variant="warning" title="Motivo de rechazo">
            {professional.rejection_reason}
          </Alert>
        )}

        {/* Score card */}
        {score && (
          <GlassCard>
            <SectionHeader className="mb-5">Puntaje del perfil (preliminar)</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <ScoreRing score={score.total} />
              <ScoreBreakdown breakdown={score.breakdown} />
            </div>
            <p className="text-xs text-muted mt-5 pt-4 border-t border-outline">
              Refleja la completitud de los datos enviados en el registro.
              No es un criterio automático de aprobación o rechazo.
            </p>
          </GlassCard>
        )}

        {/* Contact details */}
        <GlassCard>
          <SectionHeader className="mb-4">Datos de contacto</SectionHeader>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <dt className="text-xs text-muted mb-1">Email</dt>
              <dd className="text-sm text-foreground">{professional.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted mb-1">WhatsApp</dt>
              <dd className="text-sm text-foreground">{professional.whatsapp}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted mb-1">Ubicación</dt>
              <dd className="text-sm text-foreground">{location}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted mb-1">País</dt>
              <dd className="text-sm text-foreground">{professional.country}</dd>
            </div>
            {professional.instagram && (
              <div>
                <dt className="text-xs text-muted mb-1">Instagram</dt>
                <dd className="text-sm text-brand">{professional.instagram}</dd>
              </div>
            )}
          </dl>
        </GlassCard>

        {/* Specialties & modality */}
        <GlassCard>
          <SectionHeader className="mb-4">Perfil profesional</SectionHeader>
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted mb-2">Especialidades</p>
              <SpecialtyMapper
                specialties={editedSpecialties ?? professional.specialties}
                onChange={setEditedSpecialties}
              />
            </div>

            <div>
              <p className="text-xs text-muted mb-2">Modalidad</p>
              <div className="flex flex-wrap gap-2">
                {modalityLabels.map((label) => (
                  <Chip key={label} label={label} variant="neutral" />
                ))}
              </div>
            </div>

            {styleLabels.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-1">Enfoque terapéutico</p>
                <p className="text-sm text-foreground">{styleLabels.join(', ')}</p>
              </div>
            )}

            {(professional.price_range_min || professional.price_range_max) && (
              <div>
                <p className="text-xs text-muted mb-1">Rango de precios</p>
                <p className="text-sm text-foreground">
                  {professional.currency}{' '}
                  {professional.price_range_min && professional.price_range_max
                    ? `${professional.price_range_min} – ${professional.price_range_max}`
                    : professional.price_range_min
                      ? `Desde ${professional.price_range_min}`
                      : `Hasta ${professional.price_range_max}`}
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Bio */}
        {professional.bio && (
          <GlassCard>
            <SectionHeader className="mb-3">Biografía</SectionHeader>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {professional.bio}
            </p>
          </GlassCard>
        )}

        {/* Actions */}
        {isReviewable && (
          <GlassCard>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                loading={actionLoading}
                onClick={handleApprove}
              >
                Aprobar perfil
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1 border-danger/30 text-danger hover:bg-danger-weak"
                loading={actionLoading}
                onClick={() => setRejectModalOpen(true)}
              >
                Rechazar perfil
              </Button>
            </div>
            <p className="text-xs text-muted text-center mt-4">
              Aprobar hace el perfil visible en el directorio. Rechazar requiere un motivo.
            </p>
          </GlassCard>
        )}

        {/* Reject modal */}
        <Modal
          open={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Rechazar perfil"
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="bg-danger hover:bg-danger/90"
                loading={actionLoading}
                disabled={!rejectionReason.trim()}
                onClick={handleReject}
              >
                Confirmar rechazo
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Escribí el motivo por el cual se rechaza este perfil. El profesional podrá verlo si le
              comunicamos la decisión.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej: El perfil no incluye suficiente información sobre experiencia profesional..."
              rows={4}
              className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-sm resize-none"
            />
            {score && score.total < 50 && (
              <p className="text-xs text-muted">
                El puntaje del perfil es {score.total}/100. Podés usar el desglose de arriba como referencia
                para explicar qué falta.
              </p>
            )}
          </div>
        </Modal>

      </div>
    </AdminLayout>
  )
}
