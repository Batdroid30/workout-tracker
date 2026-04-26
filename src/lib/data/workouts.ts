import { unstable_cache } from 'next/cache'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { TAGS } from '@/lib/cache'
import type { ActiveWorkout } from '@/types/database'

// ── Read functions (cached) ───────────────────────────────────────────────────

export const getRecentWorkouts = async (userId: string) => {
  return unstable_cache(
    async (uid: string) => {
      const supabase = getSupabaseAdmin()

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            exercise:exercises ( name ),
            sets ( id, weight_kg, reps )
          )
        `)
        .eq('user_id', uid)
        .order('started_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Failed to fetch recent workouts:', error.message)
        throw new DatabaseError('Failed to fetch recent workouts', error)
      }

      const allSetIds = data.flatMap((w: any) =>
        w.workout_exercises.flatMap((we: any) => we.sets.map((s: any) => s.id))
      )

      let prsBySetId: Record<string, number> = {}
      if (allSetIds.length > 0) {
        const { data: prs } = await supabase
          .from('personal_records')
          .select('set_id')
          .in('set_id', allSetIds)
        prs?.forEach((pr: any) => {
          if (pr.set_id) prsBySetId[pr.set_id] = (prsBySetId[pr.set_id] || 0) + 1
        })
      }

      return data.map((workout: any) => {
        const setIds = workout.workout_exercises.flatMap((we: any) => we.sets.map((s: any) => s.id))
        const prCount = setIds.reduce((sum: number, sid: string) => sum + (prsBySetId[sid] || 0), 0)
        return { ...workout, prCount }
      })
    },
    [`recent-workouts`, userId],
    { revalidate: false, tags: [TAGS.workouts(userId)] },
  )(userId)
}

export const getAllWorkouts = async (userId: string) => {
  return unstable_cache(
    async (uid: string) => {
      const supabase = getSupabaseAdmin()

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            exercise:exercises ( name ),
            sets ( id, weight_kg, reps )
          )
        `)
        .eq('user_id', uid)
        .order('started_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch workout history:', error.message)
        throw new DatabaseError('Failed to fetch workout history', error)
      }

      const allSetIds = data.flatMap((w: any) =>
        w.workout_exercises.flatMap((we: any) => we.sets.map((s: any) => s.id))
      )

      let prsBySetId: Record<string, number> = {}
      if (allSetIds.length > 0) {
        const { data: prs } = await supabase
          .from('personal_records')
          .select('set_id')
          .in('set_id', allSetIds)
        prs?.forEach((pr: any) => {
          if (pr.set_id) prsBySetId[pr.set_id] = (prsBySetId[pr.set_id] || 0) + 1
        })
      }

      return data.map((workout: any) => {
        const setIds = workout.workout_exercises.flatMap((we: any) => we.sets.map((s: any) => s.id))
        const prCount = setIds.reduce((sum: number, sid: string) => sum + (prsBySetId[sid] || 0), 0)
        return { ...workout, prCount }
      })
    },
    [`all-workouts`, userId],
    { revalidate: false, tags: [TAGS.workouts(userId)] },
  )(userId)
}

export const getWorkoutsSummary = async (userId: string) => {
  return unstable_cache(
    async (uid: string) => {
      const supabase = getSupabaseAdmin()

      const { count, error: countErr } = await supabase
        .from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)

      if (countErr) {
        console.error('Failed to count workouts:', countErr.message)
        throw new DatabaseError('Failed to count workouts', countErr)
      }

      const { data: setsData, error: setsErr } = await supabase
        .from('sets')
        .select('weight_kg, reps, workout_exercises!inner(workouts!inner(user_id))')
        .eq('workout_exercises.workouts.user_id', uid)

      let totalVolume = 0
      if (setsData && !setsErr) {
        totalVolume = setsData.reduce(
          (acc, set) => acc + ((set.weight_kg || 0) * (set.reps || 0)),
          0,
        )
      }

      return { totalWorkouts: count || 0, totalVolume }
    },
    [`workouts-summary`, userId],
    { revalidate: false, tags: [TAGS.workouts(userId)] },
  )(userId)
}

