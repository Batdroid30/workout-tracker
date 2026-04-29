'use client'

import useSWR from 'swr'
import { getSupabaseClient } from '@/lib/supabase/client'
import { suggestNextSet, type OverloadSuggestion } from '@/lib/algorithms'

export interface LastWorkoutSetInfo {
  weight_kg: number
  reps: number
  /** Progressive-overload suggestion for this set position. */
  suggestion: OverloadSuggestion
}

async function fetchLastWorkoutSets(exerciseId: string): Promise<LastWorkoutSetInfo[]> {
  const supabase = getSupabaseClient()

  // Fetch the 30 most recent completed working sets for this exercise.
  // We over-fetch so we can isolate the most recent workout's sets even if
  // that workout had many sets.
  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      set_number,
      is_warmup,
      completed_at,
      workout_exercises!inner (
        exercise_id,
        workouts!inner ( id, started_at )
      )
    `)
    .eq('workout_exercises.exercise_id', exerciseId)
    .eq('is_warmup', false)
    .gt('weight_kg', 0)
    .gt('reps', 0)
    .order('completed_at', { ascending: false })
    .limit(30)

  if (error || !data || data.length === 0) return []

  // Resolve the workout id from the nested join (Supabase can return either
  // an array or an object depending on the relationship cardinality).
  const resolveWorkoutId = (set: any): string => {
    const we = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
    const w  = Array.isArray(we?.workouts) ? we.workouts[0] : we?.workouts
    return w?.id ?? ''
  }

  // The first row is the most recent completed set — its workout is the one we want.
  const latestWorkoutId = resolveWorkoutId(data[0])
  if (!latestWorkoutId) return []

  // Keep only sets from that workout, then sort by position.
  // Cast to any[] here — the Supabase inferred type becomes too narrow after
  // chained array methods and all fields are accessed as numbers/strings anyway.
  return (data as any[])
    .filter((set: any) => resolveWorkoutId(set) === latestWorkoutId)
    .sort((a: any, b: any) => (a.set_number ?? 0) - (b.set_number ?? 0))
    .map((set: any) => {
      const w = Number(set.weight_kg)
      const r = Number(set.reps)
      return { weight_kg: w, reps: r, suggestion: suggestNextSet({ lastWeight: w, lastReps: r }) }
    })
}

/**
 * Returns the previous workout's sets for a given exercise, indexed by
 * set position (0 = first working set, 1 = second, …).
 *
 * Each entry includes the weight/reps logged last time at that position
 * AND a progressive-overload suggestion for this session.
 *
 * Replaces both `useExerciseHistory` and `useOverloadSuggestion`.
 */
export function useLastWorkoutSets(exerciseId: string) {
  const { data, isLoading } = useSWR(
    exerciseId ? `last-workout-sets-${exerciseId}` : null,
    () => fetchLastWorkoutSets(exerciseId),
    { revalidateOnFocus: false },
  )

  return { sets: data ?? [], isLoading }
}
