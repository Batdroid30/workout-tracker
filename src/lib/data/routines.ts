import { cache } from 'react'
import { resolveSupabaseClient } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

// ── Read functions (cached) ───────────────────────────────────────────────────

export const getRoutines = cache(async (userId: string, accessToken?: string, runAsAdmin: boolean = false) => {
  const supabase = await resolveSupabaseClient(accessToken, runAsAdmin)

  const { data, error } = await supabase
    .from('routines')
    .select(`
      *,
      routine_exercises (
        id,
        order_index,
        target_sets,
        target_reps,
        progression_model,
        rep_sum_target,
        exercise:exercises ( id, name, muscle_group )
      )
    `)
    .eq('user_id', userId)
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
})

export const getRoutineById = cache(async (routineId: string, userId: string, accessToken?: string, runAsAdmin: boolean = false) => {
  const supabase = await resolveSupabaseClient(accessToken, runAsAdmin)

  const { data, error } = await supabase
    .from('routines')
    .select(`
      *,
      routine_exercises (
        id,
        order_index,
        target_sets,
        target_reps,
        progression_model,
        rep_sum_target,
        exercise:exercises ( id, name, muscle_group )
      )
    `)
    .eq('id', routineId)
    .single()

  if (error) throw new DatabaseError('Failed to fetch routine', error)

  return {
    ...data,
    routine_exercises: data.routine_exercises?.sort(
      (a: any, b: any) => a.order_index - b.order_index,
    ) ?? [],
  }
})

// ── Write functions (never cached) ───────────────────────────────────────────

export interface CreateRoutineInput {
  title: string
  notes?: string
  exercises: {
    exercise_id: string
    target_sets: number
    target_reps: number
    progression_model?: 'double' | 'rep_sum'
    rep_sum_target?: number | null
  }[]
}

export async function createRoutine(userId: string, input: CreateRoutineInput, accessToken?: string, runAsAdmin: boolean = false) {
  const supabase = await resolveSupabaseClient(accessToken, runAsAdmin)

  const { data: routineData, error: routineErr } = await supabase
    .from('routines')
    .insert({ user_id: userId, title: input.title, notes: input.notes })
    .select()
    .single()

  if (routineErr) throw new DatabaseError('Failed to create routine', routineErr)

  if (input.exercises.length > 0) {
    const routineExercises = input.exercises.map((ex, index) => ({
      routine_id:       routineData.id,
      exercise_id:      ex.exercise_id,
      order_index:      index,
      target_sets:      ex.target_sets,
      target_reps:      ex.target_reps,
      progression_model: ex.progression_model ?? 'double',
      rep_sum_target:   ex.rep_sum_target ?? null,
    }))

    // Cast needed until Supabase types regenerate after the migration is applied.
    const { error: exercisesErr } = await supabase
      .from('routine_exercises')
      .insert(routineExercises as any)

    if (exercisesErr) throw new DatabaseError('Failed to add routine exercises', exercisesErr)
  }

  return routineData
}

export async function deleteRoutine(routineId: string, userId: string, accessToken?: string, runAsAdmin: boolean = false) {
  const supabase = await resolveSupabaseClient(accessToken, runAsAdmin)

  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', routineId)
    .eq('user_id', userId)

  if (error) throw new DatabaseError('Failed to delete routine', error)
}

export async function updateRoutine(routineId: string, userId: string, input: CreateRoutineInput, accessToken?: string, runAsAdmin: boolean = false) {
  const supabase = await resolveSupabaseClient(accessToken, runAsAdmin)

  const { error: routineErr } = await supabase
    .from('routines')
    .update({ title: input.title, notes: input.notes })
    .eq('id', routineId)
    .eq('user_id', userId)

  if (routineErr) throw new DatabaseError('Failed to update routine', routineErr)

  // Snapshot existing exercises before deleting so we can restore on insert failure.
  const { data: snapshot, error: snapshotErr } = await supabase
    .from('routine_exercises')
    .select('exercise_id, order_index, target_sets, target_reps, progression_model, rep_sum_target')
    .eq('routine_id', routineId)

  if (snapshotErr) throw new DatabaseError('Failed to snapshot routine exercises', snapshotErr)

  const { error: delErr } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('routine_id', routineId)

  if (delErr) throw new DatabaseError('Failed to delete old routine exercises', delErr)

  if (input.exercises.length > 0) {
    const routineExercises = input.exercises.map((ex, index) => ({
      routine_id:        routineId,
      exercise_id:       ex.exercise_id,
      order_index:       index,
      target_sets:       ex.target_sets,
      target_reps:       ex.target_reps,
      progression_model: ex.progression_model ?? 'double',
      rep_sum_target:    ex.rep_sum_target ?? null,
    }))

    // Cast needed until Supabase types regenerate after the migration is applied.
    const { error: exercisesErr } = await supabase
      .from('routine_exercises')
      .insert(routineExercises as any)

    if (exercisesErr) {
      // Insert failed — restore the snapshot to avoid leaving the routine with no exercises.
      if (snapshot && snapshot.length > 0) {
        const restoreRows = (snapshot as any[]).map(r => ({ ...r, routine_id: routineId }))
        await supabase.from('routine_exercises').insert(restoreRows as any)
      }
      throw new DatabaseError('Failed to add new routine exercises — previous exercises restored', exercisesErr)
    }
  }
}
