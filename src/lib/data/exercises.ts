import { unstable_cache } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase/server'
import { TAGS } from '@/lib/cache'
import type { Exercise } from '@/types/database'

// Global exercise list — shared across all users, busted only when an
// exercise is created or its metadata is updated.
export const getExercises = unstable_cache(
  async (): Promise<Exercise[]> => {
    const supabase = await getSupabaseServer()
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to fetch exercises:', error)
      return []
    }
    return data
  },
  ['exercises'],
  { revalidate: false, tags: [TAGS.exercises()] },
)

export const getExerciseById = async (id: string): Promise<Exercise | null> => {
  return unstable_cache(
    async (exerciseId: string): Promise<Exercise | null> => {
      const supabase = await getSupabaseServer()
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single()

      if (error) {
        console.error(`Failed to fetch exercise ${exerciseId}:`, error)
        return null
      }
      return data
    },
    [`exercise-${id}`],
    { revalidate: false, tags: [TAGS.exercises()] },
  )(id)
}

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
