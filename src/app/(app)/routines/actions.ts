'use server'

import { auth } from '@/lib/auth'
import { createRoutine, CreateRoutineInput } from '@/lib/data/routines'
import { revalidatePath } from 'next/cache'

export async function createRoutineAction(input: CreateRoutineInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const routine = await createRoutine(session.user.id, input)
  
  revalidatePath('/routines')
  revalidatePath('/dashboard')
  
  return routine
}

export async function deleteRoutineAction(routineId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const { deleteRoutine } = await import('@/lib/data/routines')
  await deleteRoutine(routineId, session.user.id)
  
  revalidatePath('/routines')
  revalidatePath('/dashboard')
}

export async function updateRoutineExercisesAction(routineId: string, exercises: any[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const { getSupabaseServer } = await import('@/lib/supabase/server')
  const supabase = await getSupabaseServer()

  // First delete existing exercises for this routine
  const { error: delError } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('routine_id', routineId)

  if (delError) throw new Error(delError.message)

  // Now insert the new ones
  const newExercises = exercises.map((ex, index) => ({
    routine_id: routineId,
    exercise_id: ex.exercise.id,
    order_index: index,
    target_sets: ex.sets.length || 3, // Fallback to 3 if no sets? It should have sets.
    target_reps: ex.sets[0]?.reps || 10 // Fallback to first set reps or 10
  }))

  if (newExercises.length > 0) {
    const { error: insError } = await supabase
      .from('routine_exercises')
      .insert(newExercises)

    if (insError) throw new Error(insError.message)
  }

  revalidatePath('/routines')
}

export async function updateRoutineDetailsAction(routineId: string, input: CreateRoutineInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const { updateRoutine } = await import('@/lib/data/routines')
  await updateRoutine(routineId, session.user.id, input)
  
  revalidatePath('/routines')
  revalidatePath('/dashboard')
}
