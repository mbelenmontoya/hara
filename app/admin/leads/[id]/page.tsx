// Hara Vital - Admin Lead Detail (design 13, one Solicitud)
// Contact and context, what the person is looking for, what they told us, and the current match.
// Opening this page marks the lead read in the admin menu.

'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import {
  ADMIN_BACK_LINK,
  ADMIN_BTN_PRIMARY,
  ADMIN_BTN_SECONDARY,
  AdminCard,
  AdminCardTitle,
  AdminEmpty,
  AdminSkeleton,
  EmptyText,
  StatusBadge,
  formatAdminDate,
} from '@/app/admin/components/AdminUI'
import {
  type Lead,
  type LeadMatch,
  LEAD_STATUS_LABEL,
  LEAD_URGENCY_DOT,
  LEAD_URGENCY_LABEL,
  leadTitle,
} from '@/app/admin/leads/shared'
import { logError } from '@/lib/monitoring'

export default function AdminLeadDetailPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLead() {
      try {
        const res = await fetch(`/api/admin/leads/${params.id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al cargar la solicitud')
        setLead(data.lead ?? null)
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err))
        logError(normalized, { source: 'AdminLeadDetailPage.fetchLead', leadId: params.id })
      } finally {
        setLoading(false)
      }
    }
    fetchLead()
  }, [params.id])

  return (
    <AdminLayout markRead={{ kind: 'leads', id: params.id }}>
      <Link href="/admin/leads" className={ADMIN_BACK_LINK}>
        ← Solicitudes
      </Link>
      {loading ? (
        <AdminSkeleton />
      ) : lead ? (
        <LeadDetail lead={lead} />
      ) : (
        <AdminEmpty title="Solicitud no encontrada" text="No pudimos cargar esta solicitud. Volvé a la lista y probá de nuevo.">
          <Link href="/admin/leads" className={ADMIN_BTN_SECONDARY}>
            Volver a solicitudes
          </Link>
        </AdminEmpty>
      )}
    </AdminLayout>
  )
}

function LeadDetail({ lead }: { lead: Lead }) {
  const created = new Date(lead.created_at)
  const time = created.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const matches =
    lead.match_count === 0 ? 'Sin matches todavía' : lead.match_count === 1 ? '1 match creado' : `${lead.match_count} matches creados`
  const urgency = lead.urgency ? LEAD_URGENCY_LABEL[lead.urgency] : undefined
  const location = lead.city ? `${lead.city}, ${lead.country}` : ''

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="font-almanac-serif mb-0 min-w-0 break-words text-[40px] leading-[1.05] tracking-[-0.4px]">{leadTitle(lead)}</h1>
        <StatusBadge label={LEAD_STATUS_LABEL[lead.status] ?? lead.status} />
        {urgency && lead.urgency && (
          <span className="flex items-center gap-1.5 rounded-full border-[1.5px] border-foreground/14 px-2.5 py-[3px] text-[11.5px] font-medium">
            <span className={`h-[7px] w-[7px] rounded-full ${LEAD_URGENCY_DOT[lead.urgency]}`} aria-hidden="true" />
            {urgency}
          </span>
        )}
      </div>
      <p className="mt-2 text-[13.5px] text-muted">
        Creada el {formatAdminDate(lead.created_at)} a las {time} · {matches}
      </p>

      <div className="mt-5 grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <AdminCard>
            <AdminCardTitle>Contacto y contexto</AdminCardTitle>
            <Row label="Email" value={lead.email} empty="No dejó email" />
            <Row label="WhatsApp" value={lead.whatsapp} empty="No dejó WhatsApp" />
            <Row label="Ubicación" value={location} empty="No indicó ubicación" />
            <Row label="Estado" value={LEAD_STATUS_LABEL[lead.status] ?? lead.status} empty="" />
          </AdminCard>

          <AdminCard>
            <AdminCardTitle>
              Qué está <span className="italic">buscando</span>
            </AdminCardTitle>
            {lead.intent_tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {lead.intent_tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-brand-weak px-3 py-1.5 text-[13px] font-medium text-brand-dark">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyText className="text-[14.5px]">No marcó necesidades.</EmptyText>
            )}
          </AdminCard>

          <AdminCard>
            <AdminCardTitle>
              Lo que <span className="italic">contó</span>
            </AdminCardTitle>
            {lead.additional_context ? (
              <p className="font-almanac-serif whitespace-pre-line text-[19px] italic leading-[1.45]">{lead.additional_context}</p>
            ) : (
              <EmptyText className="font-almanac-serif text-[19px] leading-[1.45]">No contó nada más.</EmptyText>
            )}
          </AdminCard>
        </div>

        <MatchCard leadId={lead.id} match={lead.latest_match} />
      </div>
    </>
  )
}

function Row({ label, value, empty }: { label: string; value: string | null; empty: string }) {
  let shown: ReactNode = value
  if (!value) shown = <EmptyText>{empty}</EmptyText>
  return (
    <div className="flex justify-between gap-4 border-b border-foreground/8 py-[11px] text-[14.5px] leading-[1.45]">
      <span className="flex-none text-muted">{label}</span>
      <span className="min-w-0 break-words text-right">{shown}</span>
    </div>
  )
}

function MatchCard({ leadId, match }: { leadId: string; match: LeadMatch | null }) {
  const href = `/admin/leads/${leadId}/match`
  if (!match) {
    return (
      <AdminCard>
        <AdminCardTitle>Match actual</AdminCardTitle>
        <p className="text-[14.5px] leading-normal text-gray-700">
          Todavía no tiene match. Elegí 3 profesionales y le llega la carta por WhatsApp.
        </p>
        <div className="mt-3.5 flex">
          <Link href={href} className={ADMIN_BTN_PRIMARY}>
            Crear match
          </Link>
        </div>
      </AdminCard>
    )
  }
  return (
    <AdminCard>
      <AdminCardTitle>Match actual</AdminCardTitle>
      <p className="font-almanac-serif mt-1 text-[30px] leading-none text-brand-dark">{match.tracking_code}</p>
      <p className="mt-1.5 text-[13px] text-muted">Creado el {formatAdminDate(match.created_at)}</p>
      <div className="mt-3 border-t border-foreground/8">
        {match.professionals.map((p) => (
          <div key={`${match.id}-${p.rank}`} className="flex items-center gap-3 border-b border-foreground/8 py-3">
            <span className="font-almanac-serif flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-weak text-[17px] italic text-brand-dark">
              {p.rank}
            </span>
            <span className="min-w-0 flex-1 text-[14.5px] font-medium">{p.name}</span>
            {p.slug && (
              <Link
                href={`/p/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-medium text-brand-dark hover:underline"
              >
                Ver perfil
              </Link>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex">
        <Link href={href} className={ADMIN_BTN_SECONDARY}>
          Rehacer match
        </Link>
      </div>
    </AdminCard>
  )
}
