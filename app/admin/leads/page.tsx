// Hara Vital - Admin Leads Page (design 13, Solicitudes)
// Client component: fetches leads with match context, supports search + status pills

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
import {
  ADMIN_BTN_PRIMARY,
  ADMIN_BTN_SECONDARY,
  AdminEmpty,
  AdminNoResults,
  AdminSkeleton,
  AdminTitle,
  StatusBadge,
  formatAdminDate,
} from '@/app/admin/components/AdminUI'
import {
  type Lead,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_OPTIONS,
  LEAD_URGENCY_DOT,
  LEAD_URGENCY_LABEL,
  leadTitle,
} from '@/app/admin/leads/shared'
import { logError } from '@/lib/monitoring'

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

  function clearFilters() {
    setSearchValue('')
    setStatusValue('')
  }

  return (
    <AdminLayout>
      <AdminTitle sub={loading ? undefined : leads.length === 1 ? '1 solicitud' : `${leads.length} solicitudes`}>
        Solicitudes
      </AdminTitle>

      <AdminFilterBar
        searchPlaceholder="Buscar por email o necesidad..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        statusOptions={LEAD_STATUS_OPTIONS}
        statusValue={statusValue}
        onStatusChange={setStatusValue}
        resultCount={filteredLeads.length}
      />

      {loading ? (
        <AdminSkeleton />
      ) : leads.length === 0 ? (
        <AdminEmpty title="Sin solicitudes" text="Cuando alguien le pida ayuda al concierge, aparece acá." />
      ) : filteredLeads.length === 0 ? (
        <AdminNoResults onClear={clearFilters} />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

function LeadCard({ lead }: { lead: Lead }) {
  const location = [lead.city, lead.country].filter(Boolean).join(', ')
  const urgency = lead.urgency ? LEAD_URGENCY_LABEL[lead.urgency] : undefined
  const match = lead.latest_match

  return (
    <div className="flex min-w-0 flex-col gap-[9px] rounded-[20px] bg-gray-50 px-5 py-[18px]">
      <div className="flex items-center gap-2.5">
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{leadTitle(lead)}</span>
        <StatusBadge label={LEAD_STATUS_LABEL[lead.status] ?? lead.status} />
      </div>

      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-gray-700">
        <span>{formatAdminDate(lead.created_at)}</span>
        {location && <span>{location}</span>}
        {urgency && lead.urgency && (
          <span className="flex items-center gap-1.5">
            <span className={`h-[7px] w-[7px] rounded-full ${LEAD_URGENCY_DOT[lead.urgency]}`} aria-hidden="true" />
            {urgency}
          </span>
        )}
      </div>

      <p className="font-almanac-serif text-[21px] leading-[1.15]">{lead.intent_tags[0] ?? 'General'}</p>

      {match && (
        <p className="rounded-xl bg-background px-3 py-[9px] text-[13px] leading-[1.45] text-gray-800">
          <span className="font-medium text-brand-dark">{match.tracking_code}</span>
          {' · '}
          <span>{match.professionals.map((p) => p.name).join(' · ')}</span>
        </p>
      )}

      <div className="mt-1 flex gap-2">
        <Link href={`/admin/leads/${lead.id}`} className={ADMIN_BTN_SECONDARY}>
          Ver detalle
        </Link>
        {lead.status === 'new' && !match && (
          <Link href={`/admin/leads/${lead.id}/match`} className={ADMIN_BTN_PRIMARY}>
            Crear match
          </Link>
        )}
      </div>
    </div>
  )
}
