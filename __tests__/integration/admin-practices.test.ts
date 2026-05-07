// Integration tests for admin practices data layer + route handlers.
// Runs against the real Supabase dev DB. Depends on migration 010 applied.
//
// Note on cache bust: cross-process propagation is NOT tested here; the in-memory
// module cache is per-process. We verify only that bustPracticesCache() forces
// the next read in this process to re-query the DB.

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_PREFIX = `intg-test-${Date.now()}`
const KEY_A = `${TEST_PREFIX}-a`
const KEY_B = `${TEST_PREFIX}-b`

async function cleanupTestRows(): Promise<void> {
  // Delete test pros first (they reference test practices via the array column).
  await supabaseAdmin.from('professionals').delete().like('slug', `${TEST_PREFIX}%`)
  await supabaseAdmin.from('leads').delete().like('email', `${TEST_PREFIX}%`)
  await supabaseAdmin.from('practices').delete().like('key', `${TEST_PREFIX}%`)
}

beforeEach(async () => {
  await cleanupTestRows()
  // Both practice caches persist across tests in the same Node process.
  // Bust them so each test starts with a fresh DB-backed view.
  const { bustPracticesCache } = await import('@/lib/practices')
  bustPracticesCache()
})

afterAll(async () => {
  await cleanupTestRows()
})

