import { getSupabaseServer } from '@/lib/supabase/server'
import { PRType, PRCheckResult } from '@/types/database'

export interface PREvaluationResult {
  exerciseName: string
  prType: PRType
  oldValue: number | null
  newValue: number
}

// Epley Formula
function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export async function evaluateAndSavePRs(userId: string, workoutId: string): Promise<PREvaluationResult[]> {
  const supabase = await getSupabaseServer()

  // 1. Fetch the workout we just saved with all exercises and sets
  const { data: workout, error } = await supabase
    .from('workouts')
    .select(`
      started_at,
      workout_exercises (
        id,
        exercise:exercises ( id, name ),
        sets ( id, weight_kg, reps, is_warmup, set_number )
      )
    `)
    .eq('id', workoutId)
    .single()

  if (error || !workout) throw new Error('Failed to fetch workout for PR evaluation')

  const brokenPRs: PREvaluationResult[] = []

  // 2. Fetch all existing PRs for this user
  const { data: existingPRs } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)

  const prMap = new Map<string, number>() // key: `${exerciseId}_${prType}`, value: current_record_value
  existingPRs?.forEach(pr => {
    prMap.set(`${pr.exercise_id}_${pr.pr_type}`, Number(pr.value))
  })

  const newPRsToUpsert: any[] = []

  // 3. Evaluate every set
  for (const we of workout.workout_exercises || []) {
    // @ts-ignore
    const exerciseId = we.exercise.id
    // @ts-ignore
    const exerciseName = we.exercise.name

    // Sort sets chronologically
    const sortedSets = (we.sets || []).sort((a: any, b: any) => a.set_number - b.set_number)

    for (const set of sortedSets) {
      if (set.is_warmup || !set.weight_kg || !set.reps) continue

      const weight = Number(set.weight_kg)
      const reps = Number(set.reps)
      const volume = weight * reps
      const est1RM = calculate1RM(weight, reps)

      const checks = [
        { type: 'best_weight' as PRType, value: weight },
        { type: 'best_volume' as PRType, value: volume },
        { type: 'best_1rm' as PRType, value: est1RM }
      ]

      for (const check of checks) {
        const key = `${exerciseId}_${check.type}`
        const currentRecord = prMap.get(key) || 0

        if (check.value > currentRecord) {
          // PR BROKEN!
          brokenPRs.push({
            exerciseName,
            prType: check.type,
            oldValue: currentRecord === 0 ? null : currentRecord,
            newValue: check.value
          })

          // Update local map so subsequent sets in same workout are compared to THIS new record
          prMap.set(key, check.value)

          // Add to upsert array
          newPRsToUpsert.push({
            user_id: userId,
            exercise_id: exerciseId,
            pr_type: check.type,
            reps: reps,
            value: check.value,
            set_id: set.id,
            achieved_at: workout.started_at
          })
        }
      }
    }
  }

  // 4. Save to DB
  if (newPRsToUpsert.length > 0) {
    // Supabase upsert on the unique constraint (user_id, exercise_id, pr_type)
    await supabase.from('personal_records').upsert(newPRsToUpsert, {
      onConflict: 'user_id,exercise_id,pr_type'
    })
  }

  return brokenPRs
}

export async function getExerciseProgression(userId: string, exerciseId: string) {
  const supabase = await getSupabaseServer()
  
  // Fetch PRs for this exercise
  const { data: prs } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)

  // Fetch all sets for this exercise to build progression graphs
  // We need to join sets -> workout_exercises -> workouts
  // Since Supabase RPC or complex joins are tricky via REST, we query workouts and filter
  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      started_at,
      workout_exercises!inner (
        exercise_id,
        sets ( weight_kg, reps, is_warmup )
      )
    `)
    .eq('user_id', userId)
    .eq('workout_exercises.exercise_id', exerciseId)
    .order('started_at', { ascending: true })

  const progressionData: { date: string, maxWeight: number, best1RM: number, volume: number }[] = []

  workouts?.forEach(w => {
    let maxW = 0
    let best1 = 0
    let vol = 0
    const dateStr = new Date(w.started_at).toISOString().split('T')[0]
    
    // @ts-ignore
    w.workout_exercises.forEach(we => {
      // @ts-ignore
      we.sets.forEach(s => {
        if (!s.is_warmup && s.weight_kg && s.reps) {
          const wgt = Number(s.weight_kg)
          const reps = Number(s.reps)
          if (wgt > maxW) maxW = wgt
          const e1rm = calculate1RM(wgt, reps)
          if (e1rm > best1) best1 = e1rm
          vol += (wgt * reps)
        }
      })
    })

    if (maxW > 0 || best1 > 0) {
      progressionData.push({
        date: dateStr,
        maxWeight: maxW,
        best1RM: Math.round(best1),
        volume: vol
      })
    }
  })

  return {
    prs: prs || [],
    progression: progressionData
  }
}

export async function getWeeklyMuscleGroupStats(userId: string) {
  const supabase = await getSupabaseServer()
  
  // Last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      started_at,
      workout_exercises (
        exercise:exercises ( muscle_group ),
        sets ( id, is_warmup )
      )
    `)
    .eq('user_id', userId)
    .gte('started_at', sevenDaysAgo.toISOString())

  const muscleCounts: Record<string, number> = {}

  workouts?.forEach(w => {
    // @ts-ignore
    w.workout_exercises.forEach(we => {
      // @ts-ignore
      const group = we.exercise?.muscle_group
      // @ts-ignore
      const validSets = we.sets?.filter(s => !s.is_warmup).length || 0
      
      if (group && validSets > 0) {
        muscleCounts[group] = (muscleCounts[group] || 0) + validSets
      }
    })
  })

  // Format for radar chart
  return Object.keys(muscleCounts).map(group => ({
    subject: group.toUpperCase(),
    A: muscleCounts[group],
    fullMark: Math.max(10, ...Object.values(muscleCounts)) // Dynamic scale
  }))
}
