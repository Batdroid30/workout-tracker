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

/**
 * Infers muscle group and movement pattern from an exercise name.
 *
 * Rules are ordered from MOST SPECIFIC to LEAST SPECIFIC.
 * This prevents broad keywords (e.g. "fly", "row") from incorrectly matching
 * exercises that contain them as part of a more specific phrase
 * (e.g. "Rear Delt Fly", "Upright Row").
 */
function guessExerciseMetrics(name: string): { muscle: MuscleGroup; pattern: MovementPattern } {
  const n = name.toLowerCase()

  // ── Shoulders — specific phrases MUST come before "fly" / "row" ───────────
  if (n.includes('rear delt') || n.includes('reverse fly') || n.includes('reverse pec'))
    return { muscle: 'shoulders', pattern: 'isolation' }
  if (n.includes('face pull'))
    return { muscle: 'shoulders', pattern: 'isolation' }
  if (n.includes('upright row'))
    return { muscle: 'shoulders', pattern: 'pull' }
  if (n.includes('lateral raise') || n.includes('lat raise') || n.includes('side raise') || n.includes('front raise'))
    return { muscle: 'shoulders', pattern: 'isolation' }
  if (n.includes('overhead press') || n.includes('shoulder press') || n.includes('military press') || n.includes(' ohp'))
    return { muscle: 'shoulders', pattern: 'push' }
  if (n.includes('arnold'))
    return { muscle: 'shoulders', pattern: 'push' }

  // ── Chest ─────────────────────────────────────────────────────────────────
  if (n.includes('bench press') || n.includes('chest press') || n.includes('chest fly'))
    return { muscle: 'chest', pattern: n.includes('fly') ? 'isolation' : 'push' }
  if (n.includes('pushup') || n.includes('push-up') || n.includes('push up'))
    return { muscle: 'chest', pattern: 'push' }
  if (n.includes('pec dec') || n.includes('cable crossover') || n.includes('cable fly'))
    return { muscle: 'chest', pattern: 'isolation' }
  // Generic "fly" only reaches here if it wasn't caught by a shoulder rule above
  if (n.includes('fly') || n.includes('flye'))
    return { muscle: 'chest', pattern: 'isolation' }
  // Dip without "tricep" qualifier → chest-dominant
  if (n.includes('dip') && !n.includes('tricep'))
    return { muscle: 'chest', pattern: 'push' }

  // ── Back ──────────────────────────────────────────────────────────────────
  if (n.includes('pullup') || n.includes('pull-up') || n.includes('pull up') ||
      n.includes('chinup') || n.includes('chin-up') || n.includes('chin up'))
    return { muscle: 'lats', pattern: 'pull' }
  if (n.includes('lat pulldown') || n.includes('lat pull'))
    return { muscle: 'lats', pattern: 'pull' }
  if (n.includes('seated row') || n.includes('cable row') || n.includes('machine row') ||
      n.includes('chest supported') || n.includes('t-bar row') || n.includes('barbell row') ||
      n.includes('dumbbell row') || n.includes('pendlay') || n.includes('bent over row'))
    return { muscle: 'back', pattern: 'pull' }
  // Generic "row" only reaches here if not caught by shoulder/specific-back rules above
  if (n.includes('row'))
    return { muscle: 'back', pattern: 'pull' }
  if (n.includes('pull over'))
    return { muscle: 'lats', pattern: 'pull' }
  // Romanian / stiff-leg deadlifts → hamstrings before the generic deadlift rule
  if (n.includes('rdl') || n.includes('romanian') || n.includes('stiff leg') || n.includes('good morning'))
    return { muscle: 'hamstrings', pattern: 'hinge' }
  if (n.includes('deadlift'))
    return { muscle: 'back', pattern: 'hinge' }
  if (n.includes('shrug'))
    return { muscle: 'traps', pattern: 'pull' }

  // ── Legs ──────────────────────────────────────────────────────────────────
  if (n.includes('squat'))
    return { muscle: 'quads', pattern: 'squat' }
  if (n.includes('leg press') || n.includes('hack squat'))
    return { muscle: 'quads', pattern: 'squat' }
  if (n.includes('lunge') || n.includes('split squat') || n.includes('step up') || n.includes('bulgarian'))
    return { muscle: 'quads', pattern: 'squat' }
  if (n.includes('leg curl') || n.includes('hamstring curl') || n.includes('nordic'))
    return { muscle: 'hamstrings', pattern: 'isolation' }
  if (n.includes('leg extension'))
    return { muscle: 'quads', pattern: 'isolation' }
  if (n.includes('hip thrust') || n.includes('glute bridge') || n.includes('hip extension') || n.includes('glute'))
    return { muscle: 'glutes', pattern: 'hinge' }
  if (n.includes('calf') || n.includes('calves') || n.includes('calf raise'))
    return { muscle: 'calves', pattern: 'isolation' }

  // ── Triceps — before generic "extension" ─────────────────────────────────
  if (n.includes('tricep') || n.includes('triceps') || n.includes('skull crusher') ||
      n.includes('close grip bench') || n.includes('jm press'))
    return { muscle: 'triceps', pattern: 'isolation' }
  if (n.includes('dip'))  // "tricep dip" hits here after the chest-dip check above was skipped
    return { muscle: 'triceps', pattern: 'push' }
  if (n.includes('pushdown') || n.includes('pressdown'))
    return { muscle: 'triceps', pattern: 'isolation' }
  if (n.includes('extension') && !n.includes('leg') && !n.includes('hip'))
    return { muscle: 'triceps', pattern: 'isolation' }

  // ── Biceps ────────────────────────────────────────────────────────────────
  if (n.includes('curl') && !n.includes('leg curl') && !n.includes('hamstring curl'))
    return { muscle: 'biceps', pattern: 'isolation' }

  // ── Core ──────────────────────────────────────────────────────────────────
  if (n.includes('plank') || n.includes('crunch') || n.includes('sit up') || n.includes('situp') ||
      n.includes('leg raise') || n.includes(' ab ') || n.includes('oblique') ||
      n.includes('russian twist') || n.includes('core') || n.includes('hollow'))
    return { muscle: 'core', pattern: 'isolation' }

  // ── Fallback ──────────────────────────────────────────────────────────────
  // Default to 'back/pull' — less wrong than 'core' for unknown compound movements
  return { muscle: 'back', pattern: 'pull' }
}

