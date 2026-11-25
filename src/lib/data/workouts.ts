import { cache } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { calculate1RM } from '@/lib/algorithms'
import { setVolume, workoutBodyweight } from '@/lib/load'
import type { PRType } from '@/types/database'
import type { FinishPayload } from '@/lib/workout-session'
import type { WorkoutItem } from '@/types/workout-history'
import { splitPage, type HistoryCursor } from './history-page'

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupPRTypesBySet(rows: { set_id: string; pr_type: PRType }[]): Map<string, PRType[]> {
  const map = new Map<string, PRType[]>()
  rows.forEach(pr => {
    const existing = map.get(pr.set_id) ?? []
    existing.push(pr.pr_type)
    map.set(pr.set_id, existing)
  })
  return map
}

function attachPRTypes<T extends { workout_exercises: any[] }>(
  workouts: T[],
  prSetMap: Map<string, PRType[]>,
): (T & { prTypes: PRType[] })[] {
  return workouts.map(w => {
    const typeSet = new Set<PRType>()
    w.workout_exercises.forEach((we: any) => {
      ;(we.sets ?? []).forEach((s: any) => {
        prSetMap.get(s.id)?.forEach(t => typeSet.add(t))
      })
    })
    return { ...w, prTypes: Array.from(typeSet) }
  })
}

// ── Read functions ────────────────────────────────────────────────────────────
// React cache() deduplicates calls within a single request.
// No persistent server-side cache — every page load gets fresh data.

// Home's "Latest" card falls back to this when there is no recent PR.
export const getLastCompletedWorkout = cache(async (userId: string) => {
  const supabase = await getSupabaseServer()

  const { data, error } = await supabase
    .from('workouts')
    .select(`
      id, title, started_at, duration_seconds, bodyweight_kg,
      workout_exercises (
        exercise:exercises ( name ),
        sets ( weight_kg, reps, is_warmup )
      )
    `)
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new DatabaseError('Failed to fetch last completed workout', error)
  return data
})

const HISTORY_PAGE_SIZE = 20

type DataClient = Awaited<ReturnType<typeof getSupabaseServer>>

function isPRType(value: string): value is PRType {
  return value === 'best_weight' || value === 'best_volume' || value === 'best_1rm'
}

