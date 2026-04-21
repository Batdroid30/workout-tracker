import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import type { ActiveWorkout } from '@/types/database'

export async function getRecentWorkouts(userId: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_exercises (
        exercise:exercises ( name ),
        sets ( weight_kg, reps )
      )
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Failed to fetch recent workouts:', error.message)
    throw new DatabaseError('Failed to fetch recent workouts', error)
  }
  return data
}

export async function getWorkoutsSummary(userId: string) {
  const supabase = await getSupabaseServer()
  
  // Get total workouts
  const { count, error: countErr } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countErr) {
    console.error('Failed to count workouts:', countErr.message)
    throw new DatabaseError('Failed to count workouts', countErr)
  }
    
  // Get total volume for this user
  // This is a simplified calculation, normally you'd use a view or RPC for large datasets
  const { data: setsData, error: setsErr } = await supabase
    .from('sets')
    .select('weight_kg, reps, workout_exercises!inner(workouts!inner(user_id))')
    .eq('workout_exercises.workouts.user_id', userId)

  let totalVolume = 0
  if (setsData && !setsErr) {
    totalVolume = setsData.reduce((acc, set) => acc + ((set.weight_kg || 0) * (set.reps || 0)), 0)
  }

  return {
    totalWorkouts: count || 0,
    totalVolume
  }
}

export async function getVolumeHistory(userId: string): Promise<{ date: string, volume: number }[]> {
  const supabase = await getSupabaseServer()
  
  // Weekly volume rollup
  // Note: ideally this should be a DB view or function for performance
  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      completed_at,
      workout_exercises!inner(workouts!inner(user_id))
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .order('completed_at', { ascending: true })

  if (error) throw new DatabaseError('Failed to fetch volume history', error)
  if (!data) return []

  // Group by date (simplified to day for now)
  const volumeByDate = data.reduce((acc: Record<string, number>, set) => {
    const date = new Date(set.completed_at).toISOString().split('T')[0]
    const volume = (set.weight_kg || 0) * (set.reps || 0)
    acc[date] = (acc[date] || 0) + volume
    return acc
  }, {})

  return Object.entries(volumeByDate).map(([date, volume]) => ({
    date,
    volume
  }))
}

export async function getExercise1RMHistory(userId: string, exerciseId: string): Promise<{ date: string, value: number }[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      completed_at,
      workout_exercises!inner(exercise_id, workouts!inner(user_id))
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .eq('workout_exercises.exercise_id', exerciseId)
    .order('completed_at', { ascending: true })

  if (error) throw new DatabaseError('Failed to fetch 1RM history', error)
  if (!data) return []

  // Calculate Epley e1RM for each set and take max per day
  const best1RMByDate = data.reduce((acc: Record<string, number>, set) => {
    const date = new Date(set.completed_at).toISOString().split('T')[0]
    const e1rm = (set.weight_kg || 0) * (1 + (set.reps || 0) / 30)
    if (!acc[date] || e1rm > acc[date]) {
      acc[date] = e1rm
    }
    return acc
  }, {})

  return Object.entries(best1RMByDate).map(([date, value]) => ({
    date,
    value
  }))
}
export async function saveActiveWorkout(userId: string, workout: ActiveWorkout) {
  const supabase = await getSupabaseServer()
  
  // 1. Create the workout record
  const { data: workoutData, error: workoutErr } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      title: workout.title,
      started_at: workout.started_at,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.floor((new Date().getTime() - new Date(workout.started_at).getTime()) / 1000)
    })
    .select()
    .single()

  if (workoutErr) throw new DatabaseError('Failed to create workout record', workoutErr)

  // 2. Create workout_exercises and sets
  for (const [exerciseIndex, ex] of workout.exercises.entries()) {
    const { data: weData, error: weErr } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: workoutData.id,
        exercise_id: ex.exercise.id,
        order_index: exerciseIndex
      })
      .select()
      .single()

    if (weErr) throw new DatabaseError('Failed to create workout exercise', weErr)

    // Insert only completed sets (maintain data integrity)
    const completedSets = ex.sets.filter((s) => s.completed)
    if (completedSets.length > 0) {
      const { error: setsErr } = await supabase
        .from('sets')
        .insert(completedSets.map((s, setIndex: number) => ({
          workout_exercise_id: weData.id,
          set_number: setIndex + 1,
          weight_kg: s.weight_kg,
          reps: s.reps,
          rpe: s.rpe,
          is_warmup: s.is_warmup,
          completed_at: new Date().toISOString()
        })))

      if (setsErr) throw new DatabaseError('Failed to insert sets', setsErr)
    }
  }

  return workoutData
}

export async function getWorkoutById(workoutId: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      id,
      user_id,
      title,
      started_at,
      completed_at,
      duration_seconds,
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
    .eq('id', workoutId)
    .single()

  if (error) {
    console.error('Failed to fetch workout details:', error.message)
    throw new DatabaseError('Failed to fetch workout details', error)
  }
  
  return data
}
