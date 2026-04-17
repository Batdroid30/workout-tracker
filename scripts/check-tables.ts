import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(__dirname, '../.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkTables() {
  const { data: exercises, error: eErr } = await supabase.from('exercises').select('id').limit(1)
  console.log('exercises table:', eErr ? eErr.message : 'OK')

  const { data: workouts, error: wErr } = await supabase.from('workouts').select('id').limit(1)
  console.log('workouts table:', wErr ? wErr.message : 'OK')

  const { data: sets, error: sErr } = await supabase.from('sets').select('id').limit(1)
  console.log('sets table:', sErr ? sErr.message : 'OK')
}

checkTables()
