'use client'

// DestacadoPaymentModal (design 13, "Pasar a Destacado"): admin form to record a Destacado payment.
// Calls POST /api/admin/subscriptions on submit, which atomically creates
// a subscription_payments row and updates the professional's tier + expiry.

import { useState, type ReactNode } from 'react'
import { Modal } from '@/app/components/ui/Modal'
import { ADMIN_BTN_PRIMARY, ADMIN_BTN_SECONDARY, AdminError, AdminPill, formatAdminDate } from '@/app/admin/components/AdminUI'
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
  /** Called with the new expiry the server computed (it extends an active Destacado). */
  onSuccess: (tierExpiresAt: string | null) => void
  professional: Professional
}

type Currency = 'ARS' | 'USD'
type PaymentMethod = 'mp_link' | 'transferencia' | 'efectivo' | 'otro'
type PeriodPreset = 30 | 90 | 180 | 365 | 'custom'

const CURRENCIES: Currency[] = ['ARS', 'USD']
const PERIOD_PRESETS: Array<{ label: string; value: PeriodPreset }> = [
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
  { label: '180 días', value: 180 },
  { label: '365 días', value: 365 },
  { label: 'Personalizado', value: 'custom' },
]
/** Payment method labels, shared with the payment history rows. */
export const METHOD_LABEL: Record<PaymentMethod, string> = {
  mp_link: 'Mercado Pago (link)',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  otro: 'Otro',
}
const FIELD_CLASS = 'w-full rounded-[13px] bg-background px-[13px] py-3 text-[15px] text-foreground outline-none placeholder:text-gray-500'

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={htmlFor} className="text-[13.5px] font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}

export function DestacadoPaymentModal({ open, onClose, onSuccess, professional }: DestacadoPaymentModalProps) {
  const today = todayISO()
  const currentlyActive = isEffectivelyDestacado(professional.subscription_tier, professional.tier_expires_at)

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [paidAt, setPaidAt] = useState(today)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(30)
  const [customStart, setCustomStart] = useState(today)
  // period_start..period_end are INCLUSIVE on both ends: a "30-day" period from
  // today is today..(today + 29). Matches the RPC's duration math.
  const [customEnd, setCustomEnd] = useState(addDays(today, 29))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mp_link')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Preset anchors to paidAt (the recorded payment date), not today, so backdated
  // payments still produce a coherent audit trail in subscription_payments.
  const isCustom = periodPreset === 'custom'
  const periodStart = isCustom ? customStart : paidAt
  const periodEnd = isCustom ? customEnd : paidAt ? addDays(paidAt, periodPreset - 1) : ''

  function change<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setError('')
    }
  }

  /** First problem with the form, or '' when it can be saved. */
  function validate(): string {
    if (!amount || Number(amount) <= 0) return 'Ingresá el monto del pago.'
    if (!paidAt) return 'Elegí la fecha de pago.'
    if (isCustom && (!customStart || !customEnd)) return 'Completá el inicio y el fin del período.'
    if (periodEnd <= periodStart) return 'El fin tiene que ser posterior al inicio.'
    return ''
  }

  async function handleSubmit() {
    const problem = validate()
    if (problem) return setError(problem)

    setLoading(true)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_id: professional.id,
          amount: Number(amount),
          currency,
          paid_at: new Date(paidAt).toISOString(),
          period_start: periodStart,
          period_end: periodEnd,
          payment_method: paymentMethod,
          invoice_number: invoiceNumber.trim() || null,
          notes: notes.trim() || null,
        }),
      })
      const body = await res.json()
      if (!res.ok) return setError(body?.error ?? 'No pudimos guardar el pago. Intentá de nuevo.')
      onSuccess(body?.tier_expires_at ?? null)
      onClose()
    } catch {
      setError('No se pudo conectar con el servidor. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <>
          {currentlyActive ? 'Renovar' : 'Pasar a'} <span className="italic text-brand">Destacado</span>
        </>
      }
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={loading} className={ADMIN_BTN_SECONDARY}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading} className={ADMIN_BTN_PRIMARY}>
            {loading ? 'Guardando…' : 'Registrar pago'}
          </button>
        </div>
      }
    >
      <p className="text-[14px] leading-normal text-gray-700">{professional.name}</p>
      {currentlyActive && professional.tier_expires_at && (
        <p className="mt-1 text-[13px] text-brand-dark">
          Ya es Destacado hasta el {formatAdminDate(professional.tier_expires_at)}. El pago nuevo extiende ese período.
        </p>
      )}

      <div className="mt-[18px] flex flex-col gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2.5">
          <Field label="Monto" htmlFor="amount">
            <div className="flex items-center gap-1.5 rounded-[13px] bg-background px-[13px]">
              <span className="text-[13px] font-medium text-gray-500">{currency}</span>
              <input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => change(setAmount)(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent py-3 text-[15px] outline-none"
              />
            </div>
          </Field>
          <div className="flex gap-1.5">
            {CURRENCIES.map((c) => (
              <AdminPill key={c} label={c} active={currency === c} onClick={() => setCurrency(c)} />
            ))}
          </div>
        </div>

        <Field label="Fecha de pago" htmlFor="paid-at">
          <input id="paid-at" type="date" value={paidAt} onChange={(e) => change(setPaidAt)(e.target.value)} className={FIELD_CLASS} />
        </Field>

        <div className="flex flex-col gap-[7px]">
          <span className="text-[13.5px] font-medium">Período</span>
          <div className="flex flex-wrap gap-1.5">
            {PERIOD_PRESETS.map(({ label, value }) => (
              <AdminPill key={value} label={label} active={periodPreset === value} onClick={() => change(setPeriodPreset)(value)} />
            ))}
          </div>
          {isCustom && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="period-start" className="mb-[5px] block text-[12px] text-muted">
                  Inicio
                </label>
                <input id="period-start" type="date" value={customStart} onChange={(e) => change(setCustomStart)(e.target.value)} className={FIELD_CLASS} />
              </div>
              <div>
                <label htmlFor="period-end" className="mb-[5px] block text-[12px] text-muted">
                  Fin
                </label>
                <input id="period-end" type="date" value={customEnd} onChange={(e) => change(setCustomEnd)(e.target.value)} className={FIELD_CLASS} />
              </div>
            </div>
          )}
          <p className="text-[12.5px] text-brand-dark">
            {periodEnd && periodEnd > periodStart ? `Destacado hasta el ${formatAdminDate(periodEnd)}` : 'Elegí el período'}
          </p>
        </div>

        <div className="flex flex-col gap-[7px]">
          <span className="text-[13.5px] font-medium">Método</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
              <AdminPill key={m} label={METHOD_LABEL[m]} active={paymentMethod === m} onClick={() => setPaymentMethod(m)} />
            ))}
          </div>
        </div>

        <Field label="Número de factura (AFIP)" htmlFor="invoice">
          <input id="invoice" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Opcional" className={FIELD_CLASS} />
        </Field>

        <Field label="Notas" htmlFor="notes">
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" className={`${FIELD_CLASS} block min-h-[70px] resize-none`} />
        </Field>
      </div>

      {error && <AdminError text={error} />}
    </Modal>
  )
}
