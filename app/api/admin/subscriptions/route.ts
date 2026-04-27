// Admin API — Subscription Payments
// POST: Record a Destacado payment and upgrade professional tier (atomic via RPC)
// GET ?professional_id=<uuid>: List past payments for a professional
//
// Security: Gated by middleware (requires admin session via Supabase Auth)
// Note: /api/admin/* is automatically protected by middleware.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'

export const runtime = 'nodejs'

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_CURRENCIES = ['ARS', 'USD'] as const
const VALID_METHODS    = ['mp_link', 'transferencia', 'efectivo', 'otro'] as const

type Currency      = typeof VALID_CURRENCIES[number]
type PaymentMethod = typeof VALID_METHODS[number]

function isUUID(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function isISODate(v: unknown): v is string {
  // Accepts ISO 8601 date strings (YYYY-MM-DD or full timestamp)
  return typeof v === 'string' && !isNaN(Date.parse(v))
}

function toDateOnly(v: string): string {
  // Normalize to YYYY-MM-DD for Postgres DATE columns.
  // Already-formatted YYYY-MM-DD passes through unchanged — avoids a TZ shift on
  // non-UTC dev machines where new Date('2026-04-24').toISOString() returns the
  // previous calendar day (production runs UTC, but local dev may not).
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return new Date(v).toISOString().split('T')[0]
}

// ─── POST /api/admin/subscriptions ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body requerido' }, { status: 400 })
  }

  const {
    professional_id,
    amount,
    currency,
    paid_at,
    period_start,
    period_end,
    payment_method,
    invoice_number,
    notes,
  } = body as Record<string, unknown>

  // Validate required fields
  if (!isUUID(professional_id)) {
    return NextResponse.json({ error: 'professional_id inválido (debe ser UUID)', field: 'professional_id' }, { status: 400 })
  }

  const numAmount = Number(amount)
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return NextResponse.json({ error: 'El monto debe ser mayor que 0', field: 'amount' }, { status: 400 })
  }

  if (!VALID_CURRENCIES.includes(currency as Currency)) {
    return NextResponse.json({ error: `Moneda inválida. Usar: ${VALID_CURRENCIES.join(', ')}`, field: 'currency' }, { status: 400 })
  }

  if (!isISODate(paid_at)) {
    return NextResponse.json({ error: 'paid_at inválido (ISO 8601)', field: 'paid_at' }, { status: 400 })
  }

  if (!isISODate(period_start)) {
    return NextResponse.json({ error: 'period_start inválido (ISO 8601 o YYYY-MM-DD)', field: 'period_start' }, { status: 400 })
  }

  if (!isISODate(period_end)) {
    return NextResponse.json({ error: 'period_end inválido (ISO 8601 o YYYY-MM-DD)', field: 'period_end' }, { status: 400 })
  }

  const pStart = toDateOnly(period_start as string)
  const pEnd   = toDateOnly(period_end as string)

  if (pEnd <= pStart) {
    return NextResponse.json({ error: 'period_end debe ser posterior a period_start', field: 'period_end' }, { status: 400 })
  }

  if (!VALID_METHODS.includes(payment_method as PaymentMethod)) {
    return NextResponse.json({ error: `Método de pago inválido. Usar: ${VALID_METHODS.join(', ')}`, field: 'payment_method' }, { status: 400 })
  }

  // Call the atomic RPC
  try {
    const { data, error } = await supabaseAdmin.rpc('upgrade_destacado_tier', {
      p_professional_id: professional_id,
      p_amount:          numAmount,
      p_currency:        currency,
      p_paid_at:         new Date(paid_at as string).toISOString(),
      p_period_start:    pStart,
      p_period_end:      pEnd,
      p_payment_method:  payment_method,
      p_invoice_number:  typeof invoice_number === 'string' && invoice_number.trim() ? invoice_number.trim() : null,
      p_notes:           typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      p_created_by:      null,  // admin user binding deferred to /pro portal PRD
    })

    if (error) {
      logError(new Error(error.message), { source: 'POST /api/admin/subscriptions', professional_id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'POST /api/admin/subscriptions' })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── GET /api/admin/subscriptions?professional_id=<uuid> ─────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const professionalId = searchParams.get('professional_id')

  if (!isUUID(professionalId)) {
    return NextResponse.json({ error: 'professional_id inválido (debe ser UUID)' }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_payments')
      .select('id, amount, currency, paid_at, period_start, period_end, payment_method, invoice_number, notes, created_at')
      .eq('professional_id', professionalId)
      .order('paid_at', { ascending: false })

    if (error) {
      logError(new Error(error.message), { source: 'GET /api/admin/subscriptions', professional_id: professionalId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payments: data ?? [] })
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { source: 'GET /api/admin/subscriptions' })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
