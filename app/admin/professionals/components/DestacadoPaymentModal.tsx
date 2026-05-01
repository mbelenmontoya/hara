'use client'

// DestacadoPaymentModal — admin form to record a Destacado payment.
// Calls POST /api/admin/subscriptions on submit, which atomically creates
// a subscription_payments row and updates the professional's tier + expiry.

import { useState, useEffect } from 'react'
import { Modal } from '@/app/components/ui/Modal'
import { Button } from '@/app/components/ui/Button'
import { Alert } from '@/app/components/ui/Alert'
import { isEffectivelyDestacado } from '@/lib/ranking'

interface Professional {
  id: string
  name: string
  subscription_tier: string
  tier_expires_at: string | null
}

interface DestacadoPaymentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  professional: Professional
}

type Currency      = 'ARS' | 'USD'
type PaymentMethod = 'mp_link' | 'transferencia' | 'efectivo' | 'otro'
type PeriodPreset  = 30 | 90 | 180 | 365 | 'custom'

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DestacadoPaymentModal({ open, onClose, onSuccess, professional }: DestacadoPaymentModalProps) {
  const today = todayISO()
  const currentlyActive = isEffectivelyDestacado(professional.subscription_tier, professional.tier_expires_at)

  // ── Form state ─────────────────────────────────────────────────────────────
  const [amount,        setAmount]        = useState('')
  const [currency,      setCurrency]      = useState<Currency>('ARS')
  const [paidAt,        setPaidAt]        = useState(today)
  const [periodPreset,  setPeriodPreset]  = useState<PeriodPreset>(30)
  const [customStart,   setCustomStart]   = useState(today)
  // period_start..period_end are INCLUSIVE on both ends — a "30-day" period from
  // today is today..(today + 29). Matches the RPC's duration math.
  const [customEnd,     setCustomEnd]     = useState(addDays(today, 29))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mp_link')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes,         setNotes]         = useState('')

  // ── UI state ───────────────────────────────────────────────────────────────
  const [errors,    setErrors]    = useState<Record<string, string>>({})
  const [apiError,  setApiError]  = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)

  // Reset form state when the target professional changes (defensive — the
  // parent currently unmounts/remounts the modal per row, but this makes the
  // component robust if that pattern ever changes).
  useEffect(() => {
    setAmount('')
    setCurrency('ARS')
    setPaidAt(today)
    setPeriodPreset(30)
    setCustomStart(today)
    setCustomEnd(addDays(today, 29))
    setPaymentMethod('mp_link')
    setInvoiceNumber('')
    setNotes('')
    setErrors({})
    setApiError(null)
    // `today` is stable per render via todayISO() — only re-run when professional changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professional.id])

  // Computed period dates from preset or custom inputs.
  // Preset anchors to paidAt (the recorded payment date), not today, so backdated
  // payments still produce a coherent audit trail in subscription_payments.
  // INCLUSIVE semantics: a "30-day" preset from paidAt yields paidAt..(paidAt+29).
  const periodStart = periodPreset === 'custom' ? customStart : paidAt
  const periodEnd   = periodPreset === 'custom' ? customEnd   : addDays(paidAt, periodPreset - 1)

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {}

    if (!amount || Number(amount) <= 0) {
      e.amount = 'El monto debe ser mayor que 0'
    }

    if (periodEnd <= periodStart) {
      e.period = 'La fecha de fin debe ser posterior al inicio del período'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setApiError(null)
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_id: professional.id,
          amount:          Number(amount),
          currency,
          paid_at:         new Date(paidAt).toISOString(),
          period_start:    periodStart,
          period_end:      periodEnd,
          payment_method:  paymentMethod,
          invoice_number:  invoiceNumber.trim() || null,
          notes:           notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        setApiError(body?.error ?? 'Error desconocido al guardar el pago')
        return
      }

      onSuccess()
      onClose()
    } catch {
      setApiError('No se pudo conectar con el servidor. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const PERIOD_PRESETS: Array<{ label: string; value: PeriodPreset }> = [
    { label: '30 días', value: 30 },
    { label: '90 días', value: 90 },
    { label: '180 días', value: 180 },
    { label: '365 días', value: 365 },
    { label: 'Personalizado', value: 'custom' },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={currentlyActive ? 'Extender Destacado' : 'Destacar profesional'}
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">

        {/* Info banner — shown when professional is already Destacado */}
        {currentlyActive && professional.tier_expires_at && (
          <Alert variant="info">
            Este profesional ya es Destacado hasta{' '}
            <strong>{formatDate(professional.tier_expires_at)}</strong>.
            Al registrar un nuevo pago, el periodo se extiende automáticamente.
          </Alert>
        )}

        {/* API error */}
        {apiError && <Alert variant="error">{apiError}</Alert>}

        {/* Monto */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-1">
            Monto
          </label>
          <input
            id="amount"
            type="number"
            min="1"
            value={amount}
            onChange={e => { setAmount(e.target.value); setErrors(prev => ({ ...prev, amount: '' })) }}
            className="w-full border border-outline rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:border-brand"
            placeholder="5000"
          />
          {errors.amount && <p className="text-xs text-danger mt-1">{errors.amount}</p>}
        </div>

        {/* Moneda */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-foreground mb-1">
            Moneda
          </label>
          <select
            id="currency"
            value={currency}
            onChange={e => setCurrency(e.target.value as Currency)}
            className="w-full border border-outline rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:border-brand"
          >
            <option value="ARS">ARS — Peso argentino</option>
            <option value="USD">USD — Dólar</option>
          </select>
        </div>

        {/* Pagado el */}
        <div>
          <label htmlFor="paid-at" className="block text-sm font-medium text-foreground mb-1">
            Pagado el
          </label>
          <input
            id="paid-at"
            type="date"
            value={paidAt}
            onChange={e => setPaidAt(e.target.value)}
            className="w-full border border-outline rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:border-brand"
          />
        </div>

        {/* Periodo */}
        <div>
          <span className="block text-sm font-medium text-foreground mb-2">Periodo</span>
          <div className="flex flex-wrap gap-2 mb-2">
            {PERIOD_PRESETS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setPeriodPreset(value); setErrors(prev => ({ ...prev, period: '' })) }}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  periodPreset === value
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface border-outline text-foreground hover:border-brand'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {periodPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label htmlFor="period-start" className="block text-xs text-muted mb-1">
                  Inicio del período
                </label>
                <input
                  id="period-start"
                  type="date"
                  value={customStart}
                  onChange={e => { setCustomStart(e.target.value); setErrors(prev => ({ ...prev, period: '' })) }}
                  className="w-full border border-outline rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label htmlFor="period-end" className="block text-xs text-muted mb-1">
                  Fin del período <span className="text-muted">(último día incluido)</span>
                </label>
                <input
                  id="period-end"
                  type="date"
                  value={customEnd}
                  onChange={e => { setCustomEnd(e.target.value); setErrors(prev => ({ ...prev, period: '' })) }}
                  className="w-full border border-outline rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          )}
          {errors.period && <p className="text-xs text-danger mt-1">{errors.period}</p>}
        </div>

        {/* Método de pago */}
        <div>
          <label htmlFor="payment-method" className="block text-sm font-medium text-foreground mb-1">
            Método de pago
          </label>
          <select
            id="payment-method"
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
            className="w-full border border-outline rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:border-brand"
          >
            <option value="mp_link">Mercado Pago link</option>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="efectivo">Efectivo</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Factura N° (AFIP) */}
        <div>
          <label htmlFor="invoice" className="block text-sm font-medium text-foreground mb-1">
            Factura N° (AFIP) <span className="text-muted font-normal text-xs">— opcional</span>
          </label>
          <input
            id="invoice"
            type="text"
            value={invoiceNumber}
            onChange={e => setInvoiceNumber(e.target.value)}
            className="w-full border border-outline rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:border-brand"
            placeholder="A-0001-00000001"
          />
        </div>

        {/* Notas */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">
            Notas <span className="text-muted font-normal text-xs">— opcional</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-outline rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:border-brand resize-none"
            placeholder="Ej: renovación anual, descuento aplicado..."
          />
        </div>
      </div>
    </Modal>
  )
}
