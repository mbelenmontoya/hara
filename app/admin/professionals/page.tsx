// Admin — Professionals List
// Shows all professionals grouped by status, links to review

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Badge } from '@/app/components/ui/Badge'
import { SectionHeader } from '@/app/components/ui/SectionHeader'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Chip } from '@/app/components/ui/Chip'
import { logError } from '@/lib/monitoring'

interface Professional {
  id: string
  slug: string
  name: string
  specialties: string[]
  status: string
  country: string
  city: string | null
}

const STATUS_BADGE: Record<string, { label: string; variant: 'new' | 'converted' | 'closed' | 'default' }> = {
  submitted: { label: 'Pendiente', variant: 'new' },
  active: { label: 'Activo', variant: 'converted' },
  rejected: { label: 'Rechazado', variant: 'closed' },
  draft: { label: 'Borrador', variant: 'default' },
  paused: { label: 'Pausado', variant: 'default' },
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfessionals() {
      try {
        const res = await fetch('/api/debug/professionals')
        if (!res.ok) throw new Error('Failed to fetch professionals')
        const data = await res.json()
        setProfessionals(data.professionals || [])
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfessionalsPage' })
      } finally {
        setLoading(false)
      }
    }
    fetchProfessionals()
  }, [])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted">Cargando...</div>
      </AdminLayout>
    )
  }

  const submitted = professionals.filter((p) => p.status === 'submitted')
  const others = professionals.filter((p) => p.status !== 'submitted')

  return (
    <AdminLayout>
      <div className="space-y-8">

        {professionals.length === 0 ? (
          <GlassCard>
            <EmptyState
              title="Sin profesionales"
              description="Todavía no hay profesionales registrados."
            />
          </GlassCard>
        ) : (
          <>
            {submitted.length > 0 && (
              <section>
                <SectionHeader className="mb-3 px-1">
                  {`Pendientes de revisión (${submitted.length})`}
                </SectionHeader>
                <div className="space-y-3">
                  {submitted.map((pro) => (
                    <ProfessionalRow key={pro.id} professional={pro} />
                  ))}
                </div>
              </section>
            )}

            {others.length > 0 && (
              <section>
                <SectionHeader className="mb-3 px-1">
                  {`Revisados (${others.length})`}
                </SectionHeader>
                <div className="space-y-3">
                  {others.map((pro) => (
                    <ProfessionalRow key={pro.id} professional={pro} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

      </div>
    </AdminLayout>
  )
}

function ProfessionalRow({ professional }: { professional: Professional }) {
  const badge = STATUS_BADGE[professional.status] || STATUS_BADGE.draft
  const location = [professional.city, professional.country].filter(Boolean).join(', ')
  const visibleSpecialties = professional.specialties.slice(0, 3)
  const overflow = professional.specialties.length - visibleSpecialties.length

  return (
    <Link href={`/admin/professionals/${professional.id}/review`} className="block">
      <GlassCard>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate mb-1.5">{professional.name}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleSpecialties.map(s => (
                <Chip key={s} specialty={s} className="text-[11px] px-2 py-1" />
              ))}
              {overflow > 0 && (
                <span className="text-xs text-muted">+{overflow}</span>
              )}
              {location && (
                <span className="text-xs text-muted">{visibleSpecialties.length > 0 ? '· ' : ''}{location}</span>
              )}
            </div>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </GlassCard>
    </Link>
  )
}
