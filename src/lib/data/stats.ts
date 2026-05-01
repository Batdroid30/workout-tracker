import { cache } from 'react'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import type { PRType, PRCheckResult } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PREvaluationResult {
  exerciseName: string
  prType: PRType
  oldValue: number | null
  newValue: number
}

export interface TopPR {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  bestWeight: number | null
  bestWeightReps: number | null
  best1RM: number | null
  achievedAt: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

// ── Cached read functions ─────────────────────────────────────────────────────

export const getExerciseProgression = cache(async (userId: string, exerciseId: string) => {
  const supabase = getSupabaseAdmin()

  const { data: prs } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)

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

  const progressionData: { date: string; maxWeight: number; best1RM: number; volume: number }[] = []

  workouts?.forEach(w => {
    let maxW = 0, best1 = 0, vol = 0
    const dateStr = new Date(w.started_at).toISOString().split('T')[0]
    // @ts-ignore
    w.workout_exercises.forEach(we => {
      // @ts-ignore
      we.sets.forEach(s => {
        if (!s.is_warmup && s.weight_kg && s.reps) {
          const wgt = Number(s.weight_kg), reps = Number(s.reps)
          if (wgt > maxW) maxW = wgt
          const e1rm = calculate1RM(wgt, reps)
          if (e1rm > best1) best1 = e1rm
          vol += wgt * reps
        }
      })
    })
    if (maxW > 0 || best1 > 0) {
      progressionData.push({ date: dateStr, maxWeight: maxW, best1RM: Math.round(best1), volume: vol })
    }
  })

  return { prs: prs || [], progression: progressionData }
})

export const getTopPersonalRecords = cache(async (userId: string): Promise<TopPR[]> => {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('personal_records')
    .select(`
      exercise_id,
      pr_type,
      value,
      reps,
      achieved_at,
      exercise:exercises ( id, name, muscle_group )
    `)
    .eq('user_id', userId)
    .in('pr_type', ['best_weight', 'best_1rm'])

  if (error) { console.error('Failed to fetch top PRs:', error.message); return [] }
  if (!data || data.length === 0) return []

  const map = new Map<string, TopPR>()
  for (const row of data) {
    const ex = row.exercise as any
    if (!ex) continue
    const existing = map.get(row.exercise_id) ?? {
      exerciseId: row.exercise_id,
      exerciseName: ex.name,
      muscleGroup: ex.muscle_group,
      bestWeight: null,
      bestWeightReps: null,
      best1RM: null,
      achievedAt: row.achieved_at,
    }
    if (row.pr_type === 'best_weight') {
      existing.bestWeight = Number(row.value)
      existing.bestWeightReps = row.reps ? Number(row.reps) : null
    }
    if (row.pr_type === 'best_1rm') existing.best1RM = Number(row.value)
    if (row.achieved_at && (!existing.achievedAt || row.achieved_at > existing.achievedAt)) {
      existing.achievedAt = row.achieved_at
    }
    map.set(row.exercise_id, existing)
  }

  return Array.from(map.values())
    .sort((a, b) => (b.best1RM ?? 0) - (a.best1RM ?? 0))
    .slice(0, 15)
})

export const getWeeklyMuscleGroupStats = cache(async (userId: string) => {
  const supabase = getSupabaseAdmin()

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
      if (group && validSets > 0) muscleCounts[group] = (muscleCounts[group] || 0) + validSets
    })
  })

  return Object.keys(muscleCounts).map(group => ({
    subject: group.toUpperCase(),
    A: muscleCounts[group],
    fullMark: Math.max(10, ...Object.values(muscleCounts)),
  }))
})

// ── Write functions (never cached) ────────────────────────────────────────────

