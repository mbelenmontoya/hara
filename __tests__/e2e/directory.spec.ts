// E2E tests for /profesionales directory page
//
// Test coverage:
//   TS-001 — Directory renders professionals sorted by ranking_score DESC
//   TS-002 — Directory respects inclusion criteria (paused + not-accepting excluded)
//   TS-003 — Clicking a card navigates to /p/<slug>
//   TS-004 — Home page exposes a "Ver profesionales" CTA that navigates to /profesionales
//
// TS-001/002/003 require migration 004 applied and Supabase access.
// TS-004 always runs (no DB dependency).
//
// Apply the migration before running:
//   node scripts/apply-ranking-migration.mjs
//   or apply migrations/004_ranking_foundation.sql via Supabase SQL Editor.

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
const slug = (n: number) => `dir-e2e-${ts}-${n}`
const email = (n: number) => `dir-e2e-${ts}-${n}@test.invalid`

const FIFTY_CHAR_BIO = 'A'.repeat(50)

// ── Fixtures: 5 qualifying + 2 excluded ──────────────────────────────────────
// Completeness scores (when migration is applied):
//   Pro A: 100 pts → ranking 70.00  (highest → card #1)
//   Pro B:  60 pts → ranking 42.00  (card #2)
//   Pro C:  50 pts → ranking 35.00  (card #3)
//   Pro D:  10 pts → ranking  7.00  (card #4)
//   Pro E:   0 pts → ranking  0.00  (card #5)
//   Paused: excluded from directory
//   Not-accepting: excluded from directory

const fixtureBase = {
  status: 'active',
  country: 'AR',
  accepting_new_clients: true,
}

const professionalFixtures = [
  // A — full completeness (all 10 criteria, 100 pts)
  {
    ...fixtureBase,
    slug: slug(1), full_name: 'Directory E2E Alpha', email: email(1),
    whatsapp: '+5491112345678', modality: ['online'], specialties: ['ansiedad'],
    profile_image_url: 'https://example.com/img.jpg',
    short_description: 'Breve descripción.',
    bio: FIFTY_CHAR_BIO,
    experience_description: 'Experiencia relevante.',
    service_type: ['individual'],
    online_only: true,
    instagram: 'handle_alpha',
  },
  // B — image + bio + specialties + instagram + whatsapp + modality (60 pts)
  {
    ...fixtureBase,
    slug: slug(2), full_name: 'Directory E2E Beta', email: email(2),
    whatsapp: '+5491112345679', modality: ['online'], specialties: ['depresion'],
    profile_image_url: 'https://example.com/img.jpg',
    bio: FIFTY_CHAR_BIO,
    instagram: 'handle_beta',
    online_only: false, city: null,
  },
  // C — image + short_description + specialties + whatsapp + modality (50 pts — no city so locationClarity=0)
  {
    ...fixtureBase,
    slug: slug(3), full_name: 'Directory E2E Gamma', email: email(3),
    whatsapp: '+5491112345680', modality: ['presencial'], specialties: ['trauma'],
    profile_image_url: 'https://example.com/img.jpg',
    short_description: 'Descripción breve del perfil.',
    online_only: false,
  },
  // D — only whatsapp + modality (10 pts)
  {
    ...fixtureBase,
    slug: slug(4), full_name: 'Directory E2E Delta', email: email(4),
    whatsapp: '+5491112345681', modality: ['online'], specialties: [],
  },
  // E — all empty / minimum (0 pts)
  {
    ...fixtureBase,
    slug: slug(5), full_name: 'Directory E2E Epsilon', email: email(5),
    whatsapp: '', modality: [], specialties: [],
  },
]

// Excluded fixtures (should NOT appear in directory)
const excludedFixtures = [
  {
    slug: slug(6), full_name: 'Directory E2E Paused', email: email(6),
    whatsapp: '', country: 'AR', modality: [], specialties: [],
    status: 'paused',        // excluded by status filter
    accepting_new_clients: true,
  },
  {
    slug: slug(7), full_name: 'Directory E2E NotAccepting', email: email(7),
    whatsapp: '', country: 'AR', modality: [], specialties: [],
    status: 'active',
    accepting_new_clients: false,  // excluded by accepting_new_clients filter
  },
]

// ── State ─────────────────────────────────────────────────────────────────────

let migrationApplied = false
let insertedIds: string[] = []
let insertedRows: Array<{
  id: string, full_name: string, ranking_score: number, slug: string
}> = []

// ── Setup / Teardown ──────────────────────────────────────────────────────────

