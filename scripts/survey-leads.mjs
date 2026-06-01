// One-shot diagnostic: classify leads as test vs real
// Run: node scripts/survey-leads.mjs

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

const { data: leads, error } = await supabase
  .from('leads')
  .select('id, created_at, whatsapp, email, country, city, intent_tags, practice_preference, urgency, status')
  .order('created_at', { ascending: true })

if (error) { console.error('Error:', error); process.exit(1) }

// Test leads: no whatsapp AND no email (minimal fields only)
const testLeads = leads.filter(l => !l.whatsapp && !l.email)
const realLeads = leads.filter(l => l.whatsapp || l.email)

console.log(`\nTotal leads: ${leads.length}`)
console.log(`  Real leads (have whatsapp or email): ${realLeads.length}`)
console.log(`  Test leads (no whatsapp, no email):  ${testLeads.length}`)

if (testLeads.length > 0) {
  console.log('\n--- Test leads (candidates for deletion) ---')
  testLeads.forEach(l => {
    console.log(`  ${l.id} | ${l.created_at?.slice(0,10)} | country:${l.country} | tags:${JSON.stringify(l.intent_tags)} | status:${l.status}`)
  })
}

if (realLeads.length > 0) {
  console.log('\n--- Real leads (KEEP) ---')
  realLeads.forEach(l => {
    console.log(`  ${l.id} | ${l.created_at?.slice(0,10)} | ${l.city ?? '(no city)'} | ${l.email ?? l.whatsapp} | status:${l.status}`)
  })
}
