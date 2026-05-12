// Survey professionals table — identify test vs real rows.
// Usage: npx tsx scripts/survey-test-data.ts

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data, error } = await supabase
    .from('professionals')
    .select('id, slug, full_name, status, created_at, email')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    process.exit(1)
  }

  console.log(`TOTAL: ${data.length} professionals\n`)

  const testPatterns = [
    /^qa-pro-/i, /^e2e-pro-/i, /^test-/i, /^directory-e2e-/i, /^destacado-e2e-/i, /^reviews-e2e-/i, /^practice-e2e-/i,
  ]
  const testNames = [
    'Ana Pérez', 'Javier Sánchez', 'Sofía Torres',
    'Directory E2E', 'Destacado E2E', 'Reviews E2E', 'Test ', 'E2E Pro',
  ]
  const testEmailPatterns = [/@qa\.com$/i, /e2e@/i, /test-\d+@/i]

  const test = data.filter(p =>
    testPatterns.some(re => re.test(p.slug || '')) ||
    testNames.some(n => p.full_name?.includes(n)) ||
    testEmailPatterns.some(re => re.test(p.email || ''))
  )
  const real = data.filter(p => !test.includes(p))

  console.log(`TEST ROWS: ${test.length}`)
  console.log(`REAL ROWS: ${real.length}\n`)

  console.log('--- Test rows ---')
  test.forEach((p, i) => {
    if (i < 20) console.log(`  ${p.status.padEnd(10)} ${(p.slug || '').padEnd(40)} ${p.full_name}`)
  })
  if (test.length > 20) console.log(`  ... +${test.length - 20} more`)

  console.log('\n--- Real rows ---')
  real.forEach(p => console.log(`  ${p.status.padEnd(10)} ${(p.slug || '').padEnd(40)} ${p.full_name}`))
}

main().catch(err => { console.error(err); process.exit(1) })
