import { cache } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import type { Exercise } from '@/types/database'

export const getExercises = cache(async (): Promise<Exercise[]> => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, secondary_muscles, equipment, movement_pattern, is_custom, created_by, created_at, youtube_video_id')
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch exercises:', error)
    return []
  }
  return data
})

export const getExerciseById = cache(async (id: string): Promise<Exercise | null> => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, secondary_muscles, equipment, movement_pattern, is_custom, created_by, created_at, youtube_video_id')
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

// ── Write functions (never cached) ───────────────────────────────────────────

export interface CustomExerciseInput {
  name: string
  muscle_group: string
  secondary_muscles: string[]
  movement_pattern: string
  equipment: string | null
}

// The single insert for lifter-made exercises, shared by the exercise modal
// and the coach's Confirm so both create them the same way.
export async function insertCustomExercise(userId: string, input: CustomExerciseInput): Promise<{ id: string }> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name:              input.name.trim(),
      muscle_group:      input.muscle_group,
      secondary_muscles: input.secondary_muscles.length > 0 ? input.secondary_muscles : null,
      movement_pattern:  input.movement_pattern,
      equipment:         input.equipment || null,
      is_custom:         true,
      created_by:        userId,
    })
    .select('id')
    .single()

  if (error) throw new DatabaseError(`Failed to create exercise: ${error.message}`, error)
  return { id: data.id }
}

// Owner-scoped so it can only ever remove the caller's own custom exercises.
export async function deleteCustomExercise(exerciseId: string, userId: string): Promise<void> {
  const supabase = await getSupabaseServer()
  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', exerciseId)
    .eq('created_by', userId)
    .eq('is_custom', true)

  if (error) throw new DatabaseError(`Failed to delete exercise: ${error.message}`, error)
}
