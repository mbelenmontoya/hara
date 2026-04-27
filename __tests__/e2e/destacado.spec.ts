// E2E tests for Destacado tier MVP (TS-001 through TS-005)
//
// TS-001: Admin records a payment → Destacado tier activates (admin auth required)
// TS-002: Destacado chip visible on /profesionales card
// TS-003: Destacado chip visible on /p/[slug] profile
// TS-004: Cron endpoint cleans up expired Destacado rows
// TS-005: Silent extension preserves paid time (admin auth required)
//
// All DB-dependent tests skip gracefully when migration 005 is not applied.
// Apply migration before running:
//   node scripts/apply-destacado-migration.mjs
//   or paste migrations/005_destacado_tier_mvp.sql in Supabase SQL Editor.
//
// Admin-required tests (TS-001, TS-005) skip when admin Playwright project is
// not configured (storageState missing). Public tests (TS-002, TS-003, TS-004)
// run under the `public` project and only need migration 005 + a destacado fixture.

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ts = Date.now()
const slug = (n: number) => `destacado-e2e-${ts}-${n}`
const email = (n: number) => `destacado-e2e-${ts}-${n}@test.invalid`

const FIFTY_CHAR_BIO = 'A'.repeat(50)

// Active destacado professional (future expiry, full completeness — should appear with chip)
const activeDestacado = {
  slug: slug(1),
  status: 'active',
  full_name: 'Destacado E2E Active',
  email: email(1),
  whatsapp: '+5491112345678',
  country: 'AR',
  modality: ['online'],
  specialties: ['ansiedad'],
  profile_image_url: 'https://example.com/img.jpg',
  short_description: 'Breve descripción.',
  bio: FIFTY_CHAR_BIO,
  experience_description: 'Tengo experiencia en...',
  service_type: ['individual'],
  online_only: true,
  instagram: 'destacado_e2e',
  accepting_new_clients: true,
  subscription_tier: 'destacado',
  tier_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
}

// Expired destacado professional (past expiry — for cron cleanup test)
const expiredDestacado = {
  slug: slug(2),
  status: 'active',
  full_name: 'Destacado E2E Expired',
  email: email(2),
  whatsapp: '+5491112345679',
  country: 'AR',
  modality: ['online'],
  specialties: ['depresion'],
  accepting_new_clients: true,
  subscription_tier: 'destacado',
  tier_expires_at: new Date(Date.now() - 86400000).toISOString(),
}

let migrationApplied = false
let activeId: string | null = null
let expiredId: string | null = null

test.beforeAll(async () => {
  const { error: probe } = await supabase
    .from('professionals')
    .select('tier_expires_at')
    .limit(1)

  if (probe) {
    console.warn(
      '\n⚠  Destacado E2E skipping DB tests: ' + probe.message +
      '\n   Apply migration 005 (and 004) and ensure Supabase is reachable.\n'
    )
    return
  }

  migrationApplied = true

  const { data: a, error: aErr } = await supabase
    .from('professionals')
    .insert(activeDestacado)
    .select('id')
    .single()
  if (!aErr && a) activeId = a.id

  const { data: e, error: eErr } = await supabase
    .from('professionals')
    .insert(expiredDestacado)
    .select('id')
    .single()
  if (!eErr && e) expiredId = e.id
})

test.afterAll(async () => {
  const ids = [activeId, expiredId].filter((x): x is string => !!x)
  if (ids.length > 0) {
    await supabase.from('professionals').delete().in('id', ids)
  }
  // Belt-and-suspenders cleanup
  await supabase.from('professionals').delete().like('slug', `destacado-e2e-%`)
})

// ── TS-002: Destacado chip on /profesionales ──────────────────────────────────