export const getVolumeHistory = async (
  userId: string,
  weeks = 8,
): Promise<{ date: string; volume: number }[]> => {
  return unstable_cache(
    async (uid: string, w: number) => {
      const supabase = getSupabaseAdmin()

      const since = new Date()
      since.setDate(since.getDate() - w * 7)

      const { data, error } = await supabase
        .from('sets')
        .select(`
          weight_kg,
          reps,
          completed_at,
          workout_exercises!inner(workouts!inner(user_id))
        `)
        .eq('workout_exercises.workouts.user_id', uid)
        .gte('completed_at', since.toISOString())
        .order('completed_at', { ascending: true })

      if (error) throw new DatabaseError('Failed to fetch volume history', error)
      if (!data) return []

      const volumeByDate = data.reduce((acc: Record<string, number>, set) => {
        const date = new Date(set.completed_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + (set.weight_kg || 0) * (set.reps || 0)
        return acc
      }, {})

      return Object.entries(volumeByDate).map(([date, volume]) => ({ date, volume }))
    },
    [`volume-history`, userId, String(weeks)],
    { revalidate: false, tags: [TAGS.workouts(userId)] },
  )(userId, weeks)
}

export const getExercise1RMHistory = async (
  userId: string,
  exerciseId: string,
): Promise<{ date: string; value: number }[]> => {
  return unstable_cache(
    async (uid: string, exId: string) => {
      const supabase = getSupabaseAdmin()

      const { data, error } = await supabase
        .from('sets')
        .select(`
          weight_kg,
          reps,
          completed_at,
          workout_exercises!inner(exercise_id, workouts!inner(user_id))
        `)
        .eq('workout_exercises.workouts.user_id', uid)
        .eq('workout_exercises.exercise_id', exId)
        .order('completed_at', { ascending: true })

      if (error) throw new DatabaseError('Failed to fetch 1RM history', error)
      if (!data) return []

      const best1RMByDate = data.reduce((acc: Record<string, number>, set) => {
        const date = new Date(set.completed_at).toISOString().split('T')[0]
        const e1rm = (set.weight_kg || 0) * (1 + (set.reps || 0) / 30)
        if (!acc[date] || e1rm > acc[date]) acc[date] = e1rm
        return acc
      }, {})

      return Object.entries(best1RMByDate).map(([date, value]) => ({ date, value }))
    },
    [`exercise-1rm`, userId, exerciseId],
    { revalidate: false, tags: [TAGS.workouts(userId)] },
  )(userId, exerciseId)
}

export const getWorkoutById = async (workoutId: string, userId: string) => {
  return unstable_cache(
    async (wId: string) => {
      const supabase = getSupabaseAdmin()

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          user_id,
          title,
          started_at,
          completed_at,
          duration_seconds,
          notes,
          workout_exercises (
            id,
            exercise_id,
            order_index,
            exercise:exercises ( id, name, muscle_group ),
            sets (
              id,
              set_number,
              weight_kg,
              reps,
              rpe,
              is_warmup
            )
          )
        `)
        .order('order_index', { foreignTable: 'workout_exercises', ascending: true })
        .order('set_number', { foreignTable: 'workout_exercises.sets', ascending: true })
        .eq('id', wId)
        .single()

      if (error) {
        console.error('Failed to fetch workout details:', error.message)
        throw new DatabaseError('Failed to fetch workout details', error)
      }

      return data
    },
    [`workout-detail`, workoutId],
    { revalidate: false, tags: [TAGS.workoutDetail(workoutId), TAGS.workouts(userId)] },
  )(workoutId)
}

// ── Write functions (never cached) ────────────────────────────────────────────

export async function saveActiveWorkout(userId: string, workout: ActiveWorkout) {
  const supabase = await getSupabaseServer()

  const { data: workoutData, error: workoutErr } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      title: workout.title,
      started_at: workout.started_at,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.floor(
        (new Date().getTime() - new Date(workout.started_at).getTime()) / 1000,
      ),
    })
    .select()
    .single()

  if (workoutErr) throw new DatabaseError('Failed to create workout record', workoutErr)

  for (const [exerciseIndex, ex] of workout.exercises.entries()) {
    const { data: weData, error: weErr } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: workoutData.id,
        exercise_id: ex.exercise.id,
        order_index: exerciseIndex,
      })
      .select()
      .single()

    if (weErr) throw new DatabaseError('Failed to create workout exercise', weErr)

    const completedSets = ex.sets.filter(s => s.completed)
    if (completedSets.length > 0) {
      const { error: setsErr } = await supabase.from('sets').insert(
        completedSets.map((s, setIndex: number) => ({
          workout_exercise_id: weData.id,
          set_number: setIndex + 1,
          weight_kg: s.weight_kg,
          reps: s.reps,
          rpe: s.rpe,
          is_warmup: s.is_warmup,
          completed_at: new Date().toISOString(),
        })),
      )

      if (setsErr) throw new DatabaseError('Failed to insert sets', setsErr)
    }
  }

  return workoutData
}

export async function deleteWorkout(workoutId: string, userId: string): Promise<void> {
  const supabase = await getSupabaseServer()

  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to delete workout:', error.message)
    throw new DatabaseError('Failed to delete workout', error)
  }
}
