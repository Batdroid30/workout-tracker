import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

// Ensure we load vars for the script context
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const exercises = [
  // Chest
  { name: 'Barbell Bench Press', muscle_group: 'chest', secondary_muscles: ['triceps', 'shoulders'], equipment: 'barbell', movement_pattern: 'push', is_custom: false },
  { name: 'Incline Dumbbell Press', muscle_group: 'chest', secondary_muscles: ['triceps', 'shoulders'], equipment: 'dumbbell', movement_pattern: 'push', is_custom: false },
  { name: 'Cable Fly', muscle_group: 'chest', secondary_muscles: [], equipment: 'cable', movement_pattern: 'isolation', is_custom: false },
  { name: 'Dips', muscle_group: 'chest', secondary_muscles: ['triceps', 'shoulders'], equipment: 'bodyweight', movement_pattern: 'push', is_custom: false },
  
  // Back
  { name: 'Deadlift', muscle_group: 'back', secondary_muscles: ['glutes', 'hamstrings', 'core'], equipment: 'barbell', movement_pattern: 'hinge', is_custom: false },
  { name: 'Barbell Row', muscle_group: 'back', secondary_muscles: ['biceps', 'core'], equipment: 'barbell', movement_pattern: 'pull', is_custom: false },
  { name: 'Pull-ups', muscle_group: 'back', secondary_muscles: ['biceps'], equipment: 'bodyweight', movement_pattern: 'pull', is_custom: false },
  { name: 'Lat Pulldown', muscle_group: 'back', secondary_muscles: ['biceps'], equipment: 'cable', movement_pattern: 'pull', is_custom: false },
  { name: 'Seated Cable Row', muscle_group: 'back', secondary_muscles: ['biceps'], equipment: 'cable', movement_pattern: 'pull', is_custom: false },

  // Shoulders
  { name: 'Overhead Press', muscle_group: 'shoulders', secondary_muscles: ['triceps', 'core'], equipment: 'barbell', movement_pattern: 'push', is_custom: false },
  { name: 'Lateral Raise', muscle_group: 'shoulders', secondary_muscles: [], equipment: 'dumbbell', movement_pattern: 'isolation', is_custom: false },
  { name: 'Face Pull', muscle_group: 'shoulders', secondary_muscles: ['traps'], equipment: 'cable', movement_pattern: 'pull', is_custom: false },

  // Legs
  { name: 'Squat', muscle_group: 'quads', secondary_muscles: ['glutes', 'core'], equipment: 'barbell', movement_pattern: 'squat', is_custom: false },
  { name: 'Romanian Deadlift', muscle_group: 'hamstrings', secondary_muscles: ['glutes', 'back'], equipment: 'barbell', movement_pattern: 'hinge', is_custom: false },
  { name: 'Leg Press', muscle_group: 'quads', secondary_muscles: ['glutes', 'calves'], equipment: 'machine', movement_pattern: 'squat', is_custom: false },
  { name: 'Leg Curl', muscle_group: 'hamstrings', secondary_muscles: [], equipment: 'machine', movement_pattern: 'isolation', is_custom: false },
  { name: 'Calf Raise', muscle_group: 'calves', secondary_muscles: [], equipment: 'machine', movement_pattern: 'isolation', is_custom: false },

  // Arms
  { name: 'Barbell Curl', muscle_group: 'biceps', secondary_muscles: ['forearms'], equipment: 'barbell', movement_pattern: 'isolation', is_custom: false },
  { name: 'Hammer Curl', muscle_group: 'biceps', secondary_muscles: ['forearms'], equipment: 'dumbbell', movement_pattern: 'isolation', is_custom: false },
  { name: 'Skull Crusher', muscle_group: 'triceps', secondary_muscles: [], equipment: 'ez-bar', movement_pattern: 'isolation', is_custom: false },
  { name: 'Tricep Pushdown', muscle_group: 'triceps', secondary_muscles: [], equipment: 'cable', movement_pattern: 'isolation', is_custom: false },
  
  // Core
  { name: 'Crunch', muscle_group: 'core', secondary_muscles: [], equipment: 'bodyweight', movement_pattern: 'isolation', is_custom: false },
  { name: 'Plank', muscle_group: 'core', secondary_muscles: ['shoulders'], equipment: 'bodyweight', movement_pattern: 'isolation', is_custom: false }
]

async function seed() {
  for (const ex of exercises) {
    const { error } = await supabase.from('exercises').insert(ex)
    if (error) console.error(`Error inserting ${ex.name}:`, error.message)
    else console.log(`✓ Added ${ex.name}`)
  }
}

seed()
