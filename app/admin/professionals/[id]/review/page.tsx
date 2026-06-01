// Admin — Professional Review Page
// Shows submitted profile with score preview, completeness breakdown,
// and approve/reject actions. Uses standard liquid-glass design system.

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { SectionHeader } from '@/app/components/ui/SectionHeader'
import { Chip } from '@/app/components/ui/Chip'
import { Button } from '@/app/components/ui/Button'
import { Modal } from '@/app/components/ui/Modal'
import { Alert } from '@/app/components/ui/Alert'
import {
  calculateProfileScore,
  type ProfileScore,
  type ScorableProfile,
} from '@/lib/profile-score'
import { MODALITY_MAP, STATUS_CONFIG, SERVICE_TYPE_MAP } from '@/lib/design-constants'
import { logError } from '@/lib/monitoring'
import { ScoreRing, ScoreBreakdown } from './components/ScoreDisplay'
import { PracticeMapper } from './components/PracticeMapper'
import type { Practice } from '@/lib/practices'

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
  practices: string[]
  needs_practice_review: boolean
  bio: string | null
  short_description: string | null
  experience_description: string | null
  instagram: string | null
  service_type: string[]
  price_range_min: number | null
  price_range_max: number | null
  currency: string
  accepting_new_clients: boolean
  offers_courses_online: boolean
  courses_presencial_location: string | null
  profile_image_url: string | null
  subscription_tier: string
  tier_expires_at: string | null
  ranking_score: number
  rating_average: number
  rating_count: number
  created_at: string
  rejection_reason: string | null
  score_overrides: Record<string, number>
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ProfessionalReviewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [professional, setProfessional] = useState<Professional | null>(null)
  const [catalogPractices, setCatalogPractices] = useState<Practice[]>([])
  const [score, setScore] = useState<ProfileScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [editedPractices, setEditedPractices] = useState<string[] | null>(null)
  const [scoreOverrides, setScoreOverrides] = useState<Record<string, number>>({})
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    setImageError(null)
    try {
      const fd = new FormData()
      fd.append('profile_image', file)
      const res = await fetch(`/api/admin/professionals/${id}/image`, { method: 'POST', body: fd })
      const body = await res.json()
      if (!res.ok) { setImageError(body.error ?? 'Error al subir la imagen'); return }
      setProfessional((prev) => prev ? { ...prev, profile_image_url: body.url } : prev)
    } catch {
      setImageError('Error de red al subir la imagen')
    } finally {
      setImageUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const fetchProfessional = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/professionals/${id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Error al cargar el profesional')
      }
      const { professional: data, practices: catalogData } = await res.json()
      setProfessional(data)
      if (Array.isArray(catalogData)) setCatalogPractices(catalogData)

      const scorable: ScorableProfile = {
        profile_image_url: data.profile_image_url,
        short_description: data.short_description,
        bio: data.bio,
        experience_description: data.experience_description,
        practices: data.practices,
        service_type: data.service_type,
        city: data.city,
        online_only: data.online_only,
        instagram: data.instagram,
        whatsapp: data.whatsapp,
        modality: data.modality,
      }
      const overrides = data.score_overrides ?? {}
      setScoreOverrides(overrides)
      setScore(calculateProfileScore(scorable, overrides))
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

  function handleOverride(key: string, value: number) {
    if (!professional) return
    const next = { ...scoreOverrides, [key]: value }
    setScoreOverrides(next)
    const scorable = {
      profile_image_url: professional.profile_image_url,
      short_description: professional.short_description,
      bio: professional.bio,
      experience_description: professional.experience_description,
      practices: professional.practices,
      service_type: professional.service_type,
      city: professional.city,
      online_only: professional.online_only,
      instagram: professional.instagram,
      whatsapp: professional.whatsapp,
      modality: professional.modality,
    }
    setScore(calculateProfileScore(scorable, next))
  }

  async function handleApprove() {
    setActionLoading(true)
    setActionResult(null)
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

  const modalityLabels    = professional.modality.map((m) => MODALITY_MAP[m] || m)
  const serviceTypeLabels = (professional.service_type ?? []).map((s) => SERVICE_TYPE_MAP[s] || s)
  const practiceLabelMap = Object.fromEntries(catalogPractices.map(p => [p.key, p.label]))
  const practiceLabels = professional.practices.map(k => practiceLabelMap[k] ?? k)
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
      <div className="space-y-4">

        {/* Back link — outside the card */}
        <button
          onClick={() => router.push('/admin/professionals')}
          className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver a profesionales
        </button>

        {/* Header card */}
        <GlassCard>
          <div className="flex items-center gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
              {/* Clickable avatar — opens file picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                className="relative group flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-brand"
                title="Subir foto"
              >
                {professional.profile_image_url?.startsWith('http') ? (
                  <img
                    src={professional.profile_image_url}
                    alt={professional.full_name}
                    className="w-14 h-14 rounded-full object-cover shadow-soft border-2 border-white/60"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-weak to-info-weak flex items-center justify-center shadow-soft border-2 border-white/60">
                    {imageUploading ? (
                      <svg className="w-5 h-5 text-brand animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <span className="text-lg font-semibold text-brand">
                        {professional.full_name.charAt(0)}
                      </span>
                    )}
                  </div>
                )}
                {/* Camera overlay on hover */}
                {!imageUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </button>
              {imageError && (
                <p className="text-xs text-danger mt-1 absolute">{imageError}</p>
              )}
              <div>
                {/* Name + status dot */}
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-foreground">{professional.full_name}</h2>
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      professional.status === 'active' ? 'bg-success'
                      : professional.status === 'submitted' ? 'bg-warning'
                      : professional.status === 'rejected' ? 'bg-danger'
                      : 'bg-muted/40'
                    }`}
                    title={statusConfig.label}
                  />
                </div>
                <p className="text-xs text-muted mt-1">
                  Registrado el {registeredDate} · <span className="font-mono">{professional.slug}</span>
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Tier: <span className="font-medium text-foreground capitalize">{professional.subscription_tier}</span>
                  {' · '}Ranking: <span className="font-medium text-foreground">{professional.ranking_score}</span>
                  {professional.rating_count > 0 && (
                    <> · ⭐ {professional.rating_average.toFixed(1)} ({professional.rating_count})</>
                  )}
                </p>
              </div>
            </div>
            </div>{/* end flex-1 left group */}

            {/* Score ring — adjacent to content, not pushed to far right */}
            {score && <ScoreRing score={score.total} />}
          </div>
        </GlassCard>

        {/* Alerts */}
        {actionResult && (
          <Alert variant={actionResult.type === 'success' ? 'success' : 'error'}>
            {actionResult.message}
          </Alert>
        )}
        {professional.status === 'rejected' && professional.rejection_reason && (
          <Alert variant="warning" title="Motivo de rechazo">
            {professional.rejection_reason}
          </Alert>
        )}

        {/* Two-column: Score (left) | Bio + Contact (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

          {/* Left — score */}
          {score && (
            <GlassCard overflowHidden={false}>
              <SectionHeader className="mb-5">Puntaje del perfil (preliminar)</SectionHeader>
              <ScoreBreakdown breakdown={score.breakdown} onOverride={handleOverride} />
              <p className="text-xs text-muted mt-5 pt-4 border-t border-outline">
                Refleja la completitud de los datos enviados en el registro.
                No es un criterio automático de aprobación o rechazo.
              </p>
            </GlassCard>
          )}

          {/* Right — texts (top) + contact (bottom) */}
          <div className="flex flex-col gap-4">
            <GlassCard>
              <SectionHeader className="mb-4">Sobre el/la profesional</SectionHeader>
              <div className="space-y-4">
                {professional.short_description && (
                  <div>
                    <p className="text-xs text-muted mb-1">Descripción corta</p>
                    <p className="text-sm text-foreground">{professional.short_description}</p>
                  </div>
                )}
                {professional.bio && (
                  <div>
                    <p className="text-xs text-muted mb-1">Biografía</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{professional.bio}</p>
                  </div>
                )}
                {professional.experience_description && (
                  <div>
                    <p className="text-xs text-muted mb-1">Descripción de experiencia</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{professional.experience_description}</p>
                  </div>
                )}
                {serviceTypeLabels.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-2">Tipo de servicio</p>
                    <div className="flex flex-wrap gap-2">
                      {serviceTypeLabels.map((label) => (
                        <Chip key={label} label={label} variant="neutral" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <SectionHeader className="mb-4">Datos de contacto</SectionHeader>
              <dl className="grid grid-cols-1 gap-y-3">
                <div>
                  <dt className="text-xs text-muted mb-0.5">Email</dt>
                  <dd className="text-sm text-foreground">{professional.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">WhatsApp</dt>
                  <dd className="text-sm text-foreground">{professional.whatsapp || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Ubicación</dt>
                  <dd className="text-sm text-foreground">{location || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">País</dt>
                  <dd className="text-sm text-foreground">{professional.country}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Solo online</dt>
                  <dd className="text-sm text-foreground">{professional.online_only ? 'Sí' : 'No'}</dd>
                </div>
                {professional.instagram && (
                  <div>
                    <dt className="text-xs text-muted mb-0.5">Instagram</dt>
                    <dd className="text-sm text-brand">{professional.instagram}</dd>
                  </div>
                )}
              </dl>
            </GlassCard>
          </div>
        </div>

        {/* Perfil profesional — full width */}
        <GlassCard>
          <SectionHeader className="mb-4">Perfil profesional</SectionHeader>
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted mb-2">Prácticas (mapear)</p>
              <PracticeMapper
                freeTextEntries={professional.specialties}
                catalogPractices={catalogPractices}
                initialPractices={professional.practices}
                onChange={setEditedPractices}
              />
            </div>

            {practiceLabels.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-1">Prácticas guardadas</p>
                <p className="text-sm text-foreground">{practiceLabels.join(', ')}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-x-8 gap-y-3 items-start">
              <div>
                <p className="text-xs text-muted mb-1.5">Modalidad</p>
                <div className="flex flex-wrap gap-1.5">
                  {modalityLabels.map((label) => (
                    <Chip key={label} label={label} variant="neutral" />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted mb-0.5">Acepta nuevos clientes</p>
                <p className="text-sm text-foreground">{professional.accepting_new_clients ? 'Sí' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-0.5">Cursos online</p>
                <p className="text-sm text-foreground">{professional.offers_courses_online ? 'Sí' : 'No'}</p>
              </div>
            </div>

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


            {professional.courses_presencial_location && (
              <div>
                <p className="text-xs text-muted mb-0.5">Ubicación cursos presenciales</p>
                <p className="text-sm text-foreground">{professional.courses_presencial_location}</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Actions — no card, right-aligned */}
        {isReviewable && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="border-danger/30 text-danger hover:bg-danger-weak"
                loading={actionLoading}
                onClick={() => setRejectModalOpen(true)}
              >
                Rechazar
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={actionLoading}
                onClick={handleApprove}
              >
                Aprobar perfil
              </Button>
            </div>
            <p className="text-xs text-muted">
              Aprobar hace el perfil visible en el directorio. Rechazar requiere un motivo.
            </p>
          </div>
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
              <span className="font-semibold">Razón de rechazo</span>{' '}
              (este texto se le enviará al profesional con tus palabras exactas).
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej: El perfil no incluye suficiente información sobre experiencia profesional..."
              rows={4}
              className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-sm resize-none"
            />
            <p className="text-xs text-muted">
              El profesional recibirá esto en un email automático junto con la fecha en la que puede volver
              a aplicar (60 días).
            </p>
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
