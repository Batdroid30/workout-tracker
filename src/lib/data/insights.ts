import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { calculateEpley1RM, type WeekSummary } from '@/lib/algorithms'
import type { PRType } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NeglectedMuscle {
  muscleGroup: string
  daysSinceLastTrained: number
}

export interface StalledMovement {
  exerciseName: string
  currentBest:  number
  previousBest: number
  /**
   * Progression rate over the comparison window (~3 weeks).
   * Positive = climbing, ~0 = stalled, negative = regressing.
   */
  pctPerWeek: number
  kgPerWeek:  number
}

export interface RecentPR {
  exerciseName: string
  muscleGroup: string
  prType: PRType
  value: number
  achievedAt: string
  daysAgo: number
}

export interface ImprovedExercise {
  exerciseName: string
  muscleGroup: string
  improvementPct: number
  previousBest: number
  recentBest: number
}

export interface TrainingStreak {
  currentStreak: number
  longestStreak: number
}

export interface WeeklySummary {
  thisWeekVolume: number
  lastWeekVolume: number
  thisWeekCount: number
  lastWeekCount: number
  volumeChangePct: number | null
  countChange: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// ── Cached read functions ─────────────────────────────────────────────────────

export const getWeeklyTrainingSummary = cache(async (userId: string): Promise<WeekSummary[]> => {
  const supabase = getSupabaseAdmin()

  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg, reps, rpe, completed_at, is_warmup,
      workout_exercises!inner ( workouts!inner ( user_id, started_at ) )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .gte('completed_at', eightWeeksAgo.toISOString())
    .eq('is_warmup', false)

  if (error) throw new DatabaseError('Failed to fetch weekly training summary', error)
  if (!data || data.length === 0) return []

  const { data: workoutData, error: wErr } = await supabase
    .from('workouts')
    .select('id, started_at')
    .eq('user_id', userId)
    .gte('started_at', eightWeeksAgo.toISOString())

  if (wErr) throw new DatabaseError('Failed to fetch workouts for streak', wErr)

  const workoutsByWeek: Record<string, Set<string>> = {}
  workoutData?.forEach(w => {
    const week = getMondayOf(new Date(w.started_at))
    if (!workoutsByWeek[week]) workoutsByWeek[week] = new Set()
    workoutsByWeek[week].add(w.id)
  })

  const weekMap: Record<string, { volume: number; rpeSum: number; rpeCount: number }> = {}
  data.forEach((set: any) => {
    const we = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
    const workout = Array.isArray(we?.workouts) ? we.workouts[0] : we?.workouts
    if (!workout) return
    const week = getMondayOf(new Date(workout.started_at))
    if (!weekMap[week]) weekMap[week] = { volume: 0, rpeSum: 0, rpeCount: 0 }
    weekMap[week].volume += (set.weight_kg || 0) * (set.reps || 0)
    if (set.rpe !== null && set.rpe !== undefined) {
      weekMap[week].rpeSum += Number(set.rpe)
      weekMap[week].rpeCount += 1
    }
  })

  const allWeeks = new Set([...Object.keys(weekMap), ...Object.keys(workoutsByWeek)])
  return Array.from(allWeeks)
    .sort()
    .map(week => ({
      week_start: week,
      total_volume: weekMap[week]?.volume ?? 0,
      workout_count: workoutsByWeek[week]?.size ?? 0,
      avg_rpe: (weekMap[week]?.rpeCount ?? 0) > 0
        ? weekMap[week].rpeSum / weekMap[week].rpeCount
        : null,
    }))
})

export const getRecentPRs = cache(async (userId: string, days = 30): Promise<RecentPR[]> => {
  const supabase = getSupabaseAdmin()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('personal_records')
    .select(`pr_type, value, achieved_at, exercise:exercises ( name, muscle_group )`)
    .eq('user_id', userId)
    .gte('achieved_at', since.toISOString())
    .order('achieved_at', { ascending: false })
    .limit(5)

  if (error) throw new DatabaseError('Failed to fetch recent PRs', error)
  if (!data) return []

  const now = Date.now()
  return data.map((pr: any) => ({
    exerciseName: pr.exercise?.name ?? 'Unknown',
    muscleGroup: pr.exercise?.muscle_group ?? '',
    prType: pr.pr_type as PRType,
    value: Number(pr.value),
    achievedAt: pr.achieved_at,
    daysAgo: Math.floor((now - new Date(pr.achieved_at).getTime()) / 86400000),
  }))
})

export const getMostImprovedExercises = cache(async (userId: string): Promise<ImprovedExercise[]> => {
  const supabase = getSupabaseAdmin()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg, reps, is_warmup, completed_at,
      workout_exercises!inner (
        exercise:exercises ( name, muscle_group ),
        workouts!inner ( user_id, started_at )
      )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .gte('completed_at', ninetyDaysAgo.toISOString())
    .eq('is_warmup', false)

  if (error) throw new DatabaseError('Failed to fetch sets for improvement analysis', error)
  if (!data || data.length === 0) return []

  const thirtyDaysAgo = Date.now() - 30 * 86400000
  const exerciseMap: Record<string, { name: string; muscleGroup: string; recentBest: number; previousBest: number }> = {}

  data.forEach((set: any) => {
    if (!set.weight_kg || !set.reps) return
    const we = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
    const exercise = Array.isArray(we?.exercise) ? we.exercise[0] : we?.exercise
    if (!exercise?.name) return
    const key = exercise.name
    const e1rm = calculateEpley1RM(Number(set.weight_kg), Number(set.reps))
    const isRecent = new Date(set.completed_at).getTime() >= thirtyDaysAgo
    if (!exerciseMap[key]) exerciseMap[key] = { name: exercise.name, muscleGroup: exercise.muscle_group ?? '', recentBest: 0, previousBest: 0 }
    if (isRecent) { if (e1rm > exerciseMap[key].recentBest) exerciseMap[key].recentBest = e1rm }
    else { if (e1rm > exerciseMap[key].previousBest) exerciseMap[key].previousBest = e1rm }
  })

  return Object.values(exerciseMap)
    .filter(ex => ex.previousBest > 0 && ex.recentBest > 0)
    .map(ex => ({
      exerciseName: ex.name,
      muscleGroup: ex.muscleGroup,
      improvementPct: Math.round(((ex.recentBest - ex.previousBest) / ex.previousBest) * 100),
      previousBest: Math.round(ex.previousBest * 10) / 10,
      recentBest: Math.round(ex.recentBest * 10) / 10,
    }))
    .filter(ex => ex.improvementPct >= 5)
    .sort((a, b) => b.improvementPct - a.improvementPct)
    .slice(0, 3)
})

export const getNeglectedMuscles = cache(async (userId: string): Promise<NeglectedMuscle[]> => {
  const supabase = getSupabaseAdmin()

  const twentyEightDaysAgo = new Date(Date.now() - 28 * 86400000)

  const { data, error } = await supabase
    .from('workout_exercises')
    .select(`exercise:exercises ( muscle_group ), workouts!inner ( user_id, started_at )`)
    .eq('workouts.user_id', userId)
    .gte('workouts.started_at', twentyEightDaysAgo.toISOString())

  if (error) throw new DatabaseError('Failed to fetch muscle group data', error)
  if (!data || data.length === 0) return []

  const lastTrainedMap: Record<string, number> = {}
  data.forEach((we: any) => {
    const workout  = Array.isArray(we.workouts)  ? we.workouts[0]  : we.workouts
    const exercise = Array.isArray(we.exercise)  ? we.exercise[0]  : we.exercise
    if (!exercise?.muscle_group || !workout?.started_at) return
    const ts = new Date(workout.started_at).getTime()
    const group = exercise.muscle_group as string
    if (!lastTrainedMap[group] || ts > lastTrainedMap[group]) lastTrainedMap[group] = ts
  })

  const now = Date.now()
  return Object.entries(lastTrainedMap)
    .map(([muscleGroup, lastTs]) => ({ muscleGroup, daysSinceLastTrained: Math.floor((now - lastTs) / 86400000) }))
    .filter(m => m.daysSinceLastTrained >= 10)
    .sort((a, b) => b.daysSinceLastTrained - a.daysSinceLastTrained)
})

export const getStalledMovements = cache(async (userId: string): Promise<StalledMovement[]> => {
  const supabase = getSupabaseAdmin()

  const sixWeeksAgo     = new Date(Date.now() - 42 * 86400000)
  const threeWeeksAgoMs = Date.now() - 21 * 86400000

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg, reps, is_warmup, completed_at,
      workout_exercises!inner (
        exercise:exercises ( name ),
        workouts!inner ( user_id, started_at )
      )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .gte('completed_at', sixWeeksAgo.toISOString())
    .eq('is_warmup', false)

  if (error) throw new DatabaseError('Failed to fetch sets for stall analysis', error)
  if (!data || data.length === 0) return []

  const exerciseMap: Record<string, { recentBest: number; previousBest: number; recentDates: Set<string>; previousDates: Set<string> }> = {}

  data.forEach((set: any) => {
    if (!set.weight_kg || !set.reps) return
    const we      = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
    const exercise = Array.isArray(we?.exercise) ? we.exercise[0] : we?.exercise
    const workout  = Array.isArray(we?.workouts)  ? we.workouts[0]  : we?.workouts
    if (!exercise?.name || !workout?.started_at) return
    const key      = exercise.name as string
    const e1rm     = calculateEpley1RM(Number(set.weight_kg), Number(set.reps))
    const setMs    = new Date(set.completed_at).getTime()
    const dateStr  = workout.started_at.split('T')[0] as string
    const isRecent = setMs >= threeWeeksAgoMs
    if (!exerciseMap[key]) exerciseMap[key] = { recentBest: 0, previousBest: 0, recentDates: new Set(), previousDates: new Set() }
    const ex = exerciseMap[key]
    if (isRecent) { if (e1rm > ex.recentBest) ex.recentBest = e1rm; ex.recentDates.add(dateStr) }
    else          { if (e1rm > ex.previousBest) ex.previousBest = e1rm; ex.previousDates.add(dateStr) }
  })

  return Object.entries(exerciseMap)
    .filter(([_, ex]) =>
      ex.previousBest > 0 && ex.recentBest > 0 &&
      ex.recentDates.size >= 2 && ex.previousDates.size >= 2 &&
      (ex.recentBest - ex.previousBest) / ex.previousBest < 0.03
    )
    .map(([name, ex]) => {
      // Comparison window matches the recent/previous split: 3 weeks each.
      // Per-week rate makes "stuck for 3 weeks" actionable as
      // "0.2 kg/week" or "+0.5%/week", which the user can compare against
      // their goal-driven expected progression.
      const WEEKS_IN_WINDOW = 3
      const totalKg = ex.recentBest - ex.previousBest
      const pctPerWeek = (totalKg / ex.previousBest) * 100 / WEEKS_IN_WINDOW
      const kgPerWeek  = totalKg / WEEKS_IN_WINDOW
      return {
        exerciseName: name,
        currentBest:  Math.round(ex.recentBest  * 10) / 10,
        previousBest: Math.round(ex.previousBest * 10) / 10,
        pctPerWeek:   Math.round(pctPerWeek * 100) / 100,
        kgPerWeek:    Math.round(kgPerWeek  * 100) / 100,
      }
    })
    .sort((a, b) => a.pctPerWeek - b.pctPerWeek)  // worst (most negative) first
    .slice(0, 3)
})

export const getTrainingStreak = cache(async (userId: string): Promise<TrainingStreak> => {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('workouts')
    .select('started_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  if (error) throw new DatabaseError('Failed to fetch workouts for streak', error)
  if (!data || data.length === 0) return { currentStreak: 0, longestStreak: 0 }

  const weekSet = new Set(data.map(w => getMondayOf(new Date(w.started_at))))
  const weeks = Array.from(weekSet).sort().reverse()

  const thisWeek = getMondayOf(new Date())
  const lastWeek = getMondayOf(new Date(Date.now() - 7 * 86400000))

  let currentStreak = 0
  if (weeks[0] === thisWeek || weeks[0] === lastWeek) {
    let cursor = weeks[0] === thisWeek ? thisWeek : lastWeek
    for (const week of weeks) {
      if (week === cursor) {
        currentStreak++
        const d = new Date(cursor)
        d.setUTCDate(d.getUTCDate() - 7)
        cursor = d.toISOString().split('T')[0]
      } else { break }
    }
  }

  let longestStreak = 0, runningStreak = 0
  let prevWeek: string | null = null
  for (const week of [...weeks].reverse()) {
    if (prevWeek === null) { runningStreak = 1 }
    else {
      const expected = new Date(prevWeek)
      expected.setUTCDate(expected.getUTCDate() + 7)
      runningStreak = week === expected.toISOString().split('T')[0] ? runningStreak + 1 : 1
    }
    if (runningStreak > longestStreak) longestStreak = runningStreak
    prevWeek = week
  }

  return { currentStreak, longestStreak }
})

// ── Pure computation helpers (no DB, no cache needed) ─────────────────────────

export function deriveWeeklySummary(weeks: WeekSummary[]): WeeklySummary {
  const thisWeek = getMondayOf(new Date())
  const lastWeek = getMondayOf(new Date(Date.now() - 7 * 86400000))
  const thisWeekData = weeks.find(w => w.week_start === thisWeek)
  const lastWeekData = weeks.find(w => w.week_start === lastWeek)
  const thisWeekVolume = thisWeekData?.total_volume ?? 0
  const lastWeekVolume = lastWeekData?.total_volume ?? 0
  const thisWeekCount  = thisWeekData?.workout_count ?? 0
  const lastWeekCount  = lastWeekData?.workout_count ?? 0
  return {
    thisWeekVolume, lastWeekVolume, thisWeekCount, lastWeekCount,
    volumeChangePct: lastWeekVolume > 0 ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100) : null,
    countChange: (lastWeekCount > 0 || thisWeekCount > 0) ? thisWeekCount - lastWeekCount : null,
  }
}

export interface NextWorkoutSuggestion { focus: string; muscleGroups: string[]; reason: string }

const PUSH_MUSCLES = new Set(['chest', 'shoulders', 'triceps'])
const PULL_MUSCLES = new Set(['back', 'lats', 'traps', 'biceps', 'forearms'])
const LEG_MUSCLES  = new Set(['quads', 'hamstrings', 'glutes', 'calves'])

function workoutFocusFor(muscleGroup: string): string {
  if (PUSH_MUSCLES.has(muscleGroup)) return 'Push Day'
  if (PULL_MUSCLES.has(muscleGroup)) return 'Pull Day'
  if (LEG_MUSCLES.has(muscleGroup))  return 'Leg Day'
  return `${muscleGroup.charAt(0).toUpperCase()}${muscleGroup.slice(1)} Workout`
}

export function deriveNextWorkoutSuggestion(neglectedMuscles: NeglectedMuscle[]): NextWorkoutSuggestion | null {
  if (neglectedMuscles.length === 0) return null
  const top = neglectedMuscles[0]
  const focus = workoutFocusFor(top.muscleGroup)
  const relatedMuscles = neglectedMuscles.filter(m => workoutFocusFor(m.muscleGroup) === focus).slice(0, 3).map(m => m.muscleGroup)
  return { focus, muscleGroups: relatedMuscles, reason: `${top.muscleGroup.charAt(0).toUpperCase()}${top.muscleGroup.slice(1)} last trained ${top.daysSinceLastTrained} days ago` }
}

export function deriveCoachTips(weeklySummary: WeeklySummary, streak: TrainingStreak, neglectedMuscles: NeglectedMuscle[], stalledMovements: StalledMovement[]): string[] {
  const tips: string[] = []
  if (weeklySummary.volumeChangePct !== null) {
    if (weeklySummary.volumeChangePct <= -20) tips.push(`Volume dropped ${Math.abs(weeklySummary.volumeChangePct)}% this week. Try adding one extra set per exercise to get back on track.`)
    else if (weeklySummary.volumeChangePct >= 30) tips.push(`Volume jumped +${weeklySummary.volumeChangePct}% this week. Great effort — make sure sleep and protein are dialled in to absorb it.`)
  }
  if (streak.currentStreak >= 10) tips.push(`${streak.currentStreak} weeks straight — elite consistency. Schedule a deload week soon to let your nervous system recover.`)
  else if (streak.currentStreak === 0 && streak.longestStreak > 0) tips.push('Time to restart the streak. Even one session this week breaks the inertia.')
  if (neglectedMuscles.length >= 2) {
    const names = neglectedMuscles.slice(0, 2).map(m => m.muscleGroup).join(' and ')
    tips.push(`${names.charAt(0).toUpperCase()}${names.slice(1)} are being undertrained. Muscle imbalances limit your compound lift potential.`)
  }
  if (stalledMovements.length > 0) tips.push(`${stalledMovements[0].exerciseName} has plateaued. Switch rep range — try 5×5 if you've been doing 3×10, or add a pause rep.`)
  const fallbacks = [
    'Progressive overload is the only law. Add weight or reps to at least one set each week.',
    'Track your RPE — it tells the coach whether you are recovering or accumulating fatigue.',
    'Consistency beats intensity. Showing up every week matters more than any single session.',
  ]
  for (const tip of fallbacks) { if (tips.length >= 3) break; tips.push(tip) }
  return tips.slice(0, 3)
}

// ─── Weekly working sets per muscle group ────────────────────────────────────
//
// Counts each completed working set against its exercise's primary muscle
// group. Used by WeeklySetsCard to compare against the user's per-muscle
// weekly targets (style + phase aware).
//
// Window: Monday → now (UTC), matching the existing weekly-summary helpers.
// Excludes warmups and incomplete sets — only count what actually trains.

export interface WeeklySetCount {
  muscleGroup: string
  setCount:    number
}

export const getWeeklySetsByMuscle = cache(async (userId: string): Promise<WeeklySetCount[]> => {
  const supabase = getSupabaseAdmin()

  const monday = new Date(getMondayOf(new Date()) + 'T00:00:00Z')

  const { data, error } = await supabase
    .from('sets')
    .select(`
      id, is_warmup, completed_at,
      workout_exercises!inner (
        exercise:exercises ( muscle_group ),
        workouts!inner ( user_id )
      )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .eq('is_warmup', false)
    .gte('completed_at', monday.toISOString())

  if (error) throw new DatabaseError('Failed to fetch weekly sets by muscle', error)
  if (!data || data.length === 0) return []

  const counts: Record<string, number> = {}
  for (const set of data as any[]) {
    const we       = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
    const exercise = Array.isArray(we?.exercise)          ? we.exercise[0]           : we?.exercise
    const group    = exercise?.muscle_group as string | undefined
    if (!group) continue
    counts[group] = (counts[group] ?? 0) + 1
  }

  return Object.entries(counts)
    .map(([muscleGroup, setCount]) => ({ muscleGroup, setCount }))
    .sort((a, b) => b.setCount - a.setCount)
})

// ─── Recent exercise loads (for deload generator) ────────────────────────────
//
// Returns the most-recent working set per exercise the user has trained in
// the last 14 days. Used as input to generateDeloadRoutine().
//
// Why 14 days: anything older isn't relevant to the current mesocycle —
// the user's strength baseline may have shifted.

import type { RecentExerciseLoad } from '@/lib/algorithms'

export const getRecentExerciseLoads = cache(async (userId: string): Promise<RecentExerciseLoad[]> => {
  const supabase = getSupabaseAdmin()

  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg, reps, completed_at, is_warmup,
      workout_exercises!inner (
        exercise:exercises ( id, name, muscle_group ),
        workouts!inner ( user_id )
      )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .eq('is_warmup', false)
    .gt('weight_kg', 0)
    .gt('reps', 0)
    .gte('completed_at', fourteenDaysAgo.toISOString())
    .order('completed_at', { ascending: false })

  if (error) throw new DatabaseError('Failed to fetch recent loads', error)
  if (!data || data.length === 0) return []

  // Keep only the most-recent working set per exercise — data is already
  // sorted desc by completed_at so the first hit per id wins.
  const seen = new Map<string, RecentExerciseLoad>()
  for (const set of data as any[]) {
    const we       = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
    const exercise = Array.isArray(we?.exercise)          ? we.exercise[0]           : we?.exercise
    if (!exercise?.id || seen.has(exercise.id)) continue
    seen.set(exercise.id, {
      exerciseId:   exercise.id,
      exerciseName: exercise.name,
      muscleGroup:  exercise.muscle_group ?? '',
      lastWeight:   Number(set.weight_kg),
      lastReps:     Number(set.reps),
    })
  }

  return Array.from(seen.values())
})

// ─── Push/Pull balance (last 28 days) ────────────────────────────────────────
//
// Counts working sets by upper-body push vs pull muscle groups over the last
// 4 weeks. Surfaces front-vs-back imbalances that lead to posture issues and
// shoulder injuries.
//
//   Push muscles: chest, shoulders, triceps
//   Pull muscles: back, lats, biceps, traps
//
// Legs and core are ignored — they don't fit either bucket.
//
// Window: 28 days for a stable signal. One workout doesn't shift the ratio.

export interface PushPullBalance {
  pushSets: number
  pullSets: number
  /** push:pull ratio. 1 = balanced, >1 = push-heavy, <1 = pull-heavy. null when both are zero. */
  ratio:    number | null
}

// Reuses PUSH_MUSCLES / PULL_MUSCLES declared earlier in this file (used by
// the "Push Day" / "Pull Day" workout classifier). Keeping a single source of
// truth means the balance card and the day-classifier always agree on what
// counts as push vs pull.

export const getPushPullBalance = cache(async (userId: string): Promise<PushPullBalance> => {
  const supabase = getSupabaseAdmin()

  const twentyEightDaysAgo = new Date(Date.now() - 28 * 86400000)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      id, is_warmup, completed_at,
      workout_exercises!inner (
        exercise:exercises ( muscle_group ),
        workouts!inner ( user_id )
      )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .eq('is_warmup', false)
    .gte('completed_at', twentyEightDaysAgo.toISOString())

  if (error) throw new DatabaseError('Failed to fetch push/pull data', error)
  if (!data || data.length === 0) return { pushSets: 0, pullSets: 0, ratio: null }

  let pushSets = 0
  let pullSets = 0

  for (const set of data as any[]) {
    const we       = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
    const exercise = Array.isArray(we?.exercise)          ? we.exercise[0]           : we?.exercise
    const group    = exercise?.muscle_group as string | undefined
    if (!group) continue
    if (PUSH_MUSCLES.has(group)) pushSets += 1
    else if (PULL_MUSCLES.has(group)) pullSets += 1
  }

  const ratio = pushSets === 0 && pullSets === 0
    ? null
    : pullSets === 0
      ? Infinity
      : pushSets / pullSets

  return { pushSets, pullSets, ratio }
})