test.beforeAll(async () => {
  // Probe connectivity + migration (failure mode: Supabase unreachable or 004 not applied)
  const { error: probe } = await supabase
    .from('professionals')
    .select('ranking_score')
    .limit(1)

  if (probe) {
    console.warn(
      '\n⚠  Directory E2E skipping DB tests: ' + probe.message +
      '\n   Apply migration 004 and ensure Supabase is reachable.\n'
    )
    return
  }

  migrationApplied = true

  // Insert qualifying fixtures
  for (const fixture of professionalFixtures) {
    const { data, error } = await supabase
      .from('professionals')
      .insert(fixture)
      .select('id, full_name, ranking_score, slug')
      .single()

    if (error) {
      console.error(`Insert failed for ${fixture.slug}:`, error.message)
      continue
    }
    insertedIds.push(data.id)
    insertedRows.push(data as typeof insertedRows[0])
  }

  // Insert excluded fixtures
  for (const fixture of excludedFixtures) {
    const { data, error } = await supabase
      .from('professionals')
      .insert(fixture)
      .select('id')
      .single()
    if (!error && data) insertedIds.push(data.id)
  }
})

test.afterAll(async () => {
  if (insertedIds.length > 0) {
    await supabase.from('professionals').delete().in('id', insertedIds)
  }
  // Belt-and-suspenders: remove any orphaned rows from interrupted runs
  await supabase.from('professionals').delete().like('slug', `dir-e2e-%`)
})

// ── TS-004: Home page CTA (no DB required) ───────────────────────────────────

test.describe('TS-004 — Home page directory CTA', () => {
  test('home page has "Ver profesionales" CTA linking to /profesionales', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // CTA must be visible and contain the expected text
    const cta = page.getByRole('link', { name: /ver profesionales/i })
    await expect(cta).toBeVisible()

    // Clicking navigates to /profesionales
    await cta.click()
    await expect(page).toHaveURL('/profesionales')
  })
})

// ── TS-001 + TS-002: Directory content (requires DB) ─────────────────────────

test.describe('TS-001 + TS-002 — Directory ordering and inclusion', () => {
  test('renders qualifying professionals sorted by ranking_score DESC', async ({ page }) => {
    test.skip(!migrationApplied, 'Migration 004 not applied or Supabase unreachable')

    await page.goto('/profesionales')
    await page.waitForLoadState('networkidle')

    // Collect all professional names in DOM order
    const nameElements = page.locator('[data-testid="professional-name"]')
    const count = await nameElements.count()

    // At least 5 qualifying fixtures must appear
    expect(count).toBeGreaterThanOrEqual(5)

    // Build expected order from what the DB actually computed (not hard-coded)
    const expectedOrder = [...insertedRows]
      .sort((a, b) => b.ranking_score - a.ranking_score)
      .map(r => r.full_name)

    // Check the first 5 DOM names match expected ranking order
    for (let i = 0; i < Math.min(5, expectedOrder.length); i++) {
      await expect(nameElements.nth(i)).toHaveText(expectedOrder[i])
    }
  })

  test('excludes paused and not-accepting-clients professionals', async ({ page }) => {
    test.skip(!migrationApplied, 'Migration 004 not applied or Supabase unreachable')

    await page.goto('/profesionales')
    await page.waitForLoadState('networkidle')

    const pageText = await page.textContent('body')
    expect(pageText).not.toContain('Directory E2E Paused')
    expect(pageText).not.toContain('Directory E2E NotAccepting')
  })
})

// ── TS-003: Navigation to profile (requires DB) ───────────────────────────────

test.describe('TS-003 — Navigate from directory to profile', () => {
  test('clicking a card navigates to the professional profile', async ({ page }) => {
    test.skip(!migrationApplied, 'Migration 004 not applied or Supabase unreachable')

    // Use the highest-ranked fixture (Alpha, full completeness, active)
    const alpha = insertedRows.find(r => r.full_name === 'Directory E2E Alpha')
    if (!alpha) throw new Error('Alpha fixture not found — check beforeAll setup')

    // Alpha must also be status='active' for /p/<slug> to render
    await page.goto('/profesionales')
    await page.waitForLoadState('networkidle')

    // Click the first card (Alpha, highest ranking)
    const firstCard = page.locator('[data-testid="professional-card"]').first()
    await firstCard.click()

    // Should land on /p/<slug>
    await expect(page).toHaveURL(new RegExp(`/p/${alpha.slug}`))

    // Profile page data-testid is set by /p/[slug]/page.tsx:112
    await expect(page.locator('[data-testid="professional-profile"]')).toBeVisible()
  })
})
