// One-time migration: add 'rejected' status + rejection_reason column,
// then set all existing professionals to 'submitted' for testing.
//
// Run with: node scripts/migrate-review-flow.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('1/3 — Dropping old status constraint...')
  const { error: e1 } = await supabase.rpc('exec_sql', {
    query: `ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_status_check;`,
  })
  // rpc('exec_sql') won't exist — fall back to direct REST if needed
  if (e1) {
    console.log('   rpc not available, trying via postgrest...')
    // Use the Supabase Management API via fetch
    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        query: `ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_status_check;`,
      }),
    })
    if (!res.ok) {
      console.log('   Cannot run raw SQL via REST. You need to run the SQL manually.')
      console.log('')
      console.log('   Run this in Supabase SQL Editor (Dashboard > SQL Editor):')
      console.log('')
      console.log(`   ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_status_check;`)
      console.log(`   ALTER TABLE professionals ADD CONSTRAINT professionals_status_check`)
      console.log(`     CHECK (status IN ('draft','submitted','approved','active','paused','rejected'));`)
      console.log(`   ALTER TABLE professionals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`)
      console.log('')
      console.log('   Then re-run this script to update profiles to submitted.')
      console.log('')
    }
  }

  console.log('2/3 — Updating all professionals to submitted...')
  const { data, error: e2 } = await supabase
    .from('professionals')
    .update({ status: 'submitted' })
    .neq('status', 'submitted')
    .select('id, full_name, status')

  if (e2) {
    console.error('   Update failed:', e2.message)
    console.log('   This might mean the constraint change hasn\'t been applied yet.')
    console.log('   Run the SQL above in Supabase Dashboard first.')
    process.exit(1)
  }

  console.log(`   Updated ${data?.length || 0} professionals to 'submitted':`)
  for (const p of data || []) {
    console.log(`   - ${p.full_name} (${p.id})`)
  }

  console.log('3/3 — Verifying...')
  const { data: all, error: e3 } = await supabase
    .from('professionals')
    .select('id, full_name, status')
    .order('full_name')

  if (e3) {
    console.error('   Verification failed:', e3.message)
    process.exit(1)
  }

  console.log(`\n   All professionals (${all?.length || 0}):`)
  for (const p of all || []) {
    console.log(`   - ${p.full_name}: ${p.status}`)
  }

  console.log('\nDone.')
}

run().catch(console.error)