// Filters by the page's workout ids (at most HISTORY_PAGE_SIZE uuids) rather than
// every set id, which would put hundreds of uuids in the request URL.
async function fetchPRSetMapForWorkouts(
  supabase: DataClient,
  uid: string,
  workoutIds: string[],
): Promise<Map<string, PRType[]>> {
  if (workoutIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('personal_records')
    .select('set_id, pr_type, sets!inner(workout_exercises!inner(workout_id))')
    .eq('user_id', uid)
    .in('sets.workout_exercises.workout_id', workoutIds)
  if (error) throw new DatabaseError('Failed to fetch history personal records', error)

  const rows = (data ?? []).flatMap(pr =>
    pr.set_id !== null && isPRType(pr.pr_type) ? [{ set_id: pr.set_id, pr_type: pr.pr_type }] : [],
  )
  return groupPRTypesBySet(rows)
}

export async function getWorkoutHistoryPage(
  userId: string,
  cursor: HistoryCursor | null,
): Promise<{ workouts: WorkoutItem[]; hasMore: boolean }> {
  const supabase = await getSupabaseServer()

  // Fetch one row beyond the page so hasMore needs no separate count query.
  let query = supabase
    .from('workouts')
    .select(`
      id, title, started_at, duration_seconds, bodyweight_kg,
      workout_exercises (
        exercise:exercises ( name, muscle_group, secondary_muscles ),
        sets ( id, weight_kg, reps, is_warmup )
      )
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(HISTORY_PAGE_SIZE + 1)

  if (cursor) {
    // Keyset paging: rows strictly after the cursor, with id breaking timestamp ties.
    // Unlike OFFSET, deleting an already-loaded row cannot make a row get skipped.
    // Normalised to UTC "Z" form so the value has no characters PostgREST treats specially.
    const startedAt = new Date(cursor.startedAt).toISOString()
    query = query.or(`started_at.lt.${startedAt},and(started_at.eq.${startedAt},id.lt.${cursor.id})`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch workout history:', error.message)
    throw new DatabaseError('Failed to fetch workout history', error)
  }

  const { items, hasMore } = splitPage(data ?? [], HISTORY_PAGE_SIZE)
  const prSetMap = await fetchPRSetMapForWorkouts(supabase, userId, items.map(w => w.id))

  return { workouts: attachPRTypes(items, prSetMap), hasMore }
}

/** Volume of a `sets` row joined with workout_exercises → exercise name and workout bodyweight. */
function setVolumeFromRow(set: any): number {
  const we       = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
  const exercise = Array.isArray(we?.exercise) ? we.exercise[0] : we?.exercise
  const workout  = Array.isArray(we?.workouts) ? we.workouts[0] : we?.workouts
  return setVolume(Number(set.weight_kg) || 0, Number(set.reps) || 0, exercise?.name ?? '', workoutBodyweight(workout?.bodyweight_kg))
}

export const getWorkoutsSummary = cache(async (userId: string) => {
  const supabase = await getSupabaseServer()

  const [{ count, error: countErr }, { data: setsData, error: setsErr }] = await Promise.all([
    supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('sets')
      .select('weight_kg, reps, workout_exercises!inner(exercise:exercises(name), workouts!inner(user_id, bodyweight_kg))')
      .eq('workout_exercises.workouts.user_id', userId),
  ])

  if (countErr) {
    console.error('Failed to count workouts:', countErr.message)
    throw new DatabaseError('Failed to count workouts', countErr)
  }

  let totalVolume = 0
  if (setsData && !setsErr) {
    totalVolume = setsData.reduce((acc, set: any) => acc + setVolumeFromRow(set), 0)
  }

  return { totalWorkouts: count || 0, totalVolume }
})

export const getVolumeHistory = cache(async (
  userId: string,
  weeks = 8,
): Promise<{ date: string; volume: number }[]> => {
  const supabase = await getSupabaseServer()

  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      completed_at,
      workout_exercises!inner(exercise:exercises(name), workouts!inner(user_id, bodyweight_kg))
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .gte('completed_at', since.toISOString())
    .order('completed_at', { ascending: true })

  if (error) throw new DatabaseError('Failed to fetch volume history', error)
  if (!data) return []

  const volumeByDate = data.reduce((acc: Record<string, number>, set: any) => {
    if (!set.completed_at) return acc
    const date = new Date(set.completed_at).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + setVolumeFromRow(set)
    return acc
  }, {})

  return Object.entries(volumeByDate).map(([date, volume]) => ({ date, volume }))
})

export const getExercise1RMHistory = cache(async (
  userId: string,
  exerciseId: string,
): Promise<{ date: string; value: number }[]> => {
  const supabase = await getSupabaseServer()

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      completed_at,
      workout_exercises!inner(exercise_id, workouts!inner(user_id))
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .eq('workout_exercises.exercise_id', exerciseId)
    .order('completed_at', { ascending: true })

  if (error) throw new DatabaseError('Failed to fetch 1RM history', error)
  if (!data) return []

  const best1RMByDate = data.reduce((acc: Record<string, number>, set) => {
    if (!set.completed_at) return acc
    const date = new Date(set.completed_at).toISOString().split('T')[0]
    const e1rm = calculate1RM(set.weight_kg || 0, set.reps || 0)
    if (!acc[date] || e1rm > acc[date]) acc[date] = e1rm
    return acc
  }, {})

  return Object.entries(best1RMByDate).map(([date, value]) => ({ date, value }))
})

export const getWorkoutById = cache(async (workoutId: string, userId: string) => {
  const supabase = await getSupabaseServer()

  const { data, error } = await supabase
    .from('workouts')
    .select(`
      id,
      user_id,
      title,
      started_at,
      completed_at,
      duration_seconds,
      notes,
      bodyweight_kg,
      workout_exercises (
        id,
        exercise_id,
        order_index,
        exercise:exercises ( id, name, muscle_group, secondary_muscles, equipment ),
        sets (
          id,
          set_number,
          weight_kg,
          reps,
          rpe,
          is_warmup
        )
      )
    `)
    .order('order_index', { foreignTable: 'workout_exercises', ascending: true })
    .order('set_number', { foreignTable: 'workout_exercises.sets', ascending: true })
    .eq('id', workoutId)
    .single()

  if (error) {
    console.error('Failed to fetch workout details:', error.message)
    throw new DatabaseError('Failed to fetch workout details', error)
  }

  return data
})

// ── Write functions ───────────────────────────────────────────────────────────

export interface SavedSetForPR {
  id: string
  exerciseId: string
  exerciseName: string
  weight_kg: number
  reps: number
  is_warmup: boolean
  set_number: number
}

export function isDeletedRoutineError(error: { code?: string; message: string }): boolean {
  return error.code === '23503' && error.message.includes('routine_id')
}

export async function saveActiveWorkout(userId: string, workout: FinishPayload) {
  const supabase = await getSupabaseServer()

  // workout.started_at is a Date in the active-workout store; the DB column
  // is a timestamptz expecting an ISO string. Normalise here, in one place,
  // so the rest of the function can share the same value.
  const startedAtIso = workout.started_at instanceof Date
    ? workout.started_at.toISOString()
    : new Date(workout.started_at).toISOString()

  const workoutRow = {
    user_id: userId,
    title: workout.title,
    started_at: startedAtIso,
    completed_at: new Date().toISOString(),
    bodyweight_kg: workout.bodyweight_kg ?? null,
    routine_id: workout.routine_id ?? null,
    duration_seconds: Math.floor(
      (Date.now() - new Date(startedAtIso).getTime()) / 1000,
    ),
  }
  const insertWorkout = (row: typeof workoutRow) =>
    supabase.from('workouts').insert(row).select().single()

  let { data: workoutData, error: workoutErr } = await insertWorkout(workoutRow)
  // The routine was deleted mid-session: keep the workout, drop the link.
  if (workoutErr && isDeletedRoutineError(workoutErr)) {
    ;({ data: workoutData, error: workoutErr } = await insertWorkout({ ...workoutRow, routine_id: null }))
  }

  if (workoutErr || !workoutData) throw new DatabaseError('Failed to create workout record', workoutErr)

  const savedSets: SavedSetForPR[] = []

  for (const [exerciseIndex, ex] of workout.exercises.entries()) {
    const { data: weData, error: weErr } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id:      workoutData.id,
        exercise_id:     ex.exercise.id,
        order_index:     exerciseIndex,
        superset_group:  ex.superset_group ?? null,
      })
      .select()
      .single()

    if (weErr) throw new DatabaseError('Failed to create workout exercise', weErr)

    const completedSets = ex.sets.filter(s => s.completed)
    if (completedSets.length > 0) {
      const { data: setsData, error: setsErr } = await supabase
        .from('sets')
        .insert(
          completedSets.map((s, setIndex: number) => ({
            workout_exercise_id: weData.id,
            set_number: setIndex + 1,
            weight_kg: s.weight_kg,
            reps: s.reps,
            rpe: s.rpe,
            is_warmup: s.is_warmup,
            completed_at: new Date().toISOString(),
          })),
        )
        .select('id, weight_kg, reps, is_warmup, set_number')

      if (setsErr) throw new DatabaseError('Failed to insert sets', setsErr)

      for (const dbSet of setsData ?? []) {
        savedSets.push({
          id: dbSet.id,
          exerciseId: ex.exercise.id,
          exerciseName: ex.exercise.name,
          weight_kg: dbSet.weight_kg,
          reps: dbSet.reps,
          // Column is nullable; treat null as false (the default for working sets).
          is_warmup: dbSet.is_warmup ?? false,
          set_number: dbSet.set_number,
        })
      }
    }
  }

  return { workout: workoutData, savedSets }
}

export async function deleteWorkout(workoutId: string, userId: string): Promise<void> {
  const supabase = await getSupabaseServer()

  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to delete workout:', error.message)
    throw new DatabaseError('Failed to delete workout', error)
  }
}
