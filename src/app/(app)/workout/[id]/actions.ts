'use server'

import { auth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidateAll } from '@/lib/cache'

export async function updateWorkoutMetaAction(
  workoutId: string,
  title: string,
  duration_seconds: number | null,
  notes: string | null,
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const userId   = session.user.id
  const supabase = await getSupabaseServer()

  const { error } = await supabase
    .from('workouts')
    .update({ title, duration_seconds, notes })
    .eq('id', workoutId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  revalidateAll()
}

export async function updateHistoricalSetAction(
  setId: string,
  weight_kg: number,
  reps: number,
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const userId   = session.user.id
  const supabase = await getSupabaseServer()

  // Verify the set belongs to a workout owned by this user before mutating.
  // RLS is the safety net; this is the primary check.
  const { data: owner, error: ownerError } = await supabase
    .from('sets')
    .select('workout_exercises!inner(workouts!inner(user_id))')
    .eq('id', setId)
    .single<{ workout_exercises: { workouts: { user_id: string } } }>()

  if (ownerError || !owner) throw new Error('Set not found')
  if (owner.workout_exercises.workouts.user_id !== userId) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('sets')
    .update({ weight_kg, reps })
    .eq('id', setId)

  if (error) throw new Error(error.message)

  revalidateAll()
}

export async function deleteHistoricalExerciseAction(workoutExerciseId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const userId   = session.user.id
  const supabase = await getSupabaseServer()

  const { data: owner, error: ownerError } = await supabase
    .from('workout_exercises')
    .select('workouts!inner(user_id)')
    .eq('id', workoutExerciseId)
    .single<{ workouts: { user_id: string } }>()

  if (ownerError || !owner) throw new Error('Exercise not found')
  if (owner.workouts.user_id !== userId) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('id', workoutExerciseId)

  if (error) throw new Error(error.message)

  revalidateAll()
}