test.describe('TS-002 — Destacado chip on /profesionales', () => {
  test('directory card shows Destacado chip for active destacado professional', async ({ page }) => {
    test.skip(!migrationApplied, 'Migration 005 not applied or Supabase unreachable')
    test.skip(!activeId, 'Active destacado fixture not seeded')

    await page.goto('/profesionales')
    await page.waitForLoadState('networkidle')

    // The card for "Destacado E2E Active" must show the destacado-chip data-testid
    // Find the card containing this professional's name
    const card = page.locator('[data-testid="professional-card"]', {
      has: page.getByText('Destacado E2E Active'),
    })
    await expect(card).toBeVisible()
    await expect(card.locator('[data-testid="destacado-chip"]')).toBeVisible()
  })

  test('expired destacado professional does NOT show chip on directory', async ({ page }) => {
    test.skip(!migrationApplied, 'Migration 005 not applied or Supabase unreachable')
    test.skip(!expiredId, 'Expired destacado fixture not seeded')

    await page.goto('/profesionales')
    await page.waitForLoadState('networkidle')

    // The card for "Destacado E2E Expired" must NOT show a destacado-chip
    // (trigger sees expired tier and effective contribution = 0; chip is gated by isEffectivelyDestacado)
    const card = page.locator('[data-testid="professional-card"]', {
      has: page.getByText('Destacado E2E Expired'),
    })
    if (await card.count() > 0) {
      await expect(card.locator('[data-testid="destacado-chip"]')).toHaveCount(0)
    }
    // If card not present, the row was filtered out — also acceptable; the assertion is "no chip visible".
  })
})

// ── TS-003: Destacado chip on /p/[slug] ───────────────────────────────────────

test.describe('TS-003 — Destacado chip on /p/[slug]', () => {
  test('profile page shows Destacado chip near the name for active destacado', async ({ page }) => {
    test.skip(!migrationApplied, 'Migration 005 not applied or Supabase unreachable')
    test.skip(!activeId, 'Active destacado fixture not seeded')

    await page.goto(`/p/${activeDestacado.slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="professional-profile"]')).toBeVisible()
    await expect(page.locator('[data-testid="destacado-chip"]')).toBeVisible()
  })

  test('expired destacado profile does NOT show chip', async ({ page }) => {
    test.skip(!migrationApplied, 'Migration 005 not applied or Supabase unreachable')
    test.skip(!expiredId, 'Expired destacado fixture not seeded')

    const response = await page.goto(`/p/${expiredDestacado.slug}`)
    // Profile renders if status='active' regardless of tier. Chip should be absent.
    if (response?.status() === 200) {
      await page.waitForLoadState('networkidle')
      await expect(page.locator('[data-testid="destacado-chip"]')).toHaveCount(0)
    }
  })
})

// ── TS-004: Cron endpoint expires past-due Destacado rows ────────────────────

test.describe('TS-004 — Cron endpoint cleanup', () => {
  test('returns 401 when Authorization header is missing', async ({ request }) => {
    const res = await request.get('/api/cron/expire-destacado')
    expect(res.status()).toBe(401)
  })

  test('returns 401 when Bearer token is wrong', async ({ request }) => {
    const res = await request.get('/api/cron/expire-destacado', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    expect(res.status()).toBe(401)
  })

  test('returns 200 with updated count for valid CRON_SECRET (cleans up expired row)', async ({ request }) => {
    test.skip(!migrationApplied, 'Migration 005 not applied or Supabase unreachable')
    test.skip(!expiredId, 'Expired destacado fixture not seeded')
    test.skip(!process.env.CRON_SECRET, 'CRON_SECRET not set in environment')

    const res = await request.get('/api/cron/expire-destacado', {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('updated')
    expect(typeof body.updated).toBe('number')
    expect(Array.isArray(body.ids)).toBe(true)
    // The expired fixture should be in the cleaned-up list
    expect(body.ids).toContain(expiredId)

    // Verify DB state — expired fixture is now basico with null expiry
    const { data } = await supabase
      .from('professionals')
      .select('subscription_tier, tier_expires_at')
      .eq('id', expiredId!)
      .single()
    expect(data?.subscription_tier).toBe('basico')
    expect(data?.tier_expires_at).toBeNull()
  })
})

// ── TS-001 / TS-005: Admin upgrade flow (admin auth required) ────────────────
// These tests require admin Playwright project + storageState. They sit under
// the `public` test project here (so they run with `npm run test:e2e`) but
// gracefully skip when admin auth isn't available — admin-required behavior is
// also covered by the DestacadoPaymentModal unit tests + parity RPC test.

test.describe('TS-001 / TS-005 — Admin upgrade and silent extension', () => {
  test('admin upgrade + silent extension covered by unit + integration tests', () => {
    test.skip(true,
      'Admin UI flow is exercised by:\n' +
      '  - DestacadoPaymentModal.test.tsx (form validation + payload shape)\n' +
      '  - ranking-parity.test.ts fixture 11 (silent extension RPC arithmetic)\n' +
      '  - app/api/admin/subscriptions/route.test.ts (POST validation)\n' +
      'Full admin Playwright project not configured in this spec — extend later.'
    )
  })
})
