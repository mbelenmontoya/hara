// Hará Match — Admin PQL Ledger
// Purpose: View PQL ledger entries with search, month filter, and adjustment modal
// Security: Admin-only via middleware

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Button } from '@/app/components/ui/Button'
import { Alert } from '@/app/components/ui/Alert'
import { Modal } from '@/app/components/ui/Modal'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PQLsPage() {
  const [entries, setEntries] = useState<PQLEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [monthValue, setMonthValue] = useState('')
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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
    setActionResult(null)
  }

  function closeModal() {
    setAdjusting(null)
    setAdjustAmount(0)
    setAdjustReason('')
    setReasonError(null)
  }

  async function handleAdjust() {
    if (!adjustReason.trim()) {
      setReasonError('Ingresá un motivo para el ajuste')
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
      setActionResult({ type: 'success', message: 'Ajuste registrado correctamente.' })
      fetchEntries()
    } catch (err: unknown) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'PQLsPage.handleAdjust' })
      setActionResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al ajustar el saldo',
      })
    }
  }

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
          <h2 className="text-2xl font-semibold text-foreground">Registro PQL</h2>
          <p className="text-sm text-muted mt-1">{entries.length} entradas en el registro</p>
        </div>

        <AdminFilterBar
          searchPlaceholder="Buscar por profesional..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          statusOptions={monthOptions}
          statusValue={monthValue}
          onStatusChange={setMonthValue}
          resultCount={filteredEntries.length}
        />

        {actionResult && (
          <Alert variant={actionResult.type === 'success' ? 'success' : 'error'}>
            {actionResult.message}
          </Alert>
        )}

        {filteredEntries.length === 0 ? (
          <GlassCard>
            <EmptyState
              title={entries.length === 0 ? 'Sin entradas PQL' : 'Sin resultados'}
              description={
                entries.length === 0
                  ? 'Las entradas del registro aparecerán aquí cuando se generen eventos de contacto.'
                  : 'Probá con otra búsqueda o cambiá el filtro de mes.'
              }
            />
          </GlassCard>
        ) : (
          <GlassCard>
            <table className="min-w-full" data-testid="pqls-page">
              <thead>
                <tr className="border-b border-outline">
                  <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Profesional</th>
                  <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Tracking</th>
                  <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Mes</th>
                  <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Fecha</th>
                  <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} data-testid={`pql-entry-${entry.id}`}>
                    <td className="py-3.5 pr-4 text-sm text-foreground">{entry.professional.name}</td>
                    <td className="py-3.5 pr-4 text-xs text-muted font-mono hidden sm:table-cell">{entry.tracking_code}</td>
                    <td className="py-3.5 pr-4 text-sm text-muted">{formatMonth(entry.month)}</td>
                    <td className="py-3.5 pr-4 text-xs text-muted hidden md:table-cell">{formatDate(entry.created_at)}</td>
                    <td className="py-3.5">
                      <button
                        onClick={() => openModal(entry.id)}
                        data-testid={`adjust-button-${entry.id}`}
                        className="text-sm text-brand hover:text-brand/80 font-medium transition-colors"
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        )}
      </div>

      <Modal
        open={!!adjusting}
        onClose={closeModal}
        title="Ajustar saldo PQL"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button variant="primary" onClick={handleAdjust} data-testid="submit-adjustment-button">
              Confirmar
            </Button>
          </div>
        }
      >
        <div className="space-y-4" data-testid="adjustment-modal">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Monto</label>
            <input
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(Number(e.target.value))}
              data-testid="adjust-amount-input"
              className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Motivo</label>
            <textarea
              value={adjustReason}
              onChange={(e) => { setAdjustReason(e.target.value); setReasonError(null) }}
              data-testid="adjust-reason-input"
              rows={3}
              className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all resize-none"
            />
            {reasonError && <p className="text-xs text-danger mt-1.5">{reasonError}</p>}
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
