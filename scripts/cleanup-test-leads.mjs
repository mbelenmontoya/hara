// One-shot cleanup: delete all test leads (no whatsapp, no email) + their FK dependents
// Run: node scripts/cleanup-test-leads.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 1. Identify test leads
const { data: testLeads, error: fetchErr } = await supabase
  .from('leads')
  .select('id')
  .is('whatsapp', null)
  .is('email', null)

if (fetchErr) { console.error('Fetch error:', fetchErr); process.exit(1) }
const leadIds = testLeads.map(l => l.id)
console.log(`Test leads found: ${leadIds.length}`)
if (leadIds.length === 0) { console.log('Nothing to clean.'); process.exit(0) }

// 2. Find matches linked to these leads
const { data: matches } = await supabase
  .from('matches')
  .select('id')
  .in('lead_id', leadIds)
const matchIds = (matches || []).map(m => m.id)
console.log(`Linked matches: ${matchIds.length}`)

// 3. Cascade delete in FK order
if (matchIds.length > 0) {
  const { error: e1 } = await supabase.from('events').delete().in('match_id', matchIds)
  if (e1) console.warn('events by match_id:', e1.message)

  const { error: e2 } = await supabase.from('pqls').delete().in('match_id', matchIds)
  if (e2) console.warn('pqls by match_id:', e2.message)

  const { error: e3 } = await supabase.from('match_recommendations').delete().in('match_id', matchIds)
  if (e3) console.warn('match_recommendations:', e3.message)

  const { error: e4 } = await supabase.from('matches').delete().in('id', matchIds)
  if (e4) console.warn('matches:', e4.message)
  else console.log(`Deleted ${matchIds.length} matches (+ their events, pqls, recommendations)`)
}

// 4. Delete the test leads
const { error: e5, count } = await supabase
  .from('leads')
  .delete({ count: 'exact' })
  .is('whatsapp', null)
  .is('email', null)

if (e5) { console.error('leads delete error:', e5); process.exit(1) }
console.log(`Deleted ${count} test leads`)

// 5. Verify
const { count: remaining } = await supabase
  .from('leads')
  .select('*', { count: 'exact', head: true })
console.log(`Leads remaining in DB: ${remaining} (all real)`)
