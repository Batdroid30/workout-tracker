'use server'

import { requireAuth } from '@/lib/auth'
import { createRoutine, deleteRoutine, updateRoutine, CreateRoutineInput } from '@/lib/data/routines'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { revalidateAll } from '@/lib/cache'

export async function createRoutineAction(input: CreateRoutineInput) {
  const { userId, session } = await requireAuth()
  const routine = await createRoutine(userId, input)

  revalidateAll()

  return routine
}

export async function deleteRoutineAction(routineId: string) {
  const { userId, session } = await requireAuth()
  await deleteRoutine(routineId, userId)

  revalidateAll()
}

export async function updateRoutineExercisesAction(routineId: string, exercises: any[]) {
  const { userId, session } = await requireAuth()
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

  revalidateAll()
}

export async function updateRoutineDetailsAction(routineId: string, input: CreateRoutineInput) {
  const { userId, session } = await requireAuth()
  await updateRoutine(routineId, userId, input)

  revalidateAll()
}
