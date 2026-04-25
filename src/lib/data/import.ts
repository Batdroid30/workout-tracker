import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import type { MuscleGroup, MovementPattern } from '@/types/database'

export interface HevyRow {
  title: string
  start_time: string
  end_time: string
  description: string
  exercise_title: string
  superset_id: string
  exercise_notes: string
  set_index: string
  set_type: string
  weight_kg?: string
  weight_lbs?: string
  reps: string
  distance_km?: string
  distance_miles?: string
  duration_seconds: string
  rpe: string
}

export function parseHevyCSV(csvText: string): HevyRow[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: HevyRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i]
    if (!currentLine.trim()) continue

    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let char of currentLine) {
      if (char === '"') inQuotes = !inQuotes
      else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.replace(/^"|"$/g, '') || ''
    })
    rows.push(row as HevyRow)
  }

  return rows
}

function guessExerciseMetrics(name: string): { muscle: MuscleGroup, pattern: MovementPattern } {
  const n = name.toLowerCase()

  if (n.includes('bench') || n.includes('chest press') || n.includes('pushup')) return { muscle: 'chest', pattern: 'push' }
  if (n.includes('fly')) return { muscle: 'chest', pattern: 'isolation' }
  if (n.includes('dip')) return { muscle: 'chest', pattern: 'push' }

  if (n.includes('pullup') || n.includes('chinup') || n.includes('lat pulldown')) return { muscle: 'back', pattern: 'pull' }
  if (n.includes('row')) return { muscle: 'back', pattern: 'pull' }
  if (n.includes('deadlift') && !n.includes('rdl') && !n.includes('romanian')) return { muscle: 'back', pattern: 'hinge' }
  if (n.includes('rdl') || n.includes('romanian')) return { muscle: 'hamstrings', pattern: 'hinge' }

  if (n.includes('squat') || n.includes('leg press') || n.includes('lunge')) return { muscle: 'quads', pattern: 'squat' }
  if (n.includes('leg curl')) return { muscle: 'hamstrings', pattern: 'isolation' }
  if (n.includes('leg extension')) return { muscle: 'quads', pattern: 'isolation' }
  if (n.includes('calf')) return { muscle: 'calves', pattern: 'isolation' }

  if (n.includes('overhead press') || n.includes('shoulder press') || n.includes('military press')) return { muscle: 'shoulders', pattern: 'push' }
  if (n.includes('lateral raise') || n.includes('front raise') || n.includes('face pull')) return { muscle: 'shoulders', pattern: 'isolation' }

  if (n.includes('curl')) return { muscle: 'biceps', pattern: 'isolation' }
  if (n.includes('tricep') || n.includes('skull') || n.includes('extension')) {
    if (n.includes('leg')) return { muscle: 'quads', pattern: 'isolation' } // Handle leg extension
    return { muscle: 'triceps', pattern: 'isolation' }
  }

  if (n.includes('plank') || n.includes('crunch') || n.includes('leg raise') || n.includes('sit up') || n.includes('ab ')) return { muscle: 'core', pattern: 'isolation' }

  return { muscle: 'core', pattern: 'isolation' } // Fallback
}

async function findOrCreateExercise(supabase: any, userId: string, name: string): Promise<string> {
  const { data: existing } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', name)
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  const { muscle, pattern } = guessExerciseMetrics(name)

  const { data: newEx, error: createErr } = await supabase
    .from('exercises')
    .insert({
      name,
      muscle_group: muscle,
      movement_pattern: pattern,
      is_custom: true,
      created_by: userId
    })
    .select('id')
    .single()

  if (createErr) throw new DatabaseError(`Failed to create exercise: ${name}`, createErr)
  return newEx.id
}

export async function importWorkoutsFromHevy(userId: string, rows: HevyRow[]) {
  const supabase = await getSupabaseServer()

  const workoutsMap = new Map<string, HevyRow[]>()
  rows.forEach(row => {
    const key = `${row.title}-${row.start_time}`
    if (!workoutsMap.has(key)) workoutsMap.set(key, [])
    workoutsMap.get(key)!.push(row)
  })

  const results = {
    workoutsImported: 0,
    errors: [] as string[]
  }

  for (const [key, workoutRows] of workoutsMap.entries()) {
    try {
      const firstRow = workoutRows[0]

      const { data: workout, error: workoutErr } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          title: firstRow.title,
          notes: firstRow.description || null,
          started_at: firstRow.start_time,
          completed_at: firstRow.end_time || null,
          duration_seconds: parseInt(firstRow.duration_seconds) || null,
          created_at: firstRow.start_time
        })
        .select()
        .single()

      if (workoutErr) throw workoutErr

      const exerciseMap = new Map<string, HevyRow[]>()
      workoutRows.forEach(row => {
        if (!exerciseMap.has(row.exercise_title)) exerciseMap.set(row.exercise_title, [])
        exerciseMap.get(row.exercise_title)!.push(row)
      })

      let orderIndex = 0
      for (const [exerciseName, setRows] of exerciseMap.entries()) {
        const exerciseId = await findOrCreateExercise(supabase, userId, exerciseName)

        const { data: we, error: weErr } = await supabase
          .from('workout_exercises')
          .insert({
            workout_id: workout.id,
            exercise_id: exerciseId,
            order_index: orderIndex++,
            notes: setRows[0].exercise_notes || null
          })
          .select()
          .single()

        if (weErr) throw weErr

        const setsToInsert = setRows.map((sr, idx) => {
          let weight = 0
          if (sr.weight_kg) weight = parseFloat(sr.weight_kg)
          else if (sr.weight_lbs) weight = parseFloat(sr.weight_lbs) * 0.453592

          return {
            workout_exercise_id: we.id,
            set_number: parseInt(sr.set_index) || (idx + 1),
            weight_kg: weight,
            reps: parseInt(sr.reps) || 0,
            rpe: parseFloat(sr.rpe) || null,
            is_warmup: sr.set_type === 'warmup',
            completed_at: workout.completed_at || workout.started_at
          }
        })

        const { error: setsErr } = await supabase.from('sets').insert(setsToInsert)
        if (setsErr) throw setsErr
      }

      results.workoutsImported++
    } catch (err: any) {
      console.error(`Failed to import workout ${key}:`, err)
      results.errors.push(`Workout "${key}": ${err.message}`)
    }
  }

  return results
}
