import { cache } from 'react'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import type { ActiveWorkout, PRType } from '@/types/database'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchPRSetMap(supabase: any, uid: string): Promise<Map<string, PRType[]>> {
  const { data } = await supabase
    .from('personal_records')
    .select('set_id, pr_type')
    .eq('user_id', uid)
    .not('set_id', 'is', null)
  const map = new Map<string, PRType[]>()
  data?.forEach((pr: { set_id: string; pr_type: PRType }) => {
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

export const getRecentWorkouts = cache(async (userId: string) => {
  const supabase = getSupabaseAdmin()

  const [{ data, error }, prSetMap] = await Promise.all([
    supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          exercise:exercises ( name ),
          sets ( id, weight_kg, reps )
        )
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(5),
    fetchPRSetMap(supabase, userId),
  ])

  if (error) {
    console.error('Failed to fetch recent workouts:', error.message)
    throw new DatabaseError('Failed to fetch recent workouts', error)
  }

  return attachPRTypes(data, prSetMap)
})

const HISTORY_LIMIT = 200

export const getAllWorkouts = cache(async (userId: string) => {
  const supabase = getSupabaseAdmin()

  const [{ data, error }, prSetMap] = await Promise.all([
    supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          exercise:exercises ( name ),
          sets ( id, weight_kg, reps )
        )
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    fetchPRSetMap(supabase, userId),
  ])

  if (error) {
    console.error('Failed to fetch workout history:', error.message)
    throw new DatabaseError('Failed to fetch workout history', error)
  }

  return attachPRTypes(data, prSetMap)
})

export const getWorkoutsSummary = cache(async (userId: string) => {
  const supabase = getSupabaseAdmin()

  const { count, error: countErr } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countErr) {
    console.error('Failed to count workouts:', countErr.message)
    throw new DatabaseError('Failed to count workouts', countErr)
  }

  const { data: setsData, error: setsErr } = await supabase
    .from('sets')
    .select('weight_kg, reps, workout_exercises!inner(workouts!inner(user_id))')
    .eq('workout_exercises.workouts.user_id', userId)

  let totalVolume = 0
  if (setsData && !setsErr) {
    totalVolume = setsData.reduce(
      (acc, set) => acc + ((set.weight_kg || 0) * (set.reps || 0)),
      0,
    )
  }

  return { totalWorkouts: count || 0, totalVolume }
})

export const getVolumeHistory = cache(async (
  userId: string,
  weeks = 8,
): Promise<{ date: string; volume: number }[]> => {
  const supabase = getSupabaseAdmin()

  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      completed_at,
      workout_exercises!inner(workouts!inner(user_id))
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .gte('completed_at', since.toISOString())
    .order('completed_at', { ascending: true })

  if (error) throw new DatabaseError('Failed to fetch volume history', error)
  if (!data) return []

  const volumeByDate = data.reduce((acc: Record<string, number>, set) => {
    const date = new Date(set.completed_at).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + (set.weight_kg || 0) * (set.reps || 0)
    return acc
  }, {})

  return Object.entries(volumeByDate).map(([date, volume]) => ({ date, volume }))
})

export const getExercise1RMHistory = cache(async (
  userId: string,
  exerciseId: string,
): Promise<{ date: string; value: number }[]> => {
  const supabase = getSupabaseAdmin()

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
    const date = new Date(set.completed_at).toISOString().split('T')[0]
    const e1rm = (set.weight_kg || 0) * (1 + (set.reps || 0) / 30)
    if (!acc[date] || e1rm > acc[date]) acc[date] = e1rm
    return acc
  }, {})

  return Object.entries(best1RMByDate).map(([date, value]) => ({ date, value }))
})

export const getWorkoutById = cache(async (workoutId: string, userId: string) => {
  const supabase = getSupabaseAdmin()

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
      workout_exercises (
        id,
        exercise_id,
        order_index,
        exercise:exercises ( id, name, muscle_group ),
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

export async function saveActiveWorkout(userId: string, workout: ActiveWorkout) {
  const supabase = getSupabaseAdmin()

  const { data: workoutData, error: workoutErr } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      title: workout.title,
      started_at: workout.started_at,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.floor(
        (new Date().getTime() - new Date(workout.started_at).getTime()) / 1000,
      ),
    })
    .select()
    .single()

  if (workoutErr) throw new DatabaseError('Failed to create workout record', workoutErr)

  const savedSets: SavedSetForPR[] = []

  for (const [exerciseIndex, ex] of workout.exercises.entries()) {
    const { data: weData, error: weErr } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: workoutData.id,
        exercise_id: ex.exercise.id,
        order_index: exerciseIndex,
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
          is_warmup: dbSet.is_warmup,
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
