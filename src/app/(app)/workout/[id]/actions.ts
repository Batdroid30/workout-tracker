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

  const supabase = await getSupabaseServer()

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

  const supabase = await getSupabaseServer()

  const { error } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('id', workoutExerciseId)

  if (error) throw new Error(error.message)

  revalidateAll()
}
