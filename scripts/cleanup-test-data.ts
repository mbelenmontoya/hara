// Delete leaked test rows from professionals + cascading children.
// Targets: admin-test-pro-*, test-pro-*, qa-pro-* slug patterns.
// Usage: npx tsx scripts/cleanup-test-data.ts

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const TEST_SLUG_PATTERNS = ['admin-test-pro-%', 'test-pro-%', 'qa-pro-%']

async function main() {
  const allProIds: string[] = []
  for (const pattern of TEST_SLUG_PATTERNS) {
    const { data, error } = await supabase
      .from('professionals')
      .select('id, slug, full_name')
      .like('slug', pattern)
    if (error) { console.error(`Query ${pattern}:`, error); process.exit(1) }
    console.log(`Found ${data.length} matching ${pattern}`)
    data.forEach(p => allProIds.push(p.id))
  }

  if (allProIds.length === 0) {
    console.log('No test rows found. Nothing to delete.')
    return
  }

  console.log(`\nTotal to delete: ${allProIds.length} professionals\n`)

  // Cascade: match_recommendations → matches → pqls → events → professionals
  const { data: recs } = await supabase
    .from('match_recommendations')
    .select('match_id, id')
    .in('professional_id', allProIds)
  const matchIds = [...new Set((recs || []).map(r => r.match_id))]

  if (matchIds.length > 0) {
    console.log(`Cascading: ${matchIds.length} matches will be cleaned`)
    await supabase.from('events').delete().in('match_id', matchIds)
    await supabase.from('pqls').delete().in('match_id', matchIds)
    await supabase.from('match_recommendations').delete().in('match_id', matchIds)
    await supabase.from('matches').delete().in('id', matchIds)
  }

  // Reviews referencing the pros
  const { error: revErr } = await supabase.from('reviews').delete().in('professional_id', allProIds)
  if (revErr && revErr.code !== 'PGRST116') console.warn('Reviews cleanup warning:', revErr.message)

  // PQLs that reference professional directly (not via match)
  const { error: pqlDirectErr } = await supabase.from('pqls').delete().in('professional_id', allProIds)
  if (pqlDirectErr && pqlDirectErr.code !== 'PGRST116') console.warn('PQL direct cleanup warning:', pqlDirectErr.message)

  // Events that reference professional directly
  const { error: evDirectErr } = await supabase.from('events').delete().in('professional_id', allProIds)
  if (evDirectErr && evDirectErr.code !== 'PGRST116') console.warn('Events direct cleanup warning:', evDirectErr.message)

  // match_recommendations that reference professional directly (not via match)
  const { error: recDirectErr } = await supabase.from('match_recommendations').delete().in('professional_id', allProIds)
  if (recDirectErr && recDirectErr.code !== 'PGRST116') console.warn('Recs direct cleanup warning:', recDirectErr.message)

  // Finally, the professionals themselves
  const { error } = await supabase.from('professionals').delete().in('id', allProIds)
  if (error) { console.error('Pro delete:', error); process.exit(1) }

  console.log(`\n✅ Deleted ${allProIds.length} test professionals + cascading children.`)
}

main().catch(err => { console.error(err); process.exit(1) })
