'use server'

import { auth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { bustWorkoutDetail, bustAfterWorkout } from '@/lib/cache'

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

  bustWorkoutDetail(userId, workoutId)
  revalidatePath(`/workout/${workoutId}`)
  revalidatePath('/dashboard')
  revalidatePath('/progress')
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

  const { error } = await supabase
    .from('sets')
    .update({ weight_kg, reps })
    .eq('id', setId)

  if (error) throw new Error(error.message)

  // Updating a set may shift PRs and insight metrics
  bustAfterWorkout(userId)
  revalidatePath('/dashboard')
  revalidatePath('/progress')
}

export async function deleteHistoricalExerciseAction(workoutExerciseId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const userId   = session.user.id
  const supabase = await getSupabaseServer()

  const { error } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('id', workoutExerciseId)

  if (error) throw new Error(error.message)

  bustAfterWorkout(userId)
  revalidatePath('/dashboard')
  revalidatePath('/progress')
}
