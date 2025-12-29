// Hará Match - PQL Adjustments API
// Purpose: Waive/dispute/refund PQLs via append-only audit trail
// Security: Admin-only (auth required), never mutates pqls table (append-only)
// Auth: created_by extracted from session (NOT from request body)

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizeBillingMonth } from '@/lib/billing-month'
import { getAdminUserId } from '@/lib/admin-auth'

export const runtime = 'nodejs'

interface AdjustmentRequest {
  adjustment_type: 'waive' | 'dispute' | 'refund' | 'restore'
  reason: string
  notes?: string
  billing_month: string  // YYYY-MM-DD format
  // created_by NOT in request (extracted from auth)
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  // Check admin auth
  const adminUserId = getAdminUserId()
  if (typeof adminUserId === 'object') {
    return NextResponse.json({ error: adminUserId.error }, { status: adminUserId.status })
  }

  try {
    const body: AdjustmentRequest = await req.json()

    // Validate input
    if (!body.adjustment_type || !body.reason || !body.billing_month) {
      return NextResponse.json(
        { error: 'adjustment_type, reason, billing_month required' },
        { status: 400 }
      )
    }

    if (!['waive', 'dispute', 'refund', 'restore'].includes(body.adjustment_type)) {
      return NextResponse.json({ error: 'Invalid adjustment_type' }, { status: 400 })
    }

    // Normalize billing_month (strict validation)
    let billingMonth: string
    try {
      billingMonth = normalizeBillingMonth(body.billing_month)
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }

    // Verify PQL exists
    const { data: pql, error: pqlError } = await supabaseAdmin
      .from('pqls')
      .select('*')
      .eq('id', params.id)
      .single()

    if (pqlError || !pql) {
      return NextResponse.json({ error: 'PQL not found' }, { status: 404 })
    }

    // Insert adjustment (APPEND-ONLY - never UPDATE pqls table)
    const { data: adjustment, error: adjError } = await supabaseAdmin
      .from('pql_adjustments')
      .insert({
        pql_id: params.id,
        adjustment_type: body.adjustment_type,
        reason: body.reason,
        notes: body.notes,
        billing_month: billingMonth,  // Normalized (first of month)
        created_by: adminUserId,  // From auth (NOT request body)
      })
      .select()
      .single()

    if (adjError) {
      console.error('Failed to create adjustment:', adjError)
      return NextResponse.json({
        error: 'Failed to create adjustment',
        details: adjError.message,
        code: adjError.code,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      adjustment_id: adjustment.id,
      pql_id: params.id,
      adjustment_type: body.adjustment_type,
    })
  } catch (error) {
    console.error('Adjustment error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
