// Admin — Professionals List
// Shows all professionals grouped by status, with search + status filter

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Badge } from '@/app/components/ui/Badge'
import { SectionHeader } from '@/app/components/ui/SectionHeader'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Chip } from '@/app/components/ui/Chip'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
import { logError } from '@/lib/monitoring'
import { STATUS_CONFIG } from '@/lib/design-constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Professional {
  id: string
  slug: string
  name: string
  specialties: string[]
  status: string
  country: string
  city: string | null
  email: string
  created_at: string
}

// ─── Status filter options ────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Pendiente de revisión' },
  { value: 'active', label: 'Activo' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'draft', label: 'Borrador' },
  { value: 'paused', label: 'Pausado' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [statusValue, setStatusValue] = useState('')

  useEffect(() => {
    async function fetchProfessionals() {
      try {
        const res = await fetch('/api/admin/professionals')
        if (!res.ok) throw new Error('Error al cargar los profesionales')
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

  const filteredProfessionals = useMemo(() => {
    const q = searchValue.toLowerCase()
    return professionals.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.specialties.some((s) => s.toLowerCase().includes(q))
      const matchesStatus = !statusValue || p.status === statusValue
      return matchesSearch && matchesStatus
    })
  }, [professionals, searchValue, statusValue])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted">Cargando...</div>
      </AdminLayout>
    )
  }

  const submitted = filteredProfessionals.filter((p) => p.status === 'submitted')
  const others = filteredProfessionals.filter((p) => p.status !== 'submitted')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Profesionales</h2>
          <p className="text-sm text-muted mt-1">{professionals.length} en total</p>
        </div>

        <AdminFilterBar
          searchPlaceholder="Buscar por nombre o especialidad..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          statusOptions={STATUS_OPTIONS}
          statusValue={statusValue}
          onStatusChange={setStatusValue}
          resultCount={filteredProfessionals.length}
        />

        {filteredProfessionals.length === 0 ? (
          <GlassCard>
            <EmptyState
              title={professionals.length === 0 ? 'Sin profesionales' : 'Sin resultados'}
              description={
                professionals.length === 0
                  ? 'Todavía no hay profesionales registrados.'
                  : 'Probá con otra búsqueda o cambiá el filtro de estado.'
              }
            />
          </GlassCard>
        ) : (
          <div className="space-y-8">
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
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ─── Professional row ─────────────────────────────────────────────────────────

function ProfessionalRow({ professional }: { professional: Professional }) {
  const badge = STATUS_CONFIG[professional.status] || STATUS_CONFIG.draft
  const location = [professional.city, professional.country].filter(Boolean).join(', ')
  const visibleSpecialties = professional.specialties.slice(0, 3)
  const overflow = professional.specialties.length - visibleSpecialties.length
  const registeredDate = new Date(professional.created_at).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Link href={`/admin/professionals/${professional.id}/review`} className="block">
      <GlassCard>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate mb-1">{professional.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {visibleSpecialties.map((s) => (
                <Chip key={s} specialty={s} className="text-[11px] px-2 py-1" />
              ))}
              {overflow > 0 && (
                <span className="text-xs text-muted">+{overflow}</span>
              )}
            </div>
            <p className="text-xs text-muted">
              {location}
              {location && ' · '}
              Registrado {registeredDate}
            </p>
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
