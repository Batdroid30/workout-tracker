import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

export async function getRoutines(userId: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('routines')
    .select(`
      *,
      routine_exercises (
        id,
        order_index,
        target_sets,
        target_reps,
        exercise:exercises ( id, name, muscle_group )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch routines:', error.message)
    throw new DatabaseError('Failed to fetch routines', error)
  }
  
  // Sort the nested exercises by order_index manually since supabase foreign table ordering can sometimes be tricky
  const sortedData = data?.map(routine => ({
    ...routine,
    routine_exercises: routine.routine_exercises?.sort((a: any, b: any) => a.order_index - b.order_index) || []
  })) || []

  return sortedData
}

export interface CreateRoutineInput {
  title: string
  notes?: string
  exercises: {
    exercise_id: string
    target_sets: number
    target_reps: number
  }[]
}

export async function createRoutine(userId: string, input: CreateRoutineInput) {
  const supabase = await getSupabaseServer()
  
  // 1. Create routine
  const { data: routineData, error: routineErr } = await supabase
    .from('routines')
    .insert({
      user_id: userId,
      title: input.title,
      notes: input.notes
    })
    .select()
    .single()

  if (routineErr) throw new DatabaseError('Failed to create routine', routineErr)

  // 2. Create routine exercises
  if (input.exercises.length > 0) {
    const routineExercises = input.exercises.map((ex, index) => ({
      routine_id: routineData.id,
      exercise_id: ex.exercise_id,
      order_index: index,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps
    }))

    const { error: exercisesErr } = await supabase
      .from('routine_exercises')
      .insert(routineExercises)

    if (exercisesErr) throw new DatabaseError('Failed to add routine exercises', exercisesErr)
  }

  return routineData
}

export async function deleteRoutine(routineId: string, userId: string) {
  const supabase = await getSupabaseServer()
  
  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', routineId)
    .eq('user_id', userId)

  if (error) throw new DatabaseError('Failed to delete routine', error)
}

export async function getRoutineById(routineId: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('routines')
    .select(`
      *,
      routine_exercises (
        id,
        order_index,
        target_sets,
        target_reps,
        exercise:exercises ( id, name, muscle_group )
      )
    `)
    .eq('id', routineId)
    .single()

  if (error) throw new DatabaseError('Failed to fetch routine', error)
  
  // Sort the nested exercises by order_index
  const sortedData = {
    ...data,
    routine_exercises: data.routine_exercises?.sort((a: any, b: any) => a.order_index - b.order_index) || []
  }

  return sortedData
}

export async function updateRoutine(routineId: string, userId: string, input: CreateRoutineInput) {
  const supabase = await getSupabaseServer()
  
  // 1. Update routine title and notes
  const { error: routineErr } = await supabase
    .from('routines')
    .update({
      title: input.title,
      notes: input.notes
    })
    .eq('id', routineId)
    .eq('user_id', userId)

  if (routineErr) throw new DatabaseError('Failed to update routine', routineErr)

  // 2. Delete existing routine_exercises
  const { error: delErr } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('routine_id', routineId)

  if (delErr) throw new DatabaseError('Failed to delete old routine exercises', delErr)

  // 3. Create new routine_exercises
  if (input.exercises.length > 0) {
    const routineExercises = input.exercises.map((ex, index) => ({
      routine_id: routineId,
      exercise_id: ex.exercise_id,
      order_index: index,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps
    }))

    const { error: exercisesErr } = await supabase
      .from('routine_exercises')
      .insert(routineExercises)

    if (exercisesErr) throw new DatabaseError('Failed to add new routine exercises', exercisesErr)
  }
}
