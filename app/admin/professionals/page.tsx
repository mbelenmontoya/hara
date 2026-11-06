// Admin, Professionals List (design 13, Profesionales)
// Pending reviews first, then the reviewed ones, with search + status pills,
// Destacado payments, delete with confirmation and expandable payment history.

'use client'

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { AdminLayout } from '@/app/components/AdminLayout'
import { Modal } from '@/app/components/ui/Modal'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
import { useAdminToast } from '@/app/admin/components/AdminToast'
import {
  ADMIN_BTN_SECONDARY,
  AdminEmpty,
  AdminError,
  AdminNoResults,
  AdminSkeleton,
  AdminTitle,
  formatAdminDate,
} from '@/app/admin/components/AdminUI'
import { DestacadoPaymentModal } from '@/app/admin/professionals/components/DestacadoPaymentModal'
import {
  type AdminProfessional,
  type Payment,
  PRO_STATUS_OPTIONS,
  ProfessionalCard,
} from '@/app/admin/professionals/components/ProfessionalCard'
import { logError } from '@/lib/monitoring'

const DELETE_ERROR = 'No pudimos eliminar el perfil. Intentá de nuevo.'

export default function ProfessionalsPage() {
  // The toast lives inside AdminLayout, so the page body is a child of it
  return (
    <AdminLayout>
      <ProfessionalsBody />
    </AdminLayout>
  )
}

function ProfessionalsBody() {
  const toast = useAdminToast()
  const [professionals, setProfessionals] = useState<AdminProfessional[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [statusValue, setStatusValue] = useState('')
  const [upgradeTarget, setUpgradeTarget] = useState<AdminProfessional | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminProfessional | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [paymentsCache, setPaymentsCache] = useState<Record<string, Payment[]>>({})

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

  useEffect(() => {
    fetchProfessionals()
  }, [fetchProfessionals])

  async function loadPayments(professionalId: string, force = false) {
    if (paymentsCache[professionalId] && !force) return
    try {
      const res = await fetch(`/api/admin/subscriptions?professional_id=${professionalId}`)
      if (!res.ok) return
      const data = await res.json()
      setPaymentsCache((prev) => ({ ...prev, [professionalId]: data.payments || [] }))
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfessionalsPage.loadPayments' })
    }
  }

  function handleToggleExpand(id: string) {
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id)
    else {
      next.add(id)
      loadPayments(id)
    }
    setExpandedIds(next)
  }

  function handlePaid(pro: AdminProfessional, expiresAt: string | null) {
    setUpgradeTarget(null)
    toast.show(`Pago registrado. ${pro.name} es Destacado${expiresAt ? ` hasta el ${formatAdminDate(expiresAt)}` : ''}.`)
    setExpandedIds((prev) => new Set(prev).add(pro.id))
    loadPayments(pro.id, true)
    fetchProfessionals()
  }

  function handleDeleted(pro: AdminProfessional) {
    setDeleteTarget(null)
    toast.show(`Eliminaste el perfil de ${pro.name}.`)
    fetchProfessionals()
  }

  const filtered = useMemo(() => {
    const q = searchValue.toLowerCase()
    return professionals.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.specialties.some((s) => s.toLowerCase().includes(q))
      return matchesSearch && (!statusValue || p.status === statusValue)
    })
  }, [professionals, searchValue, statusValue])

  const cardProps = (pro: AdminProfessional) => ({
    professional: pro,
    expanded: expandedIds.has(pro.id),
    payments: paymentsCache[pro.id],
    onToggleExpand: handleToggleExpand,
    onUpgrade: setUpgradeTarget,
    onDelete: setDeleteTarget,
  })
  const pending = filtered.filter((p) => p.status === 'submitted')
  const reviewed = filtered.filter((p) => p.status !== 'submitted')

  return (
    <>
      <AdminTitle sub={loading ? undefined : professionals.length === 1 ? '1 profesional' : `${professionals.length} profesionales`}>
        Profesionales
      </AdminTitle>

      <AdminFilterBar
        searchPlaceholder="Buscar por nombre o especialidad..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        statusOptions={PRO_STATUS_OPTIONS}
        statusValue={statusValue}
        onStatusChange={setStatusValue}
        resultCount={filtered.length}
      />

      {loading ? (
        <AdminSkeleton />
      ) : professionals.length === 0 ? (
        <AdminEmpty title="Sin profesionales" text="Cuando alguien complete el formulario de Soy profesional, aparece acá." />
      ) : filtered.length === 0 ? (
        <AdminNoResults
          text="Nadie coincide con esa búsqueda o estado."
          onClear={() => {
            setSearchValue('')
            setStatusValue('')
          }}
        />
      ) : (
        <>
          {pending.length > 0 && (
            <ProGroup title={`Pendientes de revisión (${pending.length})`} first>
              {pending.map((pro) => (
                <ProfessionalCard key={pro.id} {...cardProps(pro)} />
              ))}
            </ProGroup>
          )}
          {reviewed.length > 0 && (
            <ProGroup title={`Revisados (${reviewed.length})`} first={pending.length === 0}>
              {reviewed.map((pro) => (
                <ProfessionalCard key={pro.id} {...cardProps(pro)} />
              ))}
            </ProGroup>
          )}
        </>
      )}

      {upgradeTarget && (
        <DestacadoPaymentModal
          open
          onClose={() => setUpgradeTarget(null)}
          onSuccess={(expiresAt) => handlePaid(upgradeTarget, expiresAt)}
          professional={upgradeTarget}
        />
      )}

      {deleteTarget && <DeleteDialog pro={deleteTarget} onCancel={() => setDeleteTarget(null)} onDeleted={handleDeleted} />}
    </>
  )
}

function ProGroup({ title, first, children }: { title: string; first: boolean; children: ReactNode }) {
  return (
    <section>
      <h2 className={`font-almanac-serif text-[24px] ${first ? 'mb-2.5 mt-1' : 'mb-2.5 mt-6'}`}>{title}</h2>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">{children}</div>
    </section>
  )
}

interface DeleteDialogProps {
  pro: AdminProfessional
  onCancel: () => void
  onDeleted: (pro: AdminProfessional) => void
}

function DeleteDialog({ pro, onCancel, onDeleted }: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/professionals/${pro.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? DELETE_ERROR)
        return
      }
      onDeleted(pro)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ProfessionalsPage.delete' })
      setError(DELETE_ERROR)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open
      onClose={() => !deleting && onCancel()}
      title={
        <>
          ¿Eliminar a <span className="italic">{pro.name}</span>?
        </>
      }
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={deleting} className={ADMIN_BTN_SECONDARY}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={deleting}
            className="inline-flex flex-none items-center rounded-[14px] bg-danger-dark px-[17px] py-[11px] text-[14px] font-medium text-gray-50 disabled:opacity-60"
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      }
    >
      <p className="text-[14px] leading-normal text-gray-700">
        Se borran su perfil, sus reseñas, sus recomendaciones y su historial de pagos. No se puede deshacer.
      </p>
      {error && <AdminError text={error} />}
    </Modal>
  )
}