export async function evaluateAndSavePRs(
  userId: string,
  workoutId: string,
  achievedAt: string,
  sets: Array<{
    id: string
    exerciseId: string
    exerciseName: string
    weight_kg: number
    reps: number
    is_warmup: boolean
  }>,
): Promise<PREvaluationResult[]> {
  // Use admin client to bypass RLS — we already verified ownership in the action
  const supabase = getSupabaseAdmin()

  // Fetch existing PRs WITH their DB ids — same pattern as evaluateAndSaveAllPRs.
  // Upsert by id (when record exists) is reliable; onConflict column names are
  // fragile because they depend on the exact constraint name Supabase registered.
  const { data: existingPRs } = await supabase
    .from('personal_records')
    .select('id, exercise_id, pr_type, value')
    .eq('user_id', userId)

  const prMap = new Map<string, { value: number; dbId: string | null }>()
  existingPRs?.forEach(pr => {
    prMap.set(`${pr.exercise_id}|${pr.pr_type}`, { value: Number(pr.value), dbId: pr.id })
  })

  const brokenPRs: PREvaluationResult[] = []

  // Keyed by `exerciseId|prType` — one entry per type per exercise.
  // Using a Map prevents duplicate rows when the same PR type is beaten
  // twice in one workout (e.g. set 3 then set 5 both beat chest best_1rm).
  // Without this, the batch upsert would contain two INSERT attempts for
  // the same (user_id, exercise_id, pr_type) and hit the unique constraint.
  type PRInsert = {
    id?:         string
    user_id:     string
    exercise_id: string
    pr_type:     string
    reps:        number
    value:       number
    set_id:      string
    achieved_at: string
  }
  const upsertMap = new Map<string, PRInsert>()

  for (const set of sets) {
    if (set.is_warmup || !set.weight_kg || !set.reps) continue

    const weight = Number(set.weight_kg)
    const reps   = Number(set.reps)
    const checks = [
      { type: 'best_weight' as PRType, value: weight },
      { type: 'best_volume' as PRType, value: weight * reps },
      { type: 'best_1rm'    as PRType, value: calculate1RM(weight, reps) },
    ]

    for (const check of checks) {
      const key          = `${set.exerciseId}|${check.type}`
      const current      = prMap.get(key)
      const currentValue = current?.value ?? 0

      if (check.value > currentValue) {
        brokenPRs.push({
          exerciseName: set.exerciseName,
          prType:       check.type,
          oldValue:     currentValue === 0 ? null : currentValue,
          newValue:     check.value,
        })
        // Advance the local bar — subsequent sets in this workout compare
        // against the new value, not the old DB value.
        prMap.set(key, { value: check.value, dbId: current?.dbId ?? null })

        // Overwrite any earlier entry for this key so only the highest
        // value from this workout session ends up in the batch.
        const entry: PRInsert = {
          user_id:     userId,
          exercise_id: set.exerciseId,
          pr_type:     check.type,
          reps,
          value:       check.value,
          set_id:      set.id,
          achieved_at: achievedAt,
        }
        if (current?.dbId) entry.id = current.dbId
        upsertMap.set(key, entry)
      }
    }
  }

  if (upsertMap.size > 0) {
    const { error: upsertErr } = await supabase
      .from('personal_records')
      .upsert(Array.from(upsertMap.values()), {
        onConflict: 'user_id,exercise_id,pr_type',
      })
    if (upsertErr) throw new Error(`Failed to save PRs: ${upsertErr.message}`)
  }

  return brokenPRs
}

export async function evaluateAndSaveAllPRs(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { data: allSets, error } = await supabase
    .from('sets')
    .select(`
      id, weight_kg, reps, is_warmup, completed_at,
      workout_exercises!inner (
        exercise_id,
        workouts!inner ( user_id, started_at )
      )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .order('completed_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch sets for PR recalculation: ${error.message}`)
  if (!allSets || allSets.length === 0) return

  const prMap = new Map<string, { value: number; set_id: string; achieved_at: string; reps: number }>()

  for (const set of allSets) {
    if (set.is_warmup || !set.weight_kg || !set.reps) continue
    const weight = Number(set.weight_kg), reps = Number(set.reps)
    const we = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : (set.workout_exercises as any)
    if (!we) continue
    const exerciseId = we.exercise_id
    const workout = Array.isArray(we.workouts) ? we.workouts[0] : (we.workouts as any)
    const achievedAt = workout?.started_at || set.completed_at

    const checks = [
      { type: 'best_weight' as PRType, value: weight },
      { type: 'best_volume' as PRType, value: weight * reps },
      { type: 'best_1rm'    as PRType, value: weight * (1 + reps / 30) },
    ]
    for (const check of checks) {
      const key = `${exerciseId}|${check.type}`
      const cur = prMap.get(key)
      if (!cur || check.value > cur.value) prMap.set(key, { value: check.value, set_id: set.id, achieved_at: achievedAt, reps })
    }
  }

  const { data: existingPRs } = await supabase.from('personal_records').select('id, exercise_id, pr_type').eq('user_id', userId)
  const existingPRMap = new Map<string, string>()
  existingPRs?.forEach(pr => { existingPRMap.set(`${pr.exercise_id}|${pr.pr_type}`, pr.id) })

  const newPRsToUpsert = Array.from(prMap.entries()).map(([key, data]) => {
    const [exercise_id, pr_type] = key.split('|')
    const existingId = existingPRMap.get(key)
    return {
      ...(existingId ? { id: existingId } : {}),
      user_id: userId, exercise_id, pr_type,
      value: data.value, reps: data.reps, set_id: data.set_id, achieved_at: data.achieved_at,
    }
  })

  if (newPRsToUpsert.length > 0) {
    const { error: upsertErr } = await supabase
      .from('personal_records')
      .upsert(newPRsToUpsert, { onConflict: 'user_id,exercise_id,pr_type' })
    if (upsertErr) throw new Error(`Failed to save PRs: ${upsertErr.message}`)
  }
}
