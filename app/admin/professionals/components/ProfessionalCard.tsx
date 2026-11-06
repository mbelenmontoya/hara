// One professional in the admin list (design 13): name, status, chips, actions and payment history.
// Data loading, delete and the subscriptions fetch stay in the page.

'use client'

import Link from 'next/link'
import { ADMIN_BTN_PRIMARY, ADMIN_BTN_SECONDARY, EmptyText, formatAdminDate } from '@/app/admin/components/AdminUI'
import { METHOD_LABEL } from '@/app/admin/professionals/components/DestacadoPaymentModal'
import { isEffectivelyDestacado } from '@/lib/ranking'

export interface AdminProfessional {
  id: string
  slug: string
  name: string
  specialties: string[]
  status: string
  country: string
  city: string | null
  email: string
  created_at: string
  subscription_tier: string
  tier_expires_at: string | null
}

export interface Payment {
  id: string
  amount: number
  currency: string
  paid_at: string
  period_start: string
  period_end: string
  payment_method: string
  invoice_number: string | null
  notes: string | null
  created_at: string
}

export const PRO_STATUS_OPTIONS = [
  { value: 'submitted', label: 'Pendiente de revisión' },
  { value: 'active', label: 'Activo' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'draft', label: 'Borrador' },
  { value: 'paused', label: 'Pausado' },
]

const STATUS_LABEL: Record<string, string> = Object.fromEntries(PRO_STATUS_OPTIONS.map((o) => [o.value, o.label]))
const STATUS_DOT: Record<string, string> = {
  submitted: 'bg-warning-dark',
  active: 'bg-success-dark',
  rejected: 'bg-danger-dark',
  draft: 'bg-gray-500',
  paused: 'bg-info-dark',
}
const VISIBLE_CHIPS = 2

interface ProfessionalCardProps {
  professional: AdminProfessional
  expanded: boolean
  payments: Payment[] | undefined
  onToggleExpand: (id: string) => void
  onUpgrade: (pro: AdminProfessional) => void
  onDelete: (pro: AdminProfessional) => void
}

export function ProfessionalCard({ professional: pro, expanded, payments, onToggleExpand, onUpgrade, onDelete }: ProfessionalCardProps) {
  const pending = pro.status === 'submitted'
  const destacado = isEffectivelyDestacado(pro.subscription_tier, pro.tier_expires_at)
  const specialties = pro.specialties ?? []
  const location = [pro.city, pro.country].filter(Boolean).join(', ')
  const reviewHref = `/admin/professionals/${pro.id}/review`

  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[20px] bg-gray-50 px-5 py-[18px]">
      <div className="flex items-center gap-[9px]">
        <span className="font-almanac-serif min-w-0 text-[22px] leading-[1.1]">{pro.name}</span>
        {destacado && (
          <span className="text-[15px] text-warning-dark" title="Destacado" aria-label="Destacado">
            ★
          </span>
        )}
        <span className="flex-1" />
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-gray-700">
          <span className={`h-[7px] w-[7px] rounded-full ${STATUS_DOT[pro.status] ?? 'bg-gray-500'}`} aria-hidden="true" />
          {STATUS_LABEL[pro.status] ?? pro.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {specialties.slice(0, VISIBLE_CHIPS).map((s) => (
          <span key={s} className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium">
            {s}
          </span>
        ))}
        {specialties.length > VISIBLE_CHIPS && (
          <span className="rounded-full border-[1.5px] border-foreground/14 px-[9px] py-[2.5px] text-[12px] font-medium text-gray-700">
            +{specialties.length - VISIBLE_CHIPS}
          </span>
        )}
        {specialties.length === 0 && <EmptyText className="text-[12.5px]">Sin especialidades</EmptyText>}
      </div>

      <p className="text-[13px] text-muted">
        {location ? `${location} · ` : ''}Registrado {formatAdminDate(pro.created_at)}
      </p>

      <div className="mt-0.5 flex flex-wrap items-center gap-[7px]">
        <Link href={reviewHref} className={pending ? ADMIN_BTN_PRIMARY : ADMIN_BTN_SECONDARY}>
          {pending ? 'Revisar perfil' : 'Ver perfil'}
        </Link>
        {pro.status === 'active' && (
          <button type="button" onClick={() => onUpgrade(pro)} className={ADMIN_BTN_SECONDARY}>
            {destacado ? 'Renovar Destacado' : 'Pasar a Destacado'}
          </button>
        )}
        <span className="flex-1" />
        <button type="button" onClick={() => onDelete(pro)} className="px-0.5 py-1.5 text-[13px] font-medium text-danger-dark hover:underline">
          Eliminar
        </button>
      </div>

      <button
        type="button"
        onClick={() => onToggleExpand(pro.id)}
        aria-expanded={expanded}
        className="flex items-center justify-between border-t border-foreground/8 pt-2.5 text-[13px] font-medium text-gray-700"
      >
        <span>{payments ? `Historial de pagos (${payments.length})` : 'Historial de pagos'}</span>
        <span className="text-[18px] font-light leading-none text-brand" aria-hidden="true">
          {expanded ? '−' : '+'}
        </span>
      </button>

      {expanded && <PaymentHistory payments={payments} />}
    </div>
  )
}

function PaymentHistory({ payments }: { payments: Payment[] | undefined }) {
  if (payments === undefined) return <p className="text-[13px] text-gray-500">Cargando…</p>
  if (payments.length === 0) return <EmptyText className="text-[13px]">Sin pagos registrados.</EmptyText>
  return (
    <div className="flex flex-col gap-1.5">
      {payments.map((p) => (
        <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 rounded-xl bg-background px-3 py-2.5 text-[12.5px] text-gray-700">
          <span className="text-[14px] font-medium text-foreground">
            {p.amount.toLocaleString('es-AR')} {p.currency}
          </span>
          <span>{METHOD_LABEL[p.payment_method as keyof typeof METHOD_LABEL] ?? p.payment_method}</span>
          <span>
            {formatAdminDate(p.period_start)} al {formatAdminDate(p.period_end)}
          </span>
          <span>{p.invoice_number ? `Factura ${p.invoice_number}` : 'Sin factura'}</span>
        </div>
      ))}
    </div>
  )
}
