import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { calculateEpley1RM, type WeekSummary } from '@/lib/algorithms'
import type { PRType } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NeglectedMuscle {
  muscleGroup: string
  daysSinceLastTrained: number
}

export interface StalledMovement {
  exerciseName: string
  currentBest: number   // e1RM kg in recent 3-week window
  previousBest: number  // e1RM kg in prior 3-week window
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
  improvementPct: number   // percentage, e.g. 22 means +22%
  previousBest: number     // e1RM kg
  recentBest: number       // e1RM kg
}

export interface TrainingStreak {
  currentStreak: number    // consecutive weeks with ≥1 workout
  longestStreak: number
}

export interface WeeklySummary {
  thisWeekVolume: number
  lastWeekVolume: number
  thisWeekCount: number
  lastWeekCount: number
  volumeChangePct: number | null   // null if no last-week data
  countChange: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the ISO date string for the Monday of the week containing `date`. */
function getMondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

/**
 * Returns last 8 weeks of training summaries, chronological ascending.
 * Used to feed assessFatigueLevel and derive WeeklySummary.
 */
export async function getWeeklyTrainingSummary(userId: string): Promise<WeekSummary[]> {
  const supabase = await getSupabaseServer()

  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      rpe,
      completed_at,
      is_warmup,
      workout_exercises!inner (
        workouts!inner ( user_id, started_at )
      )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .gte('completed_at', eightWeeksAgo.toISOString())
    .eq('is_warmup', false)

  if (error) throw new DatabaseError('Failed to fetch weekly training summary', error)
  if (!data || data.length === 0) return []

  // Also need workout dates to count sessions per week
  const { data: workoutData, error: wErr } = await supabase
    .from('workouts')
    .select('id, started_at')
    .eq('user_id', userId)
    .gte('started_at', eightWeeksAgo.toISOString())

  if (wErr) throw new DatabaseError('Failed to fetch workouts for streak', wErr)

  // Build workout count per week
  const workoutsByWeek: Record<string, Set<string>> = {}
  workoutData?.forEach(w => {
    const week = getMondayOf(new Date(w.started_at))
    if (!workoutsByWeek[week]) workoutsByWeek[week] = new Set()
    workoutsByWeek[week].add(w.id)
  })

  // Build volume + rpe per week from sets
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

  // Merge all weeks that appear in either map
  const allWeeks = new Set([
    ...Object.keys(weekMap),
    ...Object.keys(workoutsByWeek),
  ])

  return Array.from(allWeeks)
    .sort()
    .map(week => ({
      week_start: week,
      total_volume: weekMap[week]?.volume ?? 0,
      workout_count: workoutsByWeek[week]?.size ?? 0,
      avg_rpe:
        (weekMap[week]?.rpeCount ?? 0) > 0
          ? weekMap[week].rpeSum / weekMap[week].rpeCount
          : null,
    }))
}

/**
 * Derives this-week vs last-week summary from weekly training data.
 */
export function deriveWeeklySummary(weeks: WeekSummary[]): WeeklySummary {
  const thisWeek = getMondayOf(new Date())
  const lastWeek = getMondayOf(new Date(Date.now() - 7 * 86400000))

  const thisWeekData = weeks.find(w => w.week_start === thisWeek)
  const lastWeekData = weeks.find(w => w.week_start === lastWeek)

  const thisWeekVolume = thisWeekData?.total_volume ?? 0
  const lastWeekVolume = lastWeekData?.total_volume ?? 0
  const thisWeekCount = thisWeekData?.workout_count ?? 0
  const lastWeekCount = lastWeekData?.workout_count ?? 0

  const volumeChangePct =
    lastWeekVolume > 0
      ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
      : null

  const countChange =
    lastWeekCount > 0 || thisWeekCount > 0
      ? thisWeekCount - lastWeekCount
      : null

  return { thisWeekVolume, lastWeekVolume, thisWeekCount, lastWeekCount, volumeChangePct, countChange }
}

/**
 * Returns PRs hit within the last `days` days, newest first.
 */
export async function getRecentPRs(userId: string, days = 30): Promise<RecentPR[]> {
  const supabase = await getSupabaseServer()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('personal_records')
    .select(`
      pr_type,
      value,
      achieved_at,
      exercise:exercises ( name, muscle_group )
    `)
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
}

/**
 * Returns the top 3 most improved exercises by e1RM % gain.
 * Compares best e1RM in "recent window" (last 30 days) vs
 * "baseline window" (31–90 days ago). Min 5% improvement threshold.
 */
export async function getMostImprovedExercises(userId: string): Promise<ImprovedExercise[]> {
  const supabase = await getSupabaseServer()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      is_warmup,
      completed_at,
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

  // Map: exerciseKey → { name, muscleGroup, recentBest, previousBest }
  const exerciseMap: Record<string, {
    name: string
    muscleGroup: string
    recentBest: number
    previousBest: number
  }> = {}

  data.forEach((set: any) => {
    if (!set.weight_kg || !set.reps) return

    const we = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
    const exercise = Array.isArray(we?.exercise) ? we.exercise[0] : we?.exercise
    if (!exercise?.name) return

    const key = exercise.name
    const e1rm = calculateEpley1RM(Number(set.weight_kg), Number(set.reps))
    const setTime = new Date(set.completed_at).getTime()
    const isRecent = setTime >= thirtyDaysAgo

    if (!exerciseMap[key]) {
      exerciseMap[key] = {
        name: exercise.name,
        muscleGroup: exercise.muscle_group ?? '',
        recentBest: 0,
        previousBest: 0,
      }
    }

    if (isRecent) {
      if (e1rm > exerciseMap[key].recentBest) exerciseMap[key].recentBest = e1rm
    } else {
      if (e1rm > exerciseMap[key].previousBest) exerciseMap[key].previousBest = e1rm
    }
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
}

/**
 * Returns muscle groups trained in the last 28 days but not in the last 10 days.
 * Only flags muscles the user normally trains — ignores untouched groups entirely.
 */
export async function getNeglectedMuscles(userId: string): Promise<NeglectedMuscle[]> {
  const supabase = await getSupabaseServer()

  const twentyEightDaysAgo = new Date(Date.now() - 28 * 86400000)

  const { data, error } = await supabase
    .from('workout_exercises')
    .select(`
      exercise:exercises ( muscle_group ),
      workouts!inner ( user_id, started_at )
    `)
    .eq('workouts.user_id', userId)
    .gte('workouts.started_at', twentyEightDaysAgo.toISOString())

  if (error) throw new DatabaseError('Failed to fetch muscle group data', error)
  if (!data || data.length === 0) return []

  // Track most recent session date per muscle group
  const lastTrainedMap: Record<string, number> = {}

  data.forEach((we: any) => {
    const workout  = Array.isArray(we.workouts)  ? we.workouts[0]  : we.workouts
    const exercise = Array.isArray(we.exercise)  ? we.exercise[0]  : we.exercise
    if (!exercise?.muscle_group || !workout?.started_at) return

    const ts    = new Date(workout.started_at).getTime()
    const group = exercise.muscle_group as string

    if (!lastTrainedMap[group] || ts > lastTrainedMap[group]) {
      lastTrainedMap[group] = ts
    }
  })

  const now = Date.now()

  return Object.entries(lastTrainedMap)
    .map(([muscleGroup, lastTs]) => ({
      muscleGroup,
      daysSinceLastTrained: Math.floor((now - lastTs) / 86400000),
    }))
    .filter(m => m.daysSinceLastTrained >= 10)
    .sort((a, b) => b.daysSinceLastTrained - a.daysSinceLastTrained)
}

/**
 * Identifies exercises that have stalled: less than 3% e1RM improvement
 * comparing the last 3 weeks against the 3 weeks prior.
 * Requires at least 2 sessions in each window to avoid noise.
 */
export async function getStalledMovements(userId: string): Promise<StalledMovement[]> {
  const supabase = await getSupabaseServer()

  const sixWeeksAgo    = new Date(Date.now() - 42 * 86400000)
  const threeWeeksAgoMs = Date.now() - 21 * 86400000

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      is_warmup,
      completed_at,
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

  const exerciseMap: Record<string, {
    recentBest: number
    previousBest: number
    recentDates: Set<string>
    previousDates: Set<string>
  }> = {}

  data.forEach((set: any) => {
    if (!set.weight_kg || !set.reps) return

    const we       = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
    const exercise = Array.isArray(we?.exercise)          ? we.exercise[0]            : we?.exercise
    const workout  = Array.isArray(we?.workouts)          ? we.workouts[0]            : we?.workouts
    if (!exercise?.name || !workout?.started_at) return

    const key      = exercise.name as string
    const e1rm     = calculateEpley1RM(Number(set.weight_kg), Number(set.reps))
    const setMs    = new Date(set.completed_at).getTime()
    const dateStr  = workout.started_at.split('T')[0] as string
    const isRecent = setMs >= threeWeeksAgoMs

    if (!exerciseMap[key]) {
      exerciseMap[key] = { recentBest: 0, previousBest: 0, recentDates: new Set(), previousDates: new Set() }
    }

    const ex = exerciseMap[key]
    if (isRecent) {
      if (e1rm > ex.recentBest) ex.recentBest = e1rm
      ex.recentDates.add(dateStr)
    } else {
      if (e1rm > ex.previousBest) ex.previousBest = e1rm
      ex.previousDates.add(dateStr)
    }
  })

  return Object.entries(exerciseMap)
    .filter(([_, ex]) =>
      ex.previousBest > 0 &&
      ex.recentBest   > 0 &&
      ex.recentDates.size   >= 2 &&
      ex.previousDates.size >= 2 &&
      // Less than 3% improvement = stalled
      (ex.recentBest - ex.previousBest) / ex.previousBest < 0.03
    )
    .map(([name, ex]) => ({
      exerciseName: name,
      currentBest:  Math.round(ex.recentBest  * 10) / 10,
      previousBest: Math.round(ex.previousBest * 10) / 10,
    }))
    .sort((a, b) => {
      // Regressions first, then stagnation
      const aChange = (a.currentBest - a.previousBest) / a.previousBest
      const bChange = (b.currentBest - b.previousBest) / b.previousBest
      return aChange - bChange
    })
    .slice(0, 3)
}

/**
 * Computes current and longest training streaks (unit: weeks).
 * A week counts if it contains ≥1 workout.
 */
export async function getTrainingStreak(userId: string): Promise<TrainingStreak> {
  const supabase = await getSupabaseServer()

  const { data, error } = await supabase
    .from('workouts')
    .select('started_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  if (error) throw new DatabaseError('Failed to fetch workouts for streak', error)
  if (!data || data.length === 0) return { currentStreak: 0, longestStreak: 0 }

  // Get unique weeks that had at least one workout
  const weekSet = new Set(data.map(w => getMondayOf(new Date(w.started_at))))
  const weeks = Array.from(weekSet).sort().reverse() // newest first

  const thisWeek = getMondayOf(new Date())
  const lastWeek = getMondayOf(new Date(Date.now() - 7 * 86400000))

  // Current streak: must start from this week or last week (grace period)
  let currentStreak = 0
  if (weeks[0] === thisWeek || weeks[0] === lastWeek) {
    // Walk back checking each consecutive week is present
    let cursor = weeks[0] === thisWeek ? thisWeek : lastWeek
    for (const week of weeks) {
      if (week === cursor) {
        currentStreak++
        // Move cursor back one week
        const d = new Date(cursor)
        d.setUTCDate(d.getUTCDate() - 7)
        cursor = d.toISOString().split('T')[0]
      } else {
        break
      }
    }
  }

  // Longest streak: scan all weeks
  let longestStreak = 0
  let runningStreak = 0
  let prevWeek: string | null = null

  for (const week of [...weeks].reverse()) {
    if (prevWeek === null) {
      runningStreak = 1
    } else {
      const expected = new Date(prevWeek)
      expected.setUTCDate(expected.getUTCDate() + 7)
      const expectedStr = expected.toISOString().split('T')[0]
      runningStreak = week === expectedStr ? runningStreak + 1 : 1
    }
    if (runningStreak > longestStreak) longestStreak = runningStreak
    prevWeek = week
  }

  return { currentStreak, longestStreak }
}
