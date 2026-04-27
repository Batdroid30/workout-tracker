import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Full exercise catalogue — includes all exercises from the Hevy CSV export
// plus the original starter set, all with is_custom: false so every user sees them.
const exercises = [
  // ── Chest ──────────────────────────────────────────────────────────────────
  { name: 'Barbell Bench Press',                   muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'barbell',    is_custom: false },
  { name: 'Bench Press (Barbell)',                  muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'barbell',    is_custom: false },
  { name: 'Bench Press - Close Grip (Barbell)',     muscle_group: 'triceps',    movement_pattern: 'push',      equipment: 'barbell',    is_custom: false },
  { name: 'Incline Bench Press (Dumbbell)',         muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'dumbbell',   is_custom: false },
  { name: 'Incline Bench Press (Smith Machine)',    muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'machine',    is_custom: false },
  { name: 'Incline Chest Fly (Dumbbell)',           muscle_group: 'chest',      movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Incline Chest Press (Machine)',          muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'machine',    is_custom: false },
  { name: 'Decline Bench Press (Machine)',          muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'machine',    is_custom: false },
  { name: 'Decline Bench Press (Smith Machine)',    muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'machine',    is_custom: false },
  { name: 'Chest Press (Machine)',                  muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'machine',    is_custom: false },
  { name: 'Chest Fly (Machine)',                    muscle_group: 'chest',      movement_pattern: 'isolation', equipment: 'machine',    is_custom: false },
  { name: 'Butterfly (Pec Deck)',                   muscle_group: 'chest',      movement_pattern: 'isolation', equipment: 'machine',    is_custom: false },
  { name: 'Cable Fly',                              muscle_group: 'chest',      movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Cable Fly Crossovers',                   muscle_group: 'chest',      movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Low Cable Fly Crossovers',               muscle_group: 'chest',      movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Chest Dip',                              muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'bodyweight', is_custom: false },
  { name: 'Chest Dip (Assisted)',                   muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'machine',    is_custom: false },
  { name: 'Chest Dip (Weighted)',                   muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'bodyweight', is_custom: false },
  { name: 'Weighted Dips',                          muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'bodyweight', is_custom: false },
  { name: 'Dips',                                   muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'bodyweight', is_custom: false },
  { name: 'Push Up',                                muscle_group: 'chest',      movement_pattern: 'push',      equipment: 'bodyweight', is_custom: false },

  // ── Back ───────────────────────────────────────────────────────────────────
  { name: 'Deadlift',                               muscle_group: 'back',       movement_pattern: 'hinge',     equipment: 'barbell',    is_custom: false },
  { name: 'Deadlift (Barbell)',                     muscle_group: 'back',       movement_pattern: 'hinge',     equipment: 'barbell',    is_custom: false },
  { name: 'Barbell Row',                            muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'barbell',    is_custom: false },
  { name: 'Bent Over Row (Barbell)',                muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'barbell',    is_custom: false },
  { name: 'Deficit Dead Barbell Rows',              muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'barbell',    is_custom: false },
  { name: 'Meadows Rows (Barbell)',                 muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'barbell',    is_custom: false },
  { name: 'T Bar Row',                              muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'barbell',    is_custom: false },
  { name: 'Dumbbell Row',                           muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'dumbbell',   is_custom: false },
  { name: 'Chest Supported Incline Row (Dumbbell)', muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'dumbbell',   is_custom: false },
  { name: 'Chest Supported Incline Row - Wide Grip',muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'barbell',    is_custom: false },
  { name: 'Pull-ups',                               muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'bodyweight', is_custom: false },
  { name: 'Pull Up',                                muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'bodyweight', is_custom: false },
  { name: 'Pull Up (Assisted)',                     muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'machine',    is_custom: false },
  { name: 'Pull Up (Weighted)',                     muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'bodyweight', is_custom: false },
  { name: 'Chin Up (Weighted)',                     muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'bodyweight', is_custom: false },
  { name: 'Lat Pulldown',                           muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },
  { name: 'Lat Pulldown (Cable)',                   muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },
  { name: 'Behind The Neck Pulldown',               muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },
  { name: 'Reverse Grip Lat Pulldown (Cable)',      muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },
  { name: 'Single Arm Lat Pulldown',                muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },
  { name: 'Straight Arm Lat Pulldown (Cable)',      muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },
  { name: 'Pullover (Machine)',                     muscle_group: 'lats',       movement_pattern: 'pull',      equipment: 'machine',    is_custom: false },
  { name: 'Seated Cable Row',                       muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },
  { name: 'Seated Cable Row - Bar Grip',            muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },
  { name: 'Seated Cable Row - Bar Wide Grip',       muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },
  { name: 'Seated Cable Row - V Grip (Cable)',      muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },
  { name: 'Seated Row (Machine)',                   muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'machine',    is_custom: false },
  { name: 'Iso-Lateral Row (Machine)',              muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'machine',    is_custom: false },
  { name: 'Iso-Lateral Low Row',                    muscle_group: 'back',       movement_pattern: 'pull',      equipment: 'machine',    is_custom: false },

  // ── Shoulders ──────────────────────────────────────────────────────────────
  { name: 'Overhead Press',                         muscle_group: 'shoulders',  movement_pattern: 'push',      equipment: 'barbell',    is_custom: false },
  { name: 'Overhead Press (Barbell)',               muscle_group: 'shoulders',  movement_pattern: 'push',      equipment: 'barbell',    is_custom: false },
  { name: 'Overhead Press (Smith Machine)',         muscle_group: 'shoulders',  movement_pattern: 'push',      equipment: 'machine',    is_custom: false },
  { name: 'Shoulder Press (Dumbbell)',              muscle_group: 'shoulders',  movement_pattern: 'push',      equipment: 'dumbbell',   is_custom: false },
  { name: 'Seated Shoulder Press (Machine)',        muscle_group: 'shoulders',  movement_pattern: 'push',      equipment: 'machine',    is_custom: false },
  { name: 'Lateral Raise',                          muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Lateral Raise (Dumbbell)',               muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Lateral Raise (Cable)',                  muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Lateral Raise (Machine)',                muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'machine',    is_custom: false },
  { name: 'Seated Lateral Raise (Dumbbell)',        muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Single Arm Lateral Raise (Cable)',       muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Lu Raises',                              muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Face Pull',                              muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Rear Delt Reverse Fly (Dumbbell)',       muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Rear Delt Reverse Fly (Cable)',          muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Rear Delt Reverse Fly (Machine)',        muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'machine',    is_custom: false },
  { name: 'Chest Supported Reverse Fly (Dumbbell)', muscle_group: 'shoulders',  movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Upright Row (Barbell)',                  muscle_group: 'shoulders',  movement_pattern: 'pull',      equipment: 'barbell',    is_custom: false },
  { name: 'Upright Row (Cable)',                    muscle_group: 'shoulders',  movement_pattern: 'pull',      equipment: 'cable',      is_custom: false },

  // ── Traps ──────────────────────────────────────────────────────────────────
  { name: 'Shrug (Barbell)',                        muscle_group: 'traps',      movement_pattern: 'pull',      equipment: 'barbell',    is_custom: false },
  { name: 'Shrug (Dumbbell)',                       muscle_group: 'traps',      movement_pattern: 'pull',      equipment: 'dumbbell',   is_custom: false },
  { name: 'Shrug (Machine)',                        muscle_group: 'traps',      movement_pattern: 'pull',      equipment: 'machine',    is_custom: false },

  // ── Biceps ─────────────────────────────────────────────────────────────────
  { name: 'Barbell Curl',                           muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'barbell',    is_custom: false },
  { name: 'Bicep Curl (Barbell)',                   muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'barbell',    is_custom: false },
  { name: 'Bicep Curl (Dumbbell)',                  muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Bicep Curl (Cable)',                     muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Behind the Back Curl (Cable)',           muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: '21s Bicep Curl',                         muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'barbell',    is_custom: false },
  { name: 'EZ Bar Biceps Curl',                     muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'ez-bar',     is_custom: false },
  { name: 'Preacher Curl (Barbell)',                muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'barbell',    is_custom: false },
  { name: 'Preacher Curl (Dumbbell)',               muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Seated Incline Curl (Dumbbell)',         muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Hammer Curl',                            muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Hammer Curl (Dumbbell)',                 muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },
  { name: 'Hammer Curl (Cable)',                    muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Reverse Curl (Barbell)',                 muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'barbell',    is_custom: false },
  { name: 'Reverse Curl (Cable)',                   muscle_group: 'biceps',     movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },

  // ── Triceps ────────────────────────────────────────────────────────────────
  { name: 'Skull Crusher',                          muscle_group: 'triceps',    movement_pattern: 'isolation', equipment: 'ez-bar',     is_custom: false },
  { name: 'Skullcrusher (Barbell)',                 muscle_group: 'triceps',    movement_pattern: 'isolation', equipment: 'barbell',    is_custom: false },
  { name: 'Tricep Pushdown',                        muscle_group: 'triceps',    movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Triceps Pushdown',                       muscle_group: 'triceps',    movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Triceps Rope Pushdown',                  muscle_group: 'triceps',    movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Single Arm Triceps Pushdown (Cable)',    muscle_group: 'triceps',    movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Overhead Triceps Extension (Cable)',     muscle_group: 'triceps',    movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Triceps Extension (Barbell)',            muscle_group: 'triceps',    movement_pattern: 'isolation', equipment: 'barbell',    is_custom: false },
  { name: 'Triceps Extension (Cable)',              muscle_group: 'triceps',    movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Triceps Extension (Dumbbell)',           muscle_group: 'triceps',    movement_pattern: 'isolation', equipment: 'dumbbell',   is_custom: false },

  // ── Legs ───────────────────────────────────────────────────────────────────
  { name: 'Squat',                                  muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'barbell',    is_custom: false },
  { name: 'Squat (Barbell)',                        muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'barbell',    is_custom: false },
  { name: 'Squat (Smith Machine)',                  muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'machine',    is_custom: false },
  { name: 'Hack Squat (Machine)',                   muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'machine',    is_custom: false },
  { name: 'Leg Press',                              muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'machine',    is_custom: false },
  { name: 'Leg Press (Machine)',                    muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'machine',    is_custom: false },
  { name: 'Leg Extension (Machine)',                muscle_group: 'quads',      movement_pattern: 'isolation', equipment: 'machine',    is_custom: false },
  { name: 'Bulgarian Split Squat',                  muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'dumbbell',   is_custom: false },
  { name: 'Lunge (Barbell)',                        muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'barbell',    is_custom: false },
  { name: 'Lunge (Dumbbell)',                       muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'dumbbell',   is_custom: false },
  { name: 'Reverse Lunge (Barbell)',                muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'barbell',    is_custom: false },
  { name: 'Walking Lunge (Dumbbell)',               muscle_group: 'quads',      movement_pattern: 'squat',     equipment: 'dumbbell',   is_custom: false },
  { name: 'Romanian Deadlift',                      muscle_group: 'hamstrings', movement_pattern: 'hinge',     equipment: 'barbell',    is_custom: false },
  { name: 'Romanian Deadlift (Barbell)',            muscle_group: 'hamstrings', movement_pattern: 'hinge',     equipment: 'barbell',    is_custom: false },
  { name: 'Romanian Deadlift (Dumbbell)',           muscle_group: 'hamstrings', movement_pattern: 'hinge',     equipment: 'dumbbell',   is_custom: false },
  { name: 'Stiff Leg Deadlift (Dumbbell)',          muscle_group: 'hamstrings', movement_pattern: 'hinge',     equipment: 'dumbbell',   is_custom: false },
  { name: 'Leg Curl',                               muscle_group: 'hamstrings', movement_pattern: 'isolation', equipment: 'machine',    is_custom: false },
  { name: 'Lying Leg Curl (Machine)',               muscle_group: 'hamstrings', movement_pattern: 'isolation', equipment: 'machine',    is_custom: false },
  { name: 'Standing Leg Curls',                     muscle_group: 'hamstrings', movement_pattern: 'isolation', equipment: 'machine',    is_custom: false },
  { name: 'Hip Abduction (Machine)',                muscle_group: 'glutes',     movement_pattern: 'isolation', equipment: 'machine',    is_custom: false },
  { name: 'Calf Raise',                             muscle_group: 'calves',     movement_pattern: 'isolation', equipment: 'machine',    is_custom: false },

  // ── Core ───────────────────────────────────────────────────────────────────
  { name: 'Crunch',                                 muscle_group: 'core',       movement_pattern: 'isolation', equipment: 'bodyweight', is_custom: false },
  { name: 'Cable Crunch',                           muscle_group: 'core',       movement_pattern: 'isolation', equipment: 'cable',      is_custom: false },
  { name: 'Plank',                                  muscle_group: 'core',       movement_pattern: 'isolation', equipment: 'bodyweight', is_custom: false },
]

async function seed() {
  // Fetch all existing exercise names so we can skip ones already in the DB.
  const { data: existing } = await supabase
    .from('exercises')
    .select('name')
    .eq('is_custom', false)

  const existingNames = new Set(
    (existing ?? []).map((e: { name: string }) => e.name.toLowerCase())
  )

  const toInsert = exercises.filter(e => !existingNames.has(e.name.toLowerCase()))

  if (toInsert.length === 0) {
    console.log('✓ All exercises already seeded — nothing to do.')
    return
  }

  console.log(`Seeding ${toInsert.length} new exercises (${exercises.length - toInsert.length} already exist)...\n`)

  for (const ex of toInsert) {
    const { error } = await supabase.from('exercises').insert(ex)
    if (error) console.error(`  ✗ ${ex.name}: ${error.message}`)
    else       console.log(`  ✓ ${ex.name}`)
  }

  console.log('\nDone.')
}

seed()
