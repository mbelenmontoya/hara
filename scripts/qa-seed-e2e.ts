// Hará Match - E2E Test Seed Script
// Purpose: Generate deterministic seed data for E2E test suite
// Safety: Only operates on e2e-* prefixed test data, aborts in production

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { createAttributionToken } from '../lib/attribution-tokens.js'
import { generateTrackingCode } from '../lib/tracking-code.js'

// Load environment
config({ path: resolve(process.cwd(), '.env.local') })

// SAFETY GUARDRAILS: Prevent running against production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ABORT: Cannot run E2E seed in production (NODE_ENV=production)')
  process.exit(1)
}

if (!process.env.E2E_SEED && process.env.CI) {
  console.error('❌ ABORT: E2E_SEED=true required in CI environment')
  process.exit(1)
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// E2E test identifiers — professionals and leads use fixed slugs for cleanup
// Tracking code is generated using the real format (M-{timestamp}-{6char})
const E2E_LEAD_SLUG = 'e2e-lead-1'
const E2E_PRO_SLUGS = ['e2e-pro-1', 'e2e-pro-2', 'e2e-pro-3', 'e2e-pro-4']

async function cleanupExistingE2EData() {
  console.log('🧹 Cleaning up existing E2E test data...')

  // Find E2E professionals by their fixed slugs
  const { data: existingPros } = await supabase
    .from('professionals')
    .select('id')
    .in('slug', E2E_PRO_SLUGS)

  const proIds = (existingPros || []).map(p => p.id)

  if (proIds.length > 0) {
    // Find matches that reference these professionals via match_recommendations
    const { data: existingRecs } = await supabase
      .from('match_recommendations')
      .select('match_id')
      .in('professional_id', proIds)

    const matchIds = [...new Set((existingRecs || []).map(r => r.match_id))]

    if (matchIds.length > 0) {
      // 1. Delete PQLs first (depends on match_id)
      const { error: pqlError } = await supabase
        .from('pqls')
        .delete()
        .in('match_id', matchIds)

      if (pqlError && pqlError.code !== 'PGRST116') {
        console.warn('Warning cleaning PQLs:', pqlError.message)
      }

      // 2. Delete match_recommendations
      const { error: recError } = await supabase
        .from('match_recommendations')
        .delete()
        .in('match_id', matchIds)

      if (recError && recError.code !== 'PGRST116') {
        console.warn('Warning cleaning match_recommendations:', recError.message)
      }

      // 3. Delete matches
      const { error: matchError } = await supabase
        .from('matches')
        .delete()
        .in('id', matchIds)

      if (matchError && matchError.code !== 'PGRST116') {
        console.warn('Warning cleaning matches:', matchError.message)
      }
    }
  }

  // 4. Delete leads (use country marker)
  const { error: leadError } = await supabase
    .from('leads')
    .delete()
    .eq('country', 'E2E-TEST')

  if (leadError && leadError.code !== 'PGRST116') {
    console.warn('Warning cleaning leads:', leadError.message)
  }

  // 5. Delete professionals (safe: only e2e-pro-* slugs)
  const { error: proError } = await supabase
    .from('professionals')
    .delete()
    .in('slug', E2E_PRO_SLUGS)

  if (proError && proError.code !== 'PGRST116') {
    console.warn('Warning cleaning professionals:', proError.message)
  }

  console.log('✅ Cleanup complete')
}

async function seedE2EData() {
  console.log('🌱 Seeding E2E test data...')

  // Create 4 professionals (3 for match + 1 extra for duplicate rejection test)
  // Using realistic names to catch display issues during testing
  const realisticNames = [
    'María González',
    'Carlos Rodríguez',
    'Laura Martínez',
    'Diego Fernández'
  ]

  const professionals = []
  for (let i = 0; i < E2E_PRO_SLUGS.length; i++) {
    const { data, error } = await supabase.from('professionals').insert({
      slug: E2E_PRO_SLUGS[i],
      full_name: realisticNames[i],
      email: `e2e-pro-${i + 1}@test.local`,
      whatsapp: `+1555000${String(i + 1).padStart(4, '0')}`,
      country: 'AR',
      city: 'Buenos Aires',
      modality: ['online', 'in-person'],
      specialties: ['anxiety', 'depression'],
      status: 'active',
      bio: `Psicóloga especializada en terapia cognitivo-conductual con ${5 + i} años de experiencia.`,
    }).select().single()

    if (error) throw new Error(`Failed to create professional ${i + 1}: ${error.message}`)
    professionals.push(data)
  }

  console.log(`✅ Created ${professionals.length} professionals`)

  // Create test lead
  const { data: lead, error: leadError } = await supabase.from('leads').insert({
    country: 'E2E-TEST', // Marker for E2E data
    intent_tags: ['anxiety'],
    status: 'new',
  }).select().single()

  if (leadError) throw new Error(`Failed to create lead: ${leadError.message}`)
  console.log(`✅ Created lead: ${lead.id}`)

  // Create match with properly formatted tracking code
  const trackingCode = generateTrackingCode()
  const { data: match, error: matchError } = await supabase.from('matches').insert({
    lead_id: lead.id,
    tracking_code: trackingCode,
    status: 'sent',
  }).select().single()

  if (matchError) throw new Error(`Failed to create match: ${matchError.message}`)
  console.log(`✅ Created match: ${match.id}`)

  // Generate attribution tokens (first 3 professionals only)
  const tokens = await Promise.all(
    professionals.slice(0, 3).map((p, i) => createAttributionToken({
      match_id: match.id,
      professional_id: p.id,
      lead_id: lead.id,
      tracking_code: trackingCode,
      rank: i + 1,
    }))
  )

  // Create match recommendations with realistic reasons
  const realisticReasons = [
    ['Tiene experiencia comprobada con ansiedad y modalidad online', 'Disponibilidad inmediata en Buenos Aires'],
    ['Especialista en terapia cognitivo-conductual con enfoque personalizado', 'Excelentes referencias de casos similares'],
    ['Profesional con enfoque empático y metodología estructurada', 'Horarios flexibles y sesiones virtuales'],
  ]

  const { error: recError } = await supabase.from('match_recommendations').insert(
    professionals.slice(0, 3).map((p, i) => ({
      match_id: match.id,
      professional_id: p.id,
      rank: i + 1,
      reasons: realisticReasons[i],
      attribution_token: tokens[i],
    }))
  )

  if (recError) throw new Error(`Failed to create recommendations: ${recError.message}`)
  console.log(`✅ Created 3 match recommendations`)

  // Write test data to file for E2E tests to consume
  const testData = {
    lead_id: lead.id,
    match_id: match.id,
    tracking_code: trackingCode,
    professionals: professionals.map(p => ({ id: p.id, slug: p.slug })),
    tokens: tokens,
    seeded_at: new Date().toISOString(),
  }

  const outputPath = resolve(process.cwd(), '.e2e-test-data.json')
  writeFileSync(outputPath, JSON.stringify(testData, null, 2))
  console.log(`✅ Test data written to: .e2e-test-data.json`)

  console.log('\n📋 E2E Test Data Summary:')
  console.log(`   Lead ID: ${lead.id}`)
  console.log(`   Match ID: ${match.id}`)
  console.log(`   Tracking Code: ${trackingCode}`)
  console.log(`   Professionals: ${professionals.length}`)
}

async function main() {
  try {
    await cleanupExistingE2EData()
    await seedE2EData()
    console.log('\n✅ E2E seed complete')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ E2E seed failed:', error)
    process.exit(1)
  }
}

main()
