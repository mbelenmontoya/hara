// One-time script: apply migrations/004_ranking_foundation.sql
// Adds ranking columns, trigger function, and directory index to professionals.
//
// Run with: node scripts/apply-ranking-migration.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

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

const MIGRATION_PATH = resolve(__dirname, '..', 'migrations', '004_ranking_foundation.sql')
const sql = readFileSync(MIGRATION_PATH, 'utf-8')

async function tryExecSql(query) {
  const { error } = await supabase.rpc('exec_sql', { query })
  if (!error) return true

  // Try via REST fallback
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query }),
  })
  return res.ok
}

async function verifyColumns() {
  const { error } = await supabase
    .from('professionals')
    .select('ranking_score, profile_completeness_score, rating_average, rating_count, subscription_tier')
    .limit(1)
  return !error
}

async function run() {
  console.log('Hará Match — Applying migration 004_ranking_foundation.sql')
  console.log()

  // Quick check: already applied?
  if (await verifyColumns()) {
    console.log('✓ Migration already applied (columns exist). Running backfill only...')
    const { error } = await supabase.rpc('exec_sql', {
      query: 'UPDATE professionals SET updated_at = NOW();',
    })
    if (!error) {
      console.log('✓ Backfill complete.')
    } else {
      console.log('  Backfill via exec_sql failed (expected if function not available).')
      console.log('  Run manually in Supabase SQL Editor: UPDATE professionals SET updated_at = NOW();')
    }
    return
  }

  console.log('Attempting to apply migration via exec_sql RPC...')
  const ok = await tryExecSql(sql)

  if (ok) {
    console.log('✓ Migration applied successfully.')
    return
  }

  // Manual instructions
  console.log()
  console.log('exec_sql RPC not available. Apply the migration manually:')
  console.log()
  console.log('  1. Open Supabase Dashboard → SQL Editor')
  console.log('  2. Paste the contents of: migrations/004_ranking_foundation.sql')
  console.log('  3. Click Run')
  console.log()
  console.log('File path:', MIGRATION_PATH)
  console.log()
  console.log('After applying, run this script again to verify.')
}

run().catch(console.error)
