// Hará Match - QA Seed Script
// Purpose: Generate test data with 3 DISTINCT professionals + valid attribution tokens
// Usage: npx tsx scripts/qa-seed.ts > qa.env && source qa.env

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { createAttributionToken } from '../lib/attribution-tokens.js'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

if (!process.env.SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL in .env.local')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seed() {
  console.log('🌱 Seeding QA test data...\n')

  // Use timestamp to make slugs unique across runs
  const timestamp = Date.now()

  // Create 3 DISTINCT professionals with realistic names
  const realisticNames = ['Ana Pérez', 'Javier Sánchez', 'Sofía Torres']
  const bios = [
    'Psicóloga clínica con 8 años de experiencia en terapia de ansiedad',
    'Especialista en mindfulness y técnicas de relajación aplicadas',
    'Terapeuta cognitivo-conductual enfocada en resultados medibles'
  ]

  const pros = []
  for (let i = 1; i <= 3; i++) {
    const { data, error } = await supabase.from('professionals').insert({
      slug: `qa-pro-${timestamp}-${i}`,
      full_name: realisticNames[i - 1],
      email: `test-${timestamp}-${i}@qa.com`,
      whatsapp: `+549111234567${i}`,
      country: 'AR',
      modality: ['therapy'],
      specialties: ['anxiety'],
      status: 'active',
      bio: bios[i - 1],
    }).select().single()

    if (error) {
      console.error(`Failed to create professional ${i}:`, error)
      process.exit(1)
    }

    pros.push(data)
    console.log(`✅ Professional ${i}: ${data.id}`)
  }

  // Create lead
  const { data: lead, error: leadError } = await supabase.from('leads').insert({
    country: 'AR',
    intent_tags: ['anxiety'],
  }).select().single()

  if (leadError) {
    console.error('Failed to create lead:', leadError)
    process.exit(1)
  }

  console.log(`✅ Lead: ${lead.id}`)

  // Create match
  const trackingCode = `QA-${Date.now()}`
  const { data: match, error: matchError } = await supabase.from('matches').insert({
    lead_id: lead.id,
    tracking_code: trackingCode,
  }).select().single()

  if (matchError) {
    console.error('Failed to create match:', matchError)
    process.exit(1)
  }

  console.log(`✅ Match: ${match.id}`)
  console.log(`✅ Tracking code: ${trackingCode}`)

  // Generate 3 attribution tokens (one per professional)
  const tokens = await Promise.all(
    pros.map((p, i) => createAttributionToken({
      match_id: match.id,
      professional_id: p.id,
      lead_id: lead.id,
      tracking_code: trackingCode,
      rank: i + 1,
    }))
  )

  // Insert 3 match_recommendations with realistic reasons
  const realisticReasons = [
    ['Experiencia demostrada en casos de ansiedad generalizada', 'Enfoque cálido y empático según referencias'],
    ['Técnicas innovadoras y efectivas para manejo del estrés', 'Disponibilidad flexible para sesiones online'],
    ['Metodología estructurada con seguimiento personalizado', 'Resultados positivos en casos similares al tuyo'],
  ]

  const { error: recError } = await supabase.from('match_recommendations').insert(
    pros.map((p, i) => ({
      match_id: match.id,
      professional_id: p.id,
      rank: i + 1,
      reasons: realisticReasons[i],
      attribution_token: tokens[i],
    }))
  )

  if (recError) {
    console.error('Failed to create match_recommendations:', recError)
    process.exit(1)
  }

  console.log(`\n📋 QA Test Data (save to qa.env):`)
  console.log(`MATCH_ID="${match.id}"`)
  console.log(`LEAD_ID="${lead.id}"`)
  console.log(`TRACKING_CODE="${trackingCode}"`)
  console.log(`PRO_1_ID="${pros[0].id}"`)
  console.log(`PRO_2_ID="${pros[1].id}"`)
  console.log(`PRO_3_ID="${pros[2].id}"`)
  console.log(`TOKEN_1="${tokens[0]}"`)
  console.log(`TOKEN_2="${tokens[1]}"`)
  console.log(`TOKEN_3="${tokens[2]}"`)

  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
