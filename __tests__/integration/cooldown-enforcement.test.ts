// Integration test for the cooldown-enforcement path in
// POST /api/professionals/register.
//
// Pre-requisite: migration 011 must be applied to the test Supabase DB.
// Specifically the test relies on:
//   - `professionals.resubmit_after TIMESTAMPTZ` column
//   - the partial UNIQUE index `professionals_email_active_unique`
//     (allows a fresh `submitted` row alongside an existing `rejected` row)
//   - `'rejected'` accepted by the `professionals_status_check` constraint.
//
// All three are added by migrations/011_pro_resubmit_cooldown.sql.
//
// Run: npm run test:integration -- cooldown-enforcement

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { NextRequest } from 'next/server'

config({ path: resolve(process.cwd(), '.env.local') })

// ── Mock the email module — we test the handler logic, not Resend ────────────

vi.mock('@/lib/email', () => ({
  notifyNewProfessional: vi.fn().mockResolvedValue(true),
  notifyRegistrationReceived: vi.fn().mockResolvedValue(true),
}))

// ── Real Supabase client for setup + cleanup + assertions ────────────────────

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEmail(): string {
  // Throwaway address — namespaced under cooldown-test so afterEach can do a
  // belt-and-suspenders cleanup if any test forgets to wait for its own delete.
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `cooldown-test-${tag}@test.haravital.app`
}

const VALID_FIELDS = (email: string) => ({
  full_name: 'María García',
  email,
  whatsapp: '+5491112345678',
  country: 'AR',
  modality: ['online'],
  specialties: ['ansiedad'],
  practices: ['reiki'],
  bio: 'Soy reikista con 10 años de experiencia acompañando procesos de sanación.',
})

function makeJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/professionals/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function seedRejectedRow(email: string, resubmitAfter: Date): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('professionals')
    .insert({
      slug: `cooldown-seed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'rejected',
      full_name: 'Seed Pro',
      email,
      whatsapp: '+5491100000000',
      country: 'AR',
      modality: ['online'],
      specialties: ['ansiedad'],
      practices: [],
      rejection_reason: 'Seeded for cooldown test.',
      resubmit_after: resubmitAfter.toISOString(),
      bio: 'Placeholder bio of at least fifty characters to satisfy the validation.',
    })
    .select('id')
    .single()

  expect(error).toBeNull()
  expect(data).not.toBeNull()
  return data!.id
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

let testEmail = ''

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  testEmail = makeEmail()
})

afterEach(async () => {
  // Delete BY EMAIL — the "after window" test ends with TWO rows for the same
  // email (rejected seed + freshly-submitted re-application). Cleanup-by-id
  // would leak the second row.
  if (testEmail) {
    await supabaseAdmin.from('professionals').delete().eq('email', testEmail)
  }
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Cooldown enforcement on POST /api/professionals/register', () => {
  it('blocks re-registration within the cooldown window (TS-002)', async () => {
    const within = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    await seedRejectedRow(testEmail, within)

    const { POST } = await import('@/app/api/professionals/register/route')
    const res = await POST(makeJsonRequest(VALID_FIELDS(testEmail)))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toContain('Ya aplicaste a Hara el')
    expect(body.error).toContain('Podés volver a aplicar a partir del')
    expect(body.error).toContain('centrovitalhara@gmail.com')
    expect(body.resubmit_after).toBeTruthy()
    expect(body.previous_application_at).toBeTruthy()

    // Confirm no new row inserted — only the seeded rejected row exists.
    const { data: rows } = await supabaseAdmin
      .from('professionals')
      .select('status')
      .eq('email', testEmail)
    expect(rows).toHaveLength(1)
    expect(rows![0].status).toBe('rejected')
  })

  it('allows re-registration after the cooldown window passes (TS-003)', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    await seedRejectedRow(testEmail, past)

    const email = await import('@/lib/email')
    const { POST } = await import('@/app/api/professionals/register/route')
    const res = await POST(makeJsonRequest(VALID_FIELDS(testEmail)))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    // Confirmation email fired with the submitted email + name.
    expect(email.notifyRegistrationReceived).toHaveBeenCalledWith({
      to: testEmail,
      full_name: 'María García',
    })

    // Two rows: original rejected + fresh submitted.
    const { data: rows } = await supabaseAdmin
      .from('professionals')
      .select('status, created_at')
      .eq('email', testEmail)
      .order('created_at', { ascending: false })
    expect(rows).toHaveLength(2)
    expect(rows![0].status).toBe('submitted')
    expect(rows![1].status).toBe('rejected')
  })

  it('allows first-time registration with no prior rejection', async () => {
    // Don't seed anything — fresh email.
    const email = await import('@/lib/email')
    const { POST } = await import('@/app/api/professionals/register/route')
    const res = await POST(makeJsonRequest(VALID_FIELDS(testEmail)))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    expect(email.notifyRegistrationReceived).toHaveBeenCalledWith({
      to: testEmail,
      full_name: 'María García',
    })

    const { data: rows } = await supabaseAdmin
      .from('professionals')
      .select('status')
      .eq('email', testEmail)
    expect(rows).toHaveLength(1)
    expect(rows![0].status).toBe('submitted')
  })
})