async function bulkResolveExercises(
  supabase: any,
  userId: string,
  names: string[],
): Promise<Map<string, string>> {
  const lookup = new Map<string, string>() // lowercase name → id

  const { data: existing, error } = await supabase
    .from('exercises')
    .select('id, name')
  if (error) throw new DatabaseError('Failed to fetch exercises', error)

  existing?.forEach((ex: { id: string; name: string }) => {
    lookup.set(ex.name.toLowerCase(), ex.id)
  })

  const missing = [...new Set(names)].filter(n => !lookup.has(n.toLowerCase()))
  if (missing.length === 0) return lookup

  const toCreate = missing.map(name => {
    const { muscle, pattern } = guessExerciseMetrics(name)
    return { name, muscle_group: muscle, movement_pattern: pattern, is_custom: true, created_by: userId }
  })

  const { data: created, error: createErr } = await supabase
    .from('exercises')
    .insert(toCreate)
    .select('id, name')
  if (createErr) throw new DatabaseError('Failed to create exercises', createErr)

  created?.forEach((ex: { id: string; name: string }) => {
    lookup.set(ex.name.toLowerCase(), ex.id)
  })

  return lookup
}

// Supabase's PostgREST has a practical limit around 1000 rows per request.
// Chunking at 500 gives headroom for wide rows (many columns).
const INSERT_CHUNK_SIZE = 500

async function insertInChunks<T extends object>(
  supabase: any,
  table: string,
  rows: T[],
): Promise<{ data: { id: string }[]; error: any }> {
  const allData: { id: string }[] = []
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE)
    const { data, error } = await supabase.from(table).insert(chunk).select('id')
    if (error) return { data: [], error }
    allData.push(...(data ?? []))
  }
  return { data: allData, error: null }
}

