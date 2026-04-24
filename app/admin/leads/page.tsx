// Hará Match - Admin Leads Page
// Client component — fetches leads with match context, supports search + status filtering

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
import {
  type Lead,
  LEAD_STATUS_OPTIONS,
  LEAD_STATUS_VARIANT,
  LEAD_URGENCY_LABEL,
} from '@/app/admin/leads/shared'
import { logError } from '@/lib/monitoring'

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [statusValue, setStatusValue] = useState('')

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch('/api/admin/leads')
        if (!res.ok) throw new Error('Error al cargar solicitudes')
        const data = await res.json()
        setLeads(data.leads || [])
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), { source: 'AdminLeadsPage' })
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [])

  const filteredLeads = useMemo(() => {
    const q = searchValue.toLowerCase()
    return leads.filter((lead) => {
      const matchesSearch =
        !q ||
        (lead.email ?? '').toLowerCase().includes(q) ||
        lead.intent_tags.some((t) => t.toLowerCase().includes(q))
      const matchesStatus = !statusValue || lead.status === statusValue
      return matchesSearch && matchesStatus
    })
  }, [leads, searchValue, statusValue])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted">Cargando...</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Solicitudes</h2>
          <p className="text-sm text-muted mt-1">{leads.length} solicitudes en total</p>
        </div>

        <AdminFilterBar
          searchPlaceholder="Buscar por email o necesidad..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          statusOptions={LEAD_STATUS_OPTIONS}
          statusValue={statusValue}
          onStatusChange={setStatusValue}
          resultCount={filteredLeads.length}
        />

        {filteredLeads.length === 0 ? (
          <GlassCard>
            <EmptyState
              title={leads.length === 0 ? 'Sin solicitudes' : 'Sin resultados'}
              description={
                leads.length === 0
                  ? 'Las nuevas solicitudes aparecerán aquí cuando se registren desde el formulario público.'
                  : 'Probá con otra búsqueda o cambiá el filtro de estado.'
              }
            />
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ─── Lead card ────────────────────────────────────────────────────────────────

function LeadCard({ lead }: { lead: Lead }) {
  const isNew = lead.status === 'new'
  const primaryNeed = lead.intent_tags?.[0] ?? 'General'
  const location = [lead.city, lead.country].filter(Boolean).join(', ')
  const date = new Date(lead.created_at).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Row 1: identifier + status + date */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-foreground text-sm truncate hover:underline">
              {lead.email ?? `Solicitud ${lead.id.slice(0, 8)}`}
            </Link>
            <Badge variant={LEAD_STATUS_VARIANT[lead.status] ?? 'default'}>{lead.status}</Badge>
            <time className="text-xs text-muted ml-auto">{date}</time>
          </div>

          {/* Row 2: location · urgency · intent */}
          <div className="flex items-center gap-1.5 text-xs text-muted flex-wrap">
            {location && <span>{location}</span>}
            {location && <span className="text-outline">·</span>}
            {lead.urgency && LEAD_URGENCY_LABEL[lead.urgency] && (
              <>
                <span className="text-warning font-medium">{LEAD_URGENCY_LABEL[lead.urgency]}</span>
                <span className="text-outline">·</span>
              </>
            )}
            <span>{primaryNeed}</span>
          </div>

          {/* Row 3: match context (if matched) */}
          {lead.latest_match && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-outline/40">
              <span className="font-mono text-xs bg-brand-weak text-brand px-2 py-0.5 rounded-md">
                {lead.latest_match.tracking_code}
              </span>
              <span className="text-xs text-muted">
                {lead.latest_match.professionals.map((p) => p.name).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          <Link href={`/admin/leads/${lead.id}`}>
            <Button variant="secondary" size="sm">
              Ver detalle
            </Button>
          </Link>
          {isNew && (
            <Link href={`/admin/leads/${lead.id}/match`}>
              <Button variant="primary" size="sm">
                Crear match
              </Button>
            </Link>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
