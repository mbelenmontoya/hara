// Hará Match - QA Service Role Smoke Test
// Purpose: Verify service role can bypass RLS and write to protected tables
// Usage: npx tsx scripts/qa-service-role-smoke.ts
// Exit: 0 if service role works, 1 if blocked

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const serviceClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runSmokeTest() {
  console.log('🔧 Testing Service Role RLS Bypass...\n')

  try {
    // Insert non-billable event (profile_view) to verify service role works
    const { data, error } = await serviceClient.from('events').insert({
      event_type: 'profile_view',
      tracking_code: `SMOKE-TEST-${Date.now()}`,
      created_at: new Date().toISOString(),
    }).select().single()

    if (error) {
      console.log('❌ FAIL: Service role INSERT blocked')
      console.log(`   Error: ${error.message}`)
      process.exit(1)
    }

    console.log(`✅ PASS: Event inserted with service role (id: ${data.id})`)

    // Verify we can read it back
    const { data: readData, error: readError } = await serviceClient
      .from('events')
      .select('*')
      .eq('id', data.id)
      .single()

    if (readError) {
      console.log('❌ FAIL: Cannot read back inserted event')
      process.exit(1)
    }

    console.log(`✅ PASS: Event readable (tracking_code: ${readData.tracking_code})`)
    console.log('\n' + '='.repeat(50))
    console.log('✅ Service role bypass verified - Week 1 RLS configuration correct')
    process.exit(0)

  } catch (err) {
    console.log('❌ FAIL: Unexpected error')
    console.log(err)
    process.exit(1)
  }
}

runSmokeTest()