export async function importWorkoutsFromHevy(userId: string, rows: HevyRow[]) {
  const supabase = await getSupabaseServer()

  // ── Step 1: group CSV rows by workout ────────────────────────────────────────
  const workoutEntries: Array<{ key: string; firstRow: HevyRow; allRows: HevyRow[] }> = []
  const workoutsMap = new Map<string, HevyRow[]>()
  rows.forEach(row => {
    const key = `${row.title}-${row.start_time}`
    if (!workoutsMap.has(key)) {
      workoutsMap.set(key, [])
      workoutEntries.push({ key, firstRow: row, allRows: workoutsMap.get(key)! })
    }
    workoutsMap.get(key)!.push(row)
  })

  // ── Step 2: skip workouts that already exist in the DB ───────────────────────
  // Use the CSV's date range to scope the duplicate check — avoids a full-table scan.
  const allStartTimes = workoutEntries.map(e => e.firstRow.start_time)
  const rangeMin = allStartTimes.reduce((a, b) => (a < b ? a : b))
  const rangeMax = allStartTimes.reduce((a, b) => (a > b ? a : b))

  const { data: existingWorkouts } = await supabase
    .from('workouts')
    .select('title, started_at')
    .eq('user_id', userId)
    .gte('started_at', rangeMin)
    .lte('started_at', rangeMax)

  const existingKeys = new Set(
    (existingWorkouts ?? []).map((w: { title: string | null; started_at: string }) =>
      `${w.title ?? ''}-${w.started_at}`
    )
  )

  const newEntries = workoutEntries.filter(({ firstRow }) => {
    // Normalise: the CSV uses "18 Apr 2026, 08:23" but DB stores ISO.
    // We match on the raw start_time string used as key during grouping.
    return !existingKeys.has(`${firstRow.title}-${firstRow.start_time}`)
  })

  if (newEntries.length === 0) {
    return { workoutsImported: 0, skipped: workoutEntries.length, errors: [] as string[] }
  }

  // ── Step 3: resolve exercises (2 DB calls total) ──────────────────────────────
  const allExerciseNames = rows.map(r => r.exercise_title).filter(Boolean)
  const exerciseLookup = await bulkResolveExercises(supabase, userId, allExerciseNames)

  // ── Step 4: batch insert new workouts in one call ─────────────────────────────
  const workoutsToInsert = newEntries.map(({ firstRow }) => ({
    user_id: userId,
    title: firstRow.title,
    notes: firstRow.description || null,
    started_at: firstRow.start_time,
    completed_at: firstRow.end_time || null,
    duration_seconds: parseInt(firstRow.duration_seconds) || null,
    created_at: firstRow.start_time,
  }))

  const { data: insertedWorkouts, error: workoutsErr } = await supabase
    .from('workouts')
    .insert(workoutsToInsert)
    .select('id, started_at, completed_at')

  if (workoutsErr) throw new DatabaseError('Failed to insert workouts', workoutsErr)

  // ── Step 5: build all workout_exercises rows (in insertion-order) ─────────────
  // insertedWorkouts[i] corresponds to newEntries[i] — Postgres returns rows
  // in the order they were supplied to INSERT.
  type WEMeta = { setRows: HevyRow[]; weIndex: number }
  const weBatch: object[] = []
  const weMeta: WEMeta[] = []

  newEntries.forEach(({ allRows }, wIdx) => {
    const workout = insertedWorkouts[wIdx]
    if (!workout) return

    const exerciseMap = new Map<string, HevyRow[]>()
    allRows.forEach(row => {
      if (!exerciseMap.has(row.exercise_title)) exerciseMap.set(row.exercise_title, [])
      exerciseMap.get(row.exercise_title)!.push(row)
    })

    let orderIndex = 0
    for (const [exerciseName, setRows] of exerciseMap.entries()) {
      const exerciseId = exerciseLookup.get(exerciseName.toLowerCase())
      if (!exerciseId) continue
      weMeta.push({ setRows, weIndex: weBatch.length })
      weBatch.push({
        workout_id: workout.id,
        exercise_id: exerciseId,
        order_index: orderIndex++,
        notes: setRows[0].exercise_notes || null,
      })
    }
  })

  // ── Step 6: batch insert ALL workout_exercises ────────────────────────────────
  const { data: insertedWEs, error: weErr } = await insertInChunks(supabase, 'workout_exercises', weBatch as object[])
  if (weErr) throw new DatabaseError('Failed to insert workout exercises', weErr)

  // ── Step 7: build all sets rows ───────────────────────────────────────────────
  const allSets: object[] = []
  weMeta.forEach(({ setRows, weIndex }) => {
    const we = insertedWEs[weIndex]
    if (!we) return

    // Determine the completed_at for these sets from the parent workout.
    // We stored workouts in the same index order as weBatch entries are derived from workoutEntries.
    // Walk back via the weBatch entry's workout_id to find the right workout.
    const weBatchEntry = weBatch[weIndex] as { workout_id: string }
    const parentWorkout = insertedWorkouts.find((w: { id: string }) => w.id === weBatchEntry.workout_id) as
      | { id: string; started_at: string; completed_at: string | null }
      | undefined

    setRows.forEach((sr, idx) => {
      let weight = 0
      if (sr.weight_kg) weight = parseFloat(sr.weight_kg)
      else if (sr.weight_lbs) weight = parseFloat(sr.weight_lbs) * 0.453592
      allSets.push({
        workout_exercise_id: we.id,
        set_number: parseInt(sr.set_index) || (idx + 1),
        weight_kg: weight,
        reps: parseInt(sr.reps) || 0,
        rpe: parseFloat(sr.rpe) || null,
        is_warmup: sr.set_type === 'warmup',
        completed_at: parentWorkout?.completed_at ?? parentWorkout?.started_at ?? sr.start_time,
      })
    })
  })

  // ── Step 8: batch insert ALL sets ────────────────────────────────────────────
  if (allSets.length > 0) {
    const { error: setsErr } = await insertInChunks(supabase, 'sets', allSets as object[])
    if (setsErr) throw new DatabaseError('Failed to insert sets', setsErr)
  }

  return {
    workoutsImported: insertedWorkouts.length,
    skipped: workoutEntries.length - newEntries.length,
    errors: [] as string[],
  }
}
