import { unstable_cache } from 'next/cache'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { TAGS } from '@/lib/cache'

// ── Read functions (cached) ───────────────────────────────────────────────────

export const getRoutines = async (userId: string) => {
  return unstable_cache(
    async (uid: string) => {
      const supabase = getSupabaseAdmin()

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
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch routines:', error.message)
        throw new DatabaseError('Failed to fetch routines', error)
      }

      return (data ?? []).map(routine => ({
        ...routine,
        routine_exercises: routine.routine_exercises?.sort(
          (a: any, b: any) => a.order_index - b.order_index,
        ) ?? [],
      }))
    },
    [`routines`, userId],
    { revalidate: false, tags: [TAGS.routines(userId)] },
  )(userId)
}

export const getRoutineById = async (routineId: string, userId: string) => {
  return unstable_cache(
    async (rId: string) => {
      const supabase = getSupabaseAdmin()

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
        .eq('id', rId)
        .single()

      if (error) throw new DatabaseError('Failed to fetch routine', error)

      return {
        ...data,
        routine_exercises: data.routine_exercises?.sort(
          (a: any, b: any) => a.order_index - b.order_index,
        ) ?? [],
      }
    },
    [`routine-detail`, routineId],
    { revalidate: false, tags: [TAGS.routineDetail(routineId), TAGS.routines(userId)] },
  )(routineId)
}

// ── Write functions (never cached) ───────────────────────────────────────────

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

  const { data: routineData, error: routineErr } = await supabase
    .from('routines')
    .insert({ user_id: userId, title: input.title, notes: input.notes })
    .select()
    .single()

  if (routineErr) throw new DatabaseError('Failed to create routine', routineErr)

  if (input.exercises.length > 0) {
    const routineExercises = input.exercises.map((ex, index) => ({
      routine_id: routineData.id,
      exercise_id: ex.exercise_id,
      order_index: index,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
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

export async function updateRoutine(routineId: string, userId: string, input: CreateRoutineInput) {
  const supabase = await getSupabaseServer()

  const { error: routineErr } = await supabase
    .from('routines')
    .update({ title: input.title, notes: input.notes })
    .eq('id', routineId)
    .eq('user_id', userId)

  if (routineErr) throw new DatabaseError('Failed to update routine', routineErr)

  const { error: delErr } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('routine_id', routineId)

  if (delErr) throw new DatabaseError('Failed to delete old routine exercises', delErr)

  if (input.exercises.length > 0) {
    const routineExercises = input.exercises.map((ex, index) => ({
      routine_id: routineId,
      exercise_id: ex.exercise_id,
      order_index: index,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
    }))

    const { error: exercisesErr } = await supabase
      .from('routine_exercises')
      .insert(routineExercises)

    if (exercisesErr) throw new DatabaseError('Failed to add new routine exercises', exercisesErr)
  }
}
