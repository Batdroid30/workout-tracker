'use client'

import useSWR from 'swr'
import { getSupabaseClient } from '@/lib/supabase/client'

const fetchHistory = async (exerciseId: string) => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      workout_exercises!inner(
        exercise_id,
        workouts ( id, started_at )
      )
    `)
    .eq('workout_exercises.exercise_id', exerciseId)
    .order('completed_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data ?? []
}

/**
 * Returns the 10 most recent sets for an exercise with SWR caching.
 *
 * Cache key is `exercise-history-{exerciseId}` — different exercises get
 * different entries. Results are kept in memory for the session and only
 * re-fetched when the exerciseId changes.
 */
export function useExerciseHistory(exerciseId: string) {
  const { data, isLoading } = useSWR(
    exerciseId ? `exercise-history-${exerciseId}` : null,
    () => fetchHistory(exerciseId),
    { revalidateOnFocus: false },
  )

  return {
    history: data ?? [],
    loading: isLoading,
  }
}
