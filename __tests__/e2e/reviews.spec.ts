// E2E tests for Reviews Collection System (TS-001 through TS-005)
//
// TS-001: Submit review via valid token → thank-you page; revisit → "ya enviada"
// TS-002: Reviews card on /profesionales (covered by directory.spec.ts if Destacado + reviews)
// TS-003: Admin toggle is_hidden → aggregate recomputes (admin auth required)
// TS-004: Cron /api/cron/send-review-requests auth (401 path, no DB needed)
// TS-005: ContactButton fires event for direct profile click (TS-005 already in destacado.spec.ts)
//
// DB-dependent tests skip gracefully when migration 006 is not applied.

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
const slug = `reviews-e2e-${ts}`
const testToken = `reviews-e2e-token-${ts}`

let migration006Applied = false
let professionalId = ''
let reviewRequestId = ''

test.beforeAll(async () => {
  const { error: probe } = await supabase.from('reviews').select('id').limit(1)
  if (probe) {
    console.warn('\n⚠  Reviews E2E skipping DB tests — migration 006 not applied.\n')
    return
  }

  migration006Applied = true

  const { data: pro, error: proErr } = await supabase
    .from('professionals')
    .insert({
      slug, status: 'active', full_name: 'Reviews E2E Pro',
      email: `${slug}@test.invalid`,
      whatsapp: '+5491112345678', country: 'AR', modality: ['online'], specialties: ['ansiedad'],
      accepting_new_clients: true,
    })
    .select('id')
    .single()

  if (proErr || !pro) return
  professionalId = pro.id

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: req } = await supabase
    .from('review_requests')
    .insert({
      professional_id: professionalId,
      contact_event_id: 'e2e00000-0000-0000-0000-' + ts.toString().padStart(12, '0').slice(0, 12),
      email: 'reviewer@test.invalid',
      token: testToken,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (req) reviewRequestId = req.id
})

test.afterAll(async () => {
  if (professionalId) {
    await supabase.from('professionals').delete().eq('id', professionalId)
  }
  await supabase.from('professionals').delete().like('slug', `reviews-e2e-%`)
})

// ── TS-001: Review submission flow ────────────────────────────────────────────

test.describe('TS-001 — Review submission via valid token', () => {
  test('renders form for valid token; shows thank-you on submit', async ({ page }) => {
    test.skip(!migration006Applied, 'Migration 006 not applied or Supabase unreachable')

    await page.goto(`/r/review/${testToken}`)
    await page.waitForLoadState('networkidle')

    // Form renders
    await expect(page.locator('[aria-label*="estrella"]').first()).toBeVisible()

    // Select 4 stars
    await page.click('[aria-label="4 estrellas"]')

    // Fill text (optional)
    await page.fill('textarea', 'Muy buena sesión, lo recomiendo.')

    // Submit
    await page.click('button[type="submit"]')

    // Thank-you page
    await expect(page.getByRole('status')).toBeVisible({ timeout: 5000 })
  })

  test('shows "ya enviada" when token is already consumed', async ({ page }) => {
    test.skip(!migration006Applied, 'Migration 006 not applied')

    // Token was consumed in the previous test
    await page.goto(`/r/review/${testToken}`)
    await page.waitForLoadState('networkidle')

    // Should show consumed state (no form)
    await expect(page.getByRole('form').count()).resolves.toBe(0)
    await expect(page.locator('text=/ya fue enviada/i')).toBeVisible()
  })
})

// ── TS-004: Cron auth — no DB needed ─────────────────────────────────────────

test.describe('TS-004 — Cron /api/cron/send-review-requests auth', () => {
  test('returns 401 when Authorization header is missing', async ({ request }) => {
    const res = await request.get('/api/cron/send-review-requests')
    expect(res.status()).toBe(401)
  })

  test('returns 401 when Bearer token is wrong', async ({ request }) => {
    const res = await request.get('/api/cron/send-review-requests', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    expect(res.status()).toBe(401)
  })
})
