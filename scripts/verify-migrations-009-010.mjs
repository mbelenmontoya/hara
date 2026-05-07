// One-shot verification: are migrations 009 + 010 applied to Supabase?
// Run with: node scripts/verify-migrations-009-010.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env.local') })

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function check010() {
  // Migration 010 creates `practices` table and renames professionals.style → practices
  const checks = {}

  const { data: practicesTable, error: practicesErr } = await supabase
    .from('practices')
    .select('key, label, slug, active')
    .limit(20)
  checks.practices_table_exists = !practicesErr
  checks.practices_seed_count = practicesTable?.length ?? 0

  const { error: practicesColErr } = await supabase
    .from('professionals')
    .select('practices')
    .limit(1)
  checks.professionals_practices_column = !practicesColErr

  const { error: needsReviewErr } = await supabase
    .from('professionals')
    .select('needs_practice_review')
    .limit(1)
  checks.professionals_needs_practice_review_column = !needsReviewErr

  const { error: leadsColErr } = await supabase
    .from('leads')
    .select('practice_preference')
    .limit(1)
  checks.leads_practice_preference_column = !leadsColErr

  // Old column should be gone after rename
  const { error: oldStyleErr } = await supabase
    .from('professionals')
    .select('style')
    .limit(1)
  checks.professionals_style_column_dropped = !!oldStyleErr

  return checks
}

async function check009() {
  // Migration 009 changes select_pending_review_events to take delay_days INT.
  // We call it with the new signature — if it accepts the param, 009 is applied.
  const { error } = await supabase.rpc('select_pending_review_events', { delay_days: 7 })
  return {
    rpc_accepts_delay_days_param: !error,
    rpc_error: error?.message ?? null,
  }
}

async function run() {
  console.log('Hará — verifying migrations 009 + 010\n')

  const m010 = await check010()
  const m009 = await check009()

  console.log('Migration 010 (holistic practices catalog):')
  for (const [k, v] of Object.entries(m010)) console.log(`  ${v === true ? '✓' : v === false ? '✗' : '·'} ${k}: ${v}`)

  console.log('\nMigration 009 (review-delay parameterization):')
  for (const [k, v] of Object.entries(m009)) console.log(`  ${v === true ? '✓' : v === false ? '✗' : '·'} ${k}: ${v}`)

  const m010Applied =
    m010.practices_table_exists &&
    m010.professionals_practices_column &&
    m010.professionals_needs_practice_review_column &&
    m010.leads_practice_preference_column &&
    m010.professionals_style_column_dropped &&
    m010.practices_seed_count >= 15

  const m009Applied = m009.rpc_accepts_delay_days_param

  console.log('\nSummary:')
  console.log(`  Migration 009: ${m009Applied ? 'APPLIED' : 'NOT APPLIED'}`)
  console.log(`  Migration 010: ${m010Applied ? 'APPLIED' : 'NOT APPLIED'}`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
