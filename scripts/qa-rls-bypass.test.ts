// Hará Match - QA RLS Bypass Test
// Purpose: Verify RLS blocks anon writes to billing-critical tables
// Usage: npx tsx scripts/qa-rls-bypass.test.ts
// Exit: 0 if all inserts fail as expected, 1 if any bypass detected

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

interface TestResult {
  table: string
  blocked: boolean
  error: string | null
}

async function testTable(tableName: string, data: any): Promise<TestResult> {
  const { error } = await anonClient.from(tableName).insert(data)

  return {
    table: tableName,
    blocked: !!error && (error.message.includes('denied') || error.message.includes('policy')),
    error: error?.message || null,
  }
}

async function runTests() {
  console.log('🔒 Testing RLS Bypass Prevention...\n')

  const tests = await Promise.all([
    testTable('events', {
      event_type: 'contact_click',
      match_id: '00000000-0000-0000-0000-000000000001',
      professional_id: '00000000-0000-0000-0000-000000000002',
      lead_id: '00000000-0000-0000-0000-000000000003',
      tracking_code: 'BYPASS-TEST',
    }),
    testTable('pqls', {
      match_id: '00000000-0000-0000-0000-000000000001',
      professional_id: '00000000-0000-0000-0000-000000000002',
      lead_id: '00000000-0000-0000-0000-000000000003',
      event_id: '00000000-0000-0000-0000-000000000004',
      event_created_at: new Date().toISOString(),
      tracking_code: 'BYPASS-TEST',
      billing_month: '2025-01-01',
    }),
    testTable('match_recommendations', {
      match_id: '00000000-0000-0000-0000-000000000001',
      professional_id: '00000000-0000-0000-0000-000000000002',
      rank: 1,
      reasons: ['Test'],
      attribution_token: 'fake',
    }),
    testTable('matches', {
      lead_id: '00000000-0000-0000-0000-000000000001',
      tracking_code: 'BYPASS-TEST',
    }),
    testTable('pql_adjustments', {
      pql_id: '00000000-0000-0000-0000-000000000001',
      adjustment_type: 'waive',
      reason: 'Test',
      billing_month: '2025-01-01',
      created_by: '00000000-0000-0000-0000-000000000002',
    }),
  ])

  let allPassed = true

  for (const result of tests) {
    if (result.blocked) {
      console.log(`✅ PASS: ${result.table} - blocked by RLS`)
    } else {
      console.log(`❌ FAIL: ${result.table} - INSERT SUCCEEDED (RLS bypass detected!)`)
      console.log(`   Error: ${result.error || 'No error (insert succeeded)'}`)
      allPassed = false
    }
  }

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - RLS blocking works correctly')
    process.exit(0)
  } else {
    console.log('❌ TESTS FAILED - RLS bypass detected, fix policies immediately')
    process.exit(1)
  }
}

runTests()
