// Admin — Professionals List
// Shows all professionals grouped by status, with search + status filter,
// inline Destacado tier management, and expandable payment history.

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Badge } from '@/app/components/ui/Badge'
import { Chip } from '@/app/components/ui/Chip'
import { Button } from '@/app/components/ui/Button'
import { SectionHeader } from '@/app/components/ui/SectionHeader'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
import { DestacadoPaymentModal } from '@/app/admin/professionals/components/DestacadoPaymentModal'
import { logError } from '@/lib/monitoring'
import { isEffectivelyDestacado } from '@/lib/ranking'
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
  subscription_tier: string
  tier_expires_at: string | null
}

interface Payment {
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

const METHOD_LABEL: Record<string, string> = {
  mp_link: 'Mercado Pago',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  otro: 'Otro',
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
  const [loading,       setLoading]       = useState(true)
  const [searchValue,   setSearchValue]   = useState('')
  const [statusValue,   setStatusValue]   = useState('')

  // Modal + expand state
  const [upgradeTarget,  setUpgradeTarget]  = useState<Professional | null>(null)
  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [paymentsCache,  setPaymentsCache]  = useState<Record<string, Payment[]>>({})

  const fetchProfessionals = useCallback(async () => {
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
  }, [])

  useEffect(() => { fetchProfessionals() }, [fetchProfessionals])

  async function loadPayments(professionalId: string) {
    if (paymentsCache[professionalId]) return  // already loaded
    try {
      const res = await fetch(`/api/admin/subscriptions?professional_id=${professionalId}`)
      if (!res.ok) return
      const data = await res.json()
      setPaymentsCache(prev => ({ ...prev, [professionalId]: data.payments || [] }))
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfessionalsPage.loadPayments' })
    }
  }

  function handleToggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      loadPayments(id)
    }
  }

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
  const others    = filteredProfessionals.filter((p) => p.status !== 'submitted')

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
                    <ProfessionalRow
                      key={pro.id}
                      professional={pro}
                      expanded={expandedId === pro.id}
                      payments={paymentsCache[pro.id]}
                      onToggleExpand={handleToggleExpand}
                      onUpgrade={setUpgradeTarget}
                    />
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
                    <ProfessionalRow
                      key={pro.id}
                      professional={pro}
                      expanded={expandedId === pro.id}
                      payments={paymentsCache[pro.id]}
                      onToggleExpand={handleToggleExpand}
                      onUpgrade={setUpgradeTarget}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Destacado payment modal */}
      {upgradeTarget && (
        <DestacadoPaymentModal
          open={!!upgradeTarget}
          onClose={() => setUpgradeTarget(null)}
          onSuccess={() => {
            setUpgradeTarget(null)
            fetchProfessionals()
          }}
          professional={upgradeTarget}
        />
      )}
    </AdminLayout>
  )
}

// ─── Professional row ─────────────────────────────────────────────────────────

interface ProfessionalRowProps {
  professional: Professional
  expanded: boolean
  payments: Payment[] | undefined
  onToggleExpand: (id: string) => void
  onUpgrade: (pro: Professional) => void
}

function ProfessionalRow({ professional: pro, expanded, payments, onToggleExpand, onUpgrade }: ProfessionalRowProps) {
  const badge = STATUS_CONFIG[pro.status] || STATUS_CONFIG.draft
  const location = [pro.city, pro.country].filter(Boolean).join(', ')
  const visibleSpecialties = (pro.specialties ?? []).slice(0, 3)
  const overflow = (pro.specialties?.length ?? 0) - visibleSpecialties.length
  const registeredDate = new Date(pro.created_at).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const effective = isEffectivelyDestacado(pro.subscription_tier, pro.tier_expires_at)
  // Legacy destacado rows (null expiry) are still effective per backward-compat —
  // show "Destacado" without a date. New rows always have an expiry, so we show it.
  const tierLabel = effective
    ? pro.tier_expires_at
      ? `Destacado hasta ${new Date(pro.tier_expires_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : 'Destacado'
    : 'Básico'

  return (
    <GlassCard>
      {/* Main row */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="text-sm font-medium text-foreground truncate">{pro.name}</p>
            {/* Tier status chip */}
            <Chip
              variant={effective ? 'brand' : 'neutral'}
              label={tierLabel}
              className="text-[10px] px-2 py-0.5"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {visibleSpecialties.map((s) => (
              <Chip key={s} specialty={s} className="text-[11px] px-2 py-1" />
            ))}
            {overflow > 0 && <span className="text-xs text-muted">+{overflow}</span>}
          </div>
          <p className="text-xs text-muted">
            {location}{location && ' · '}Registrado {registeredDate}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={badge.variant}>{badge.label}</Badge>

          {/* Upgrade button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpgrade(pro)}
            className="text-xs text-brand hover:bg-brand-weak"
          >
            {effective ? 'Extender' : 'Destacar'}
          </Button>

          {/* Link to review page */}
          <Link
            href={`/admin/professionals/${pro.id}/review`}
            className="text-muted hover:text-foreground transition-colors p-1"
            aria-label={`Ver perfil de ${pro.name}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Expand chevron for payment history */}
          <button
            type="button"
            onClick={() => onToggleExpand(pro.id)}
            className="text-muted hover:text-foreground transition-colors p-1"
            aria-label={expanded ? 'Colapsar historial' : 'Ver historial de pagos'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded payment history */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-outline/50">
          {payments === undefined ? (
            <p className="text-xs text-muted">Cargando historial...</p>
          ) : payments.length === 0 ? (
            <p className="text-xs text-muted">Sin pagos registrados.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Historial de pagos</p>
              {payments.map((payment) => (
                <div key={payment.id} className="text-xs text-foreground flex flex-wrap gap-x-3 gap-y-1">
                  <span className="font-medium">{payment.currency} {payment.amount.toLocaleString('es-AR')}</span>
                  <span className="text-muted">
                    {new Date(payment.paid_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-muted">{METHOD_LABEL[payment.payment_method] ?? payment.payment_method}</span>
                  <span className="text-muted">
                    {payment.period_start} → {payment.period_end}
                  </span>
                  {payment.invoice_number && (
                    <span className="text-muted">Factura {payment.invoice_number}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}
