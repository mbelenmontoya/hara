// One-time script: apply migrations/006_reviews_collection.sql
// Adds reviews + review_requests tables, aggregate trigger, submit_review() RPC,
// and select_pending_review_events() helper.
//
// Run with: node scripts/apply-reviews-migration.mjs
//
// Prerequisites:
//   - migrations 004 + 005 already applied
//   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

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

const MIGRATION_PATH = resolve(__dirname, '..', 'migrations', '006_reviews_collection.sql')
const sql = readFileSync(MIGRATION_PATH, 'utf-8')

async function verifyTables() {
  const { error } = await supabase.from('reviews').select('id').limit(1)
  return !error
}

async function tryExecSql(query) {
  const { error } = await supabase.rpc('exec_sql', { query })
  if (!error) return true
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query }),
  })
  return res.ok
}

async function run() {
  console.log('Hará Match — Applying migration 006_reviews_collection.sql')
  console.log()

  if (await verifyTables()) {
    console.log('✓ Migration already applied (reviews table exists).')
    return
  }

  console.log('Attempting to apply migration via exec_sql RPC...')
  const ok = await tryExecSql(sql)

  if (ok) {
    console.log('✓ Migration applied successfully.')
    return
  }

  console.log()
  console.log('exec_sql RPC not available. Apply the migration manually:')
  console.log()
  console.log('  1. Open Supabase Dashboard → SQL Editor')
  console.log('  2. Paste the contents of: migrations/006_reviews_collection.sql')
  console.log('  3. Click Run')
  console.log()
  console.log('File path:', MIGRATION_PATH)
}

run().catch(console.error)
