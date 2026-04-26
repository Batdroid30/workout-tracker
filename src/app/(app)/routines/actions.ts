'use server'

import { auth } from '@/lib/auth'
import { createRoutine, deleteRoutine, updateRoutine, CreateRoutineInput } from '@/lib/data/routines'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { bustRoutines } from '@/lib/cache'

export async function createRoutineAction(input: CreateRoutineInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const userId  = session.user.id
  const routine = await createRoutine(userId, input)

  bustRoutines(userId)
  revalidatePath('/routines')
  revalidatePath('/dashboard')

  return routine
}

export async function deleteRoutineAction(routineId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const userId = session.user.id
  await deleteRoutine(routineId, userId)

  bustRoutines(userId, routineId)
  revalidatePath('/routines')
  revalidatePath('/dashboard')
}

export async function updateRoutineExercisesAction(routineId: string, exercises: any[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const userId   = session.user.id
  const supabase = await getSupabaseServer()

  const { error: delError } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('routine_id', routineId)

  if (delError) throw new Error(delError.message)

  const newExercises = exercises.map((ex, index) => ({
    routine_id:   routineId,
    exercise_id:  ex.exercise.id,
    order_index:  index,
    target_sets:  ex.sets.length || 3,
    target_reps:  ex.sets[0]?.reps || 10,
  }))

  if (newExercises.length > 0) {
    const { error: insError } = await supabase.from('routine_exercises').insert(newExercises)
    if (insError) throw new Error(insError.message)
  }

  bustRoutines(userId, routineId)
  revalidatePath('/routines')
}

export async function updateRoutineDetailsAction(routineId: string, input: CreateRoutineInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const userId = session.user.id
  await updateRoutine(routineId, userId, input)

  bustRoutines(userId, routineId)
  revalidatePath('/routines')
  revalidatePath('/dashboard')
}
