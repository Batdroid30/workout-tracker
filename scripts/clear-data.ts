import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearData() {
  console.log('🗑️ Clearing workout data...')

  try {
    // 1. Delete Personal Records
    const { error: prErr } = await supabase.from('personal_records').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (prErr) throw prErr
    console.log('✓ Cleared Personal Records')

    // 2. Delete Sets
    const { error: setsErr } = await supabase.from('sets').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (setsErr) throw setsErr
    console.log('✓ Cleared Sets')

    // 3. Delete Workout Exercises
    const { error: weErr } = await supabase.from('workout_exercises').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (weErr) throw weErr
    console.log('✓ Cleared Workout Exercises')

    // 4. Delete Workouts
    const { error: wErr } = await supabase.from('workouts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (wErr) throw wErr
    console.log('✓ Cleared Workouts')

    // 5. Delete Custom Exercises
    const { error: exErr } = await supabase.from('exercises').delete().eq('is_custom', true)
    if (exErr) throw exErr
    console.log('✓ Cleared Custom Exercises')

    console.log('\n✨ Database cleared successfully!')
  } catch (error: any) {
    console.error('\n❌ Failed to clear data:', error.message)
  }
}

clearData()
