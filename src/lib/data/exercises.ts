import { getSupabaseServer } from '@/lib/supabase/server'
import { Exercise } from '@/types/database'

export async function getExercises(): Promise<Exercise[]> {
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
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const supabase = await getSupabaseServer()
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
}

export async function getRecentSetsForExercise(exerciseId: string) {
  const supabase = await getSupabaseServer()
  // Join sets with workout_exercises to filter by exerciseId
  // Also order them by latest completed
  const { data, error } = await supabase
    .from('sets')
    .select(`
      *,
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
