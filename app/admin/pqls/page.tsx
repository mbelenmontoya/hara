// Hara Vital, Admin PQL Ledger (design 13 admin look; the design has no PQL screen)
// Purpose: View PQL ledger entries with search, month filter, and adjustment modal
// Security: Admin-only via middleware

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AdminLayout } from '@/app/components/AdminLayout'
import { Modal } from '@/app/components/ui/Modal'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
import { useAdminToast } from '@/app/admin/components/AdminToast'
import {
  ADMIN_BTN_PRIMARY,
  ADMIN_BTN_SECONDARY,
  AdminEmpty,
  AdminError,
  AdminNoResults,
  AdminSkeleton,
  AdminTitle,
  formatAdminDate,
} from '@/app/admin/components/AdminUI'
import { logError } from '@/lib/monitoring'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PQLEntry {
  id: string
  professional_id: string
  month: string
  tracking_code: string
  created_at: string
  professional: {
    name: string
    slug: string
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PQLsPage() {
  // The toast lives inside AdminLayout, so the page body is a child of it
  return (
    <AdminLayout>
      <PQLsBody />
    </AdminLayout>
  )
}

function PQLsBody() {
  const toast = useAdminToast()
  const [entries, setEntries] = useState<PQLEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [monthValue, setMonthValue] = useState('')
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)

  const fetchEntries = useCallback(async function fetchEntries() {
    try {
      const res = await fetch('/api/admin/pqls')
      if (!res.ok) throw new Error('Error al cargar el registro PQL')
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'PQLsPage.fetchEntries' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Build month options from distinct billing_month values
  const monthOptions = useMemo(() => {
    const months = [...new Set(entries.map((e) => e.month))].sort().reverse()
    return months.map((m) => ({ value: m, label: formatMonth(m) }))
  }, [entries])

  const filteredEntries = useMemo(() => {
    const q = searchValue.toLowerCase()
    return entries.filter((entry) => {
      const matchesSearch = !q || entry.professional.name.toLowerCase().includes(q)
      const matchesMonth = !monthValue || entry.month === monthValue
      return matchesSearch && matchesMonth
    })
  }, [entries, searchValue, monthValue])

  function openModal(entryId: string) {
    setAdjusting(entryId)
    setAdjustAmount(0)
    setAdjustReason('')
    setReasonError(null)
  }

  function closeModal() {
    setAdjusting(null)
    setAdjustAmount(0)
    setAdjustReason('')
    setReasonError(null)
  }

  async function handleAdjust() {
    if (!adjustReason.trim()) {
      setReasonError('Ingresá un motivo para el ajuste.')
      return
    }
    if (!adjusting) return

    try {
      const res = await fetch(`/api/admin/pqls/${adjusting}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: adjustAmount, reason: adjustReason }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al ajustar el saldo')
      }

      closeModal()
      toast.show('Ajuste registrado.')
      fetchEntries()
    } catch (err: unknown) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'PQLsPage.handleAdjust' })
      setReasonError(err instanceof Error ? err.message : 'Error al ajustar el saldo')
    }
  }

  const field = 'w-full rounded-[13px] bg-background px-[13px] py-3 text-[15px] text-foreground outline-none placeholder:text-gray-500'
  const th = 'pb-3 text-left text-[10.5px] font-medium uppercase tracking-[1.8px] text-muted'

  return (
    <>
      <AdminTitle sub={loading ? undefined : `${entries.length} entradas en el registro`}>Registro PQL</AdminTitle>

      <AdminFilterBar
        searchPlaceholder="Buscar por profesional..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        statusOptions={monthOptions}
        statusValue={monthValue}
        onStatusChange={setMonthValue}
        resultCount={filteredEntries.length}
      />

      {loading ? (
        <AdminSkeleton />
      ) : entries.length === 0 ? (
        <AdminEmpty title="Sin entradas PQL" text="Las entradas aparecen acá cuando se generan eventos de contacto." />
      ) : filteredEntries.length === 0 ? (
        <AdminNoResults
          text="Probá con otra búsqueda o con otro mes."
          onClear={() => {
            setSearchValue('')
            setMonthValue('')
          }}
        />
      ) : (
        <div className="overflow-x-auto rounded-[22px] bg-gray-50 px-[22px] pb-1.5 pt-4">
          <table className="min-w-full" data-testid="pqls-page">
            <thead>
              <tr className="border-b border-foreground/10">
                <th className={th}>Profesional</th>
                <th className={`${th} hidden sm:table-cell`}>Tracking</th>
                <th className={th}>Mes</th>
                <th className={`${th} hidden md:table-cell`}>Fecha</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} data-testid={`pql-entry-${entry.id}`} className="border-b border-foreground/7">
                  <td className="font-almanac-serif py-3 pr-4 text-[19px]">{entry.professional.name}</td>
                  <td className="hidden py-3 pr-4 font-mono text-[13px] text-gray-700 sm:table-cell">{entry.tracking_code}</td>
                  <td className="py-3 pr-4 text-[14px] capitalize text-gray-700">{formatMonth(entry.month)}</td>
                  <td className="hidden py-3 pr-4 text-[13px] text-muted md:table-cell">{formatAdminDate(entry.created_at)}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openModal(entry.id)}
                      data-testid={`adjust-button-${entry.id}`}
                      className="text-[13px] font-medium text-brand-dark hover:underline"
                    >
                      Ajustar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!adjusting}
        onClose={closeModal}
        title={
          <>
            Ajustar saldo <span className="italic text-brand">PQL</span>
          </>
        }
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className={ADMIN_BTN_SECONDARY}>
              Cancelar
            </button>
            <button type="button" onClick={handleAdjust} data-testid="submit-adjustment-button" className={ADMIN_BTN_PRIMARY}>
              Confirmar
            </button>
          </div>
        }
      >
        <div className="mt-2.5 flex flex-col gap-3.5" data-testid="adjustment-modal">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="adjust-amount" className="text-[13.5px] font-medium">Monto</label>
            <input
              id="adjust-amount"
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(Number(e.target.value))}
              data-testid="adjust-amount-input"
              className={field}
            />
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="adjust-reason" className="text-[13.5px] font-medium">Motivo</label>
            <textarea
              id="adjust-reason"
              value={adjustReason}
              onChange={(e) => {
                setAdjustReason(e.target.value)
                setReasonError(null)
              }}
              data-testid="adjust-reason-input"
              rows={3}
              className={`${field} resize-none`}
            />
          </div>
        </div>
        {reasonError && <AdminError text={reasonError} />}
      </Modal>
    </>
  )
}
