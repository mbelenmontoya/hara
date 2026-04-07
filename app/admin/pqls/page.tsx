// Hará Match — Admin PQL Ledger
// Purpose: View PQL ledger entries and make balance adjustments
// Security: Admin-only via middleware

'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Button } from '@/app/components/ui/Button'
import { Alert } from '@/app/components/ui/Alert'
import { Modal } from '@/app/components/ui/Modal'
import { SectionHeader } from '@/app/components/ui/SectionHeader'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { logError } from '@/lib/monitoring'

interface PQLEntry {
  id: string
  professional_id: string
  month: string
  balance: number
  created_at: string
  professionals: {
    name: string
    slug: string
  }
}

export default function PQLsPage() {
  const [entries, setEntries] = useState<PQLEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchEntries()
  }, [])

  async function fetchEntries() {
    try {
      const res = await fetch('/api/debug/pqls')
      if (!res.ok) throw new Error('Error al cargar el registro PQL')
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'PQLsPage.fetchEntries' })
    } finally {
      setLoading(false)
    }
  }

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

        {actionResult && (
          <Alert variant={actionResult.type === 'success' ? 'success' : 'error'}>
            {actionResult.message}
          </Alert>
        )}

        {entries.length === 0 ? (
          <GlassCard>
            <EmptyState
              title="Sin entradas PQL"
              description="Las entradas del registro aparecerán aquí cuando se generen eventos de contacto."
            />
          </GlassCard>
        ) : (
          <GlassCard>
            <table className="min-w-full" data-testid="pqls-page">
              <thead>
                <tr className="border-b border-outline">
                  <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Profesional</th>
                  <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Mes</th>
                  <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Saldo</th>
                  <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {entries.map((entry) => (
                  <tr key={entry.id} data-testid={`pql-entry-${entry.id}`}>
                    <td className="py-3.5 pr-4 text-sm text-foreground">{entry.professionals.name}</td>
                    <td className="py-3.5 pr-4 text-sm text-muted">{entry.month}</td>
                    <td className="py-3.5 pr-4 text-sm text-foreground font-medium">{entry.balance}</td>
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