describe('admin-practices — data-layer integration', () => {
  it('inserts a practice and loadAdminPracticesView returns it with usage_count = 0', async () => {
    await supabaseAdmin.from('practices').insert({
      key: KEY_A,
      label: 'Integration Test A',
      slug: KEY_A,
      sort_order: 9001,
      active: true,
    })

    const { loadAdminPracticesView } = await import('@/lib/admin-practices')
    const view = await loadAdminPracticesView()
    const row = view.find(p => p.key === KEY_A)
    expect(row).toBeDefined()
    expect(row?.usage_count).toBe(0)
  })

  it('rejects duplicate key with Postgres 23505', async () => {
    await supabaseAdmin.from('practices').insert({
      key: KEY_A, label: 'A1', slug: KEY_A, sort_order: 9001, active: true,
    })

    const { error } = await supabaseAdmin.from('practices').insert({
      key: KEY_A, label: 'A2', slug: `${KEY_A}-different`, sort_order: 9002, active: true,
    })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505')
  })

  it('rejects duplicate slug with Postgres 23505', async () => {
    await supabaseAdmin.from('practices').insert({
      key: KEY_A, label: 'A1', slug: KEY_A, sort_order: 9001, active: true,
    })

    const { error } = await supabaseAdmin.from('practices').insert({
      key: `${KEY_A}-x`, label: 'X', slug: KEY_A, sort_order: 9002, active: true,
    })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505')
  })

  it('PATCH-equivalent update changes label and loadAdminPracticesView reflects it', async () => {
    await supabaseAdmin.from('practices').insert({
      key: KEY_A, label: 'Original', slug: KEY_A, sort_order: 9001, active: true,
    })

    await supabaseAdmin.from('practices').update({ label: 'Updated' }).eq('key', KEY_A)

    const { loadAdminPracticesView } = await import('@/lib/admin-practices')
    const view = await loadAdminPracticesView()
    expect(view.find(p => p.key === KEY_A)?.label).toBe('Updated')
  })

  it('deactivating a practice excludes it from getActivePractices() after bust', async () => {
    await supabaseAdmin.from('practices').insert({
      key: KEY_A, label: 'A', slug: KEY_A, sort_order: 9001, active: true,
    })

    const { getActivePractices, bustPracticesCache } = await import('@/lib/practices')
    bustPracticesCache()
    const before = await getActivePractices()
    expect(before.find(p => p.key === KEY_A)).toBeDefined()

    await supabaseAdmin.from('practices').update({ active: false }).eq('key', KEY_A)
    bustPracticesCache()

    const after = await getActivePractices()
    expect(after.find(p => p.key === KEY_A)).toBeUndefined()
  })

  it('usage_count counts active and submitted pros only', async () => {
    await supabaseAdmin.from('practices').insert({
      key: KEY_A, label: 'A', slug: KEY_A, sort_order: 9001, active: true,
    })
    // Pro 1: status='active', uses KEY_A → counts
    // Pro 2: status='submitted', uses KEY_A → counts
    // Pro 3: status='rejected', uses KEY_A → does NOT count
    await supabaseAdmin.from('professionals').insert([
      {
        slug: `${TEST_PREFIX}-pro-active`, status: 'active', full_name: 'Active',
        email: `${TEST_PREFIX}-active@test.com`, whatsapp: '+5491100000001', country: 'AR',
        modality: ['online'], specialties: ['ansiedad'], practices: [KEY_A],
      },
      {
        slug: `${TEST_PREFIX}-pro-submitted`, status: 'submitted', full_name: 'Submitted',
        email: `${TEST_PREFIX}-submitted@test.com`, whatsapp: '+5491100000002', country: 'AR',
        modality: ['online'], specialties: ['ansiedad'], practices: [KEY_A],
      },
      {
        slug: `${TEST_PREFIX}-pro-rejected`, status: 'rejected', full_name: 'Rejected',
        email: `${TEST_PREFIX}-rejected@test.com`, whatsapp: '+5491100000003', country: 'AR',
        modality: ['online'], specialties: ['ansiedad'], practices: [KEY_A],
        rejection_reason: 'test',
      },
    ])

    const { loadAdminPracticesView } = await import('@/lib/admin-practices')
    const view = await loadAdminPracticesView()
    expect(view.find(p => p.key === KEY_A)?.usage_count).toBe(2)
  })

  it('usage_count does NOT count leads.practice_preference', async () => {
    await supabaseAdmin.from('practices').insert({
      key: KEY_A, label: 'A', slug: KEY_A, sort_order: 9001, active: true,
    })
    // Insert a lead with practice_preference referencing KEY_A
    await supabaseAdmin.from('leads').insert({
      country: 'AR',
      intent_tags: ['ansiedad'],
      whatsapp: '+5491100000099',
      email: `${TEST_PREFIX}@test.com`,
      practice_preference: [KEY_A],
    })

    const { loadAdminPracticesView } = await import('@/lib/admin-practices')
    const view = await loadAdminPracticesView()
    // Even though a lead references the practice, usage_count is from professionals only.
    expect(view.find(p => p.key === KEY_A)?.usage_count).toBe(0)
  })

  it('getAllPractices returns inactive rows that getActivePractices excludes', async () => {
    await supabaseAdmin.from('practices').insert([
      { key: KEY_A, label: 'A', slug: KEY_A, sort_order: 9001, active: true },
      { key: KEY_B, label: 'B', slug: KEY_B, sort_order: 9002, active: false },
    ])

    const { getAllPractices, getActivePractices, bustPracticesCache } = await import('@/lib/practices')
    bustPracticesCache()

    const all = await getAllPractices()
    const allKeys = all.map(p => p.key)
    expect(allKeys).toContain(KEY_A)
    expect(allKeys).toContain(KEY_B)

    const active = await getActivePractices()
    const activeKeys = active.map(p => p.key)
    expect(activeKeys).toContain(KEY_A)
    expect(activeKeys).not.toContain(KEY_B)
  })

  it('practices are ordered by sort_order ASC, key ASC tiebreaker', async () => {
    // Two practices with the same sort_order; key ascending is the tiebreaker.
    await supabaseAdmin.from('practices').insert([
      { key: `${TEST_PREFIX}-z`, label: 'Z', slug: `${TEST_PREFIX}-z`, sort_order: 9999, active: true },
      { key: `${TEST_PREFIX}-a`, label: 'A', slug: `${TEST_PREFIX}-a`, sort_order: 9999, active: true },
    ])

    const { getAllPractices } = await import('@/lib/practices')
    const all = await getAllPractices()
    const tied = all.filter(p => p.sort_order === 9999)
    expect(tied.map(p => p.key)).toEqual([`${TEST_PREFIX}-a`, `${TEST_PREFIX}-z`])
  })

  it('bustPracticesCache forces fresh read in this process', async () => {
    const { getActivePractices, bustPracticesCache } = await import('@/lib/practices')
    bustPracticesCache()

    // Warm cache (assume seed has 15 + nothing more relevant).
    const before = await getActivePractices()

    // Insert a new active practice via direct SQL.
    await supabaseAdmin.from('practices').insert({
      key: KEY_A, label: 'A', slug: KEY_A, sort_order: 9001, active: true,
    })

    // Without bust, cache returns stale.
    const stale = await getActivePractices()
    expect(stale.length).toBe(before.length) // cache hit, no new row

    // After bust, fresh read includes the new row.
    bustPracticesCache()
    const fresh = await getActivePractices()
    expect(fresh.length).toBe(before.length + 1)
    expect(fresh.find(p => p.key === KEY_A)).toBeDefined()
  })
})
