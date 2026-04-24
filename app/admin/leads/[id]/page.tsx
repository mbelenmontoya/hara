'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { Chip } from '@/app/components/ui/Chip'
import { Alert } from '@/app/components/ui/Alert'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { SectionHeader } from '@/app/components/ui/SectionHeader'
import {
  type Lead,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_VARIANT,
  LEAD_URGENCY_LABEL,
} from '@/app/admin/leads/shared'
import { logError } from '@/lib/monitoring'

export default function AdminLeadDetailPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchLead() {
      try {
        const res = await fetch(`/api/admin/leads/${params.id}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Error al cargar la solicitud')
        }

        setLead(data.lead ?? null)
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err))
        logError(normalized, { source: 'AdminLeadDetailPage.fetchLead', leadId: params.id })
        setError(normalized.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLead()
  }, [params.id])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted">Cargando...</div>
      </AdminLayout>
    )
  }

  if (error || !lead) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <GlassCard>
            <EmptyState
              title="Solicitud no encontrada"
              description="No pudimos cargar esta solicitud. Volvé a la lista y probá de nuevo."
              action={
                <Link href="/admin/leads">
                  <Button variant="secondary">Volver a solicitudes</Button>
                </Link>
              }
            />
          </GlassCard>
        </div>
      </AdminLayout>
    )
  }

  const identifier = lead.email ?? `Solicitud ${lead.id.slice(0, 8)}`
  const location = [lead.city, lead.country].filter(Boolean).join(', ')
  const createdDate = new Date(lead.created_at).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const createdTime = new Date(lead.created_at).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const isNew = lead.status === 'new'

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/admin/leads" className="inline-flex items-center text-sm text-muted hover:text-foreground transition-colors mb-3">
              ← Volver a solicitudes
            </Link>
            <h2 className="text-2xl font-semibold text-foreground">Detalle de solicitud</h2>
            <p className="text-xs text-muted mt-1 font-mono">{lead.id}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {isNew && (
              <Link href={`/admin/leads/${lead.id}/match`}>
                <Button variant="primary">Crear match</Button>
              </Link>
            )}
            <Link href="/admin/leads">
              <Button variant="secondary">Volver a la lista</Button>
            </Link>
          </div>
        </div>

        <GlassCard>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold text-foreground">{identifier}</span>
                <Badge variant={LEAD_STATUS_VARIANT[lead.status] ?? 'default'}>
                  {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
                </Badge>
                {lead.urgency && LEAD_URGENCY_LABEL[lead.urgency] && (
                  <Chip variant="warning" label={LEAD_URGENCY_LABEL[lead.urgency]} />
                )}
              </div>
              <p className="text-sm text-muted">
                Creada el {createdDate} a las {createdTime}
              </p>
            </div>

            {lead.match_count > 0 && (
              <Chip
                variant="brand"
                label={lead.match_count === 1 ? '1 match creado' : `${lead.match_count} matches creados`}
              />
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader className="mb-4">Contacto y contexto</SectionHeader>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted mb-1">Email</dt>
              <dd className="text-sm text-foreground">{lead.email ?? 'No dejó email'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted mb-1">WhatsApp</dt>
              <dd className="text-sm text-foreground">{lead.whatsapp ?? 'No dejó WhatsApp'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted mb-1">Ubicación</dt>
              <dd className="text-sm text-foreground">{location || 'Sin ubicación detallada'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted mb-1">Estado</dt>
              <dd className="text-sm text-foreground">{LEAD_STATUS_LABEL[lead.status] ?? lead.status}</dd>
            </div>
          </dl>
        </GlassCard>

        <GlassCard>
          <SectionHeader className="mb-4">Qué está buscando</SectionHeader>
          {lead.intent_tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {lead.intent_tags.map((tag) => (
                <Chip key={tag} variant="neutral" label={tag} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No hay necesidades registradas para esta solicitud.</p>
          )}
        </GlassCard>

        <GlassCard>
          <SectionHeader className="mb-4">Match actual</SectionHeader>
          {lead.latest_match ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs bg-brand-weak text-brand px-2 py-0.5 rounded-md">
                  {lead.latest_match.tracking_code}
                </span>
                <span className="text-sm text-muted">
                  Creado el {new Date(lead.latest_match.created_at).toLocaleDateString('es-AR')}
                </span>
              </div>

              <div className="space-y-3">
                {lead.latest_match.professionals.map((professional) => (
                  <div key={`${lead.latest_match?.id}-${professional.rank}`} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{professional.name}</p>
                      <p className="text-xs text-muted">{`Posición ${professional.rank}`}</p>
                    </div>
                    {professional.slug && (
                      <Link
                        href={`/p/${professional.slug}`}
                        className="text-sm text-muted hover:text-foreground transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver perfil →
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap pt-2">
                <Link href={`/admin/leads/${lead.id}/match`}>
                  <Button variant="secondary">Rehacer match</Button>
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Todavía no tiene match"
              description="Podés revisar los datos de la solicitud y crear un match cuando estés listo."
              action={
                <Link href={`/admin/leads/${lead.id}/match`}>
                  <Button variant="primary">Crear match</Button>
                </Link>
              }
            />
          )}
        </GlassCard>
      </div>
    </AdminLayout>
  )
}
