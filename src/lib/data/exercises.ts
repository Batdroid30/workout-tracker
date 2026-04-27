import { cache } from 'react'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import type { Exercise } from '@/types/database'

export const getExercises = cache(async (): Promise<Exercise[]> => {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch exercises:', error)
    return []
  }
  return data
})

export const getExerciseById = cache(async (id: string): Promise<Exercise | null> => {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`Failed to fetch exercise ${id}:`, error)
    return null
  }
  return data
})

// Not cached: relies on the user's Supabase session for RLS and is only
// used inside SetLogger (client hook) where SWR handles caching.
export async function getRecentSetsForExercise(exerciseId: string) {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('sets')
    .select(`
      id,
      weight_kg,
      reps,
      completed_at,
      set_number,
      workout_exercises!inner(
        exercise_id,
        workouts ( id, started_at )
      )
    `)
    .eq('workout_exercises.exercise_id', exerciseId)
    .order('completed_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error(`Failed to fetch sets for exercise ${exerciseId}:`, error.message)
    return []
  }
  return data
}
