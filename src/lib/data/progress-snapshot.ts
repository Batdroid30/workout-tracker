import { cache } from 'react'
import { resolveSupabaseClient } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { calculate1RM, type RecentExerciseLoad } from '@/lib/algorithms'
import type { KeyLift } from '@/lib/data/phase-coach'
import type { ImprovedExercise } from '@/lib/data/insights'
import { PUSH_MUSCLES, PULL_MUSCLES, LEG_MUSCLES } from '@/lib/training-constants'

export { PUSH_MUSCLES, PULL_MUSCLES, LEG_MUSCLES }

// ── Constants ─────────────────────────────────────────────────────────────────

const SNAPSHOT_WEEKS      = 12
const KEY_LIFT_COUNT      = 5
const STALE_RECENT_DAYS   = 21
const STALE_PREVIOUS_DAYS = 42

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeeklySnapshotData {
  weekStart:    string
  totalVolume:  number
  sessionCount: number
  avgRpe:       number | null
  /** totalVolume / sessionCount. Zero when no sessions that week. */
  density:      number
  setsByMuscle: Record<string, number>
}

export interface StalenessEntry {
  name:             string
  muscleGroup:      string
  movementPattern:  string
  recentBest:       number
  previousBest:     number
  recentSessions:   number
  previousSessions: number
}

export interface ProgressSnapshot {
  /** Weekly aggregates, sorted ascending by weekStart. */
  weeklyData:              WeeklySnapshotData[]
  /** exerciseId → weekStart → best e1RM that week. */
  exerciseWeeklyE1RM:      Map<string, Map<string, number>>
  /** Top 5 compound lifts by distinct session count over the window. */
  keyLifts:                KeyLift[]
  /** Working set counts per muscle group for the current ISO week only. */
  currentWeekSetsByMuscle: Record<string, number>
  /** Total working sets by movement category over the full 12-week window. */
  pushSets:                number
  pullSets:                number
  legSets:                 number
  /**
   * Per-exercise comparison of best e1RM in the most-recent 3 weeks vs the
   * preceding 3 weeks. Used to surface stale lifts.
   */
  exerciseStaleness:       Map<string, StalenessEntry>
  /** Most recent working set per exercise in the last 14 days. */
  recentLoads:             RecentExerciseLoad[]
  /** Muscle training frequency (sessions/week) in the last 28 days. */
  muscleFrequency:         Record<string, number>
  /** Top 3 most improved exercises in the last 12 weeks. */
  mostImprovedExercises:   ImprovedExercise[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getMondayOf(date: Date): string {
  const d   = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

function makeEmptySnapshot(): ProgressSnapshot {
  return {
    weeklyData:              [],
    exerciseWeeklyE1RM:      new Map(),
    keyLifts:                [],
    currentWeekSetsByMuscle: {},
    pushSets:                0,
    pullSets:                0,
    legSets:                 0,
    exerciseStaleness:       new Map(),
    recentLoads:             [],
    muscleFrequency:         {},
    mostImprovedExercises:   [],
  }
}

// ── Query ─────────────────────────────────────────────────────────────────────

/**
 * Single 12-week sets scan that replaces the six independent sets-table queries
 * the progress page previously issued. All weekly metrics are derived in one JS
 * pass over the returned rows.
 *
 * Consumers derive from the snapshot (no extra DB calls needed):
 *   volume trend, frequency trend, RPE trend, training density,
 *   sets-per-muscle trend, push/pull/legs balance, per-lift e1RM curves,
 *   stale lift detection, and month-over-month summary.
 */
export const getProgressSnapshot = cache(async (userId: string, accessToken?: string, runAsAdmin: boolean = false): Promise<ProgressSnapshot> => {
  const supabase = await resolveSupabaseClient(accessToken, runAsAdmin)
  const since    = new Date(Date.now() - SNAPSHOT_WEEKS * 7 * 86400_000)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg, reps, rpe, completed_at,
      workout_exercises!inner (
        exercise:exercises ( id, name, muscle_group, movement_pattern ),
        workouts!inner ( id, started_at, user_id )
      )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .eq('is_warmup', false)
    .gt('weight_kg', 0)
    .gt('reps', 0)
    .gte('completed_at', since.toISOString())

  if (error) throw new DatabaseError('Failed to fetch progress snapshot', error)
  if (!data || data.length === 0) return makeEmptySnapshot()

  const currentMonday = getMondayOf(new Date())
  const recentCutoff  = new Date(Date.now() - STALE_RECENT_DAYS   * 86400_000).toISOString()
  const prevStart     = new Date(Date.now() - STALE_PREVIOUS_DAYS * 86400_000).toISOString()

  // Accumulators keyed by ISO week start (YYYY-MM-DD)
  const weekVolumeMap   = new Map<string, number>()
  const weekSessionsMap = new Map<string, Set<string>>()
  const weekRpeMap      = new Map<string, { sum: number; count: number }>()
  const weekMuscleMap   = new Map<string, Record<string, number>>()

  const exerciseWeeklyE1RM = new Map<string, Map<string, number>>()

  // exerciseId → { name, muscleGroup, distinct session dates }
  const liftSessions = new Map<string, { name: string; muscleGroup: string; dates: Set<string> }>()

  const currentWeekSetsByMuscle: Record<string, number> = {}
  let pushSets = 0, pullSets = 0, legSets = 0

  const stalenessAccum = new Map<string, {
    name: string; muscleGroup: string; movementPattern: string
    recentBest: number;   previousBest: number
    recentDates: Set<string>; previousDates: Set<string>
  }>()

  // exerciseId → { completedAt, load }
  const recentLoadsMap = new Map<string, { completedAt: string; load: RecentExerciseLoad }>()
  // muscleGroup → distinct training dates in last 28 days
  const muscleDays28 = new Map<string, Set<string>>()
  // exerciseName → { name, muscleGroup, recentBest, previousBest }
  const exerciseMap: Record<string, { name: string; muscleGroup: string; recentBest: number; previousBest: number }> = {}

  for (const row of data as any[]) {
    const we       = Array.isArray(row.workout_exercises) ? row.workout_exercises[0] : row.workout_exercises
    const exercise = Array.isArray(we?.exercise)          ? we.exercise[0]           : we?.exercise
    const workout  = Array.isArray(we?.workouts)          ? we.workouts[0]           : we?.workouts
    if (!exercise?.id || !workout?.id || !workout?.started_at) continue

    const weight      = Number(row.weight_kg)
    const reps        = Number(row.reps)
    const e1rm        = calculate1RM(weight, reps)
    const weekKey     = getMondayOf(new Date(workout.started_at))
    const workoutId   = workout.id as string
    const muscle      = exercise.muscle_group as string | undefined
    const completedAt = row.completed_at as string
    const dateKey     = completedAt.split('T')[0]

    // ── Weekly volume ─────────────────────────────────────────────────────────
    weekVolumeMap.set(weekKey, (weekVolumeMap.get(weekKey) ?? 0) + weight * reps)

    // ── Distinct sessions per week ────────────────────────────────────────────
    if (!weekSessionsMap.has(weekKey)) weekSessionsMap.set(weekKey, new Set())
    weekSessionsMap.get(weekKey)!.add(workoutId)

    // ── RPE ───────────────────────────────────────────────────────────────────
    if (row.rpe != null) {
      const acc = weekRpeMap.get(weekKey) ?? { sum: 0, count: 0 }
      acc.sum   += Number(row.rpe)
      acc.count += 1
      weekRpeMap.set(weekKey, acc)
    }

    // ── Sets per muscle per week ──────────────────────────────────────────────
    if (muscle) {
      if (!weekMuscleMap.has(weekKey)) weekMuscleMap.set(weekKey, {})
      const mw = weekMuscleMap.get(weekKey)!
      mw[muscle] = (mw[muscle] ?? 0) + 1
    }

    // ── Per-exercise weekly best e1RM ─────────────────────────────────────────
    {
      let liftMap = exerciseWeeklyE1RM.get(exercise.id)
      if (!liftMap) { liftMap = new Map(); exerciseWeeklyE1RM.set(exercise.id, liftMap) }
      const cur = liftMap.get(weekKey) ?? 0
      if (e1rm > cur) liftMap.set(weekKey, e1rm)
    }

    // ── Key lift detection (compound exercises only) ──────────────────────────
    if (exercise.movement_pattern !== 'isolation') {
      let entry = liftSessions.get(exercise.id)
      if (!entry) {
        entry = { name: exercise.name, muscleGroup: muscle ?? '', dates: new Set() }
        liftSessions.set(exercise.id, entry)
      }
      entry.dates.add(dateKey)
    }

    // ── Current-week sets per muscle ──────────────────────────────────────────
    if (muscle && weekKey === currentMonday) {
      currentWeekSetsByMuscle[muscle] = (currentWeekSetsByMuscle[muscle] ?? 0) + 1
    }

    // ── Push / pull / legs totals ─────────────────────────────────────────────
    if (muscle) {
      if      (PUSH_MUSCLES.has(muscle)) pushSets++
      else if (PULL_MUSCLES.has(muscle)) pullSets++
      else if (LEG_MUSCLES.has(muscle))  legSets++
    }

    // ── Staleness: recent (0–21 days) vs previous (21–42 days) ───────────────
    const isRecent   = completedAt >= recentCutoff
    const isPrevious = completedAt >= prevStart && completedAt < recentCutoff
    if (isRecent || isPrevious) {
      let sa = stalenessAccum.get(exercise.id)
      if (!sa) {
        sa = {
          name: exercise.name, muscleGroup: muscle ?? '',
          movementPattern: exercise.movement_pattern ?? '',
          recentBest: 0,   previousBest: 0,
          recentDates: new Set(), previousDates: new Set(),
        }
        stalenessAccum.set(exercise.id, sa)
      }
      if (isRecent) {
        if (e1rm > sa.recentBest) sa.recentBest = e1rm
        sa.recentDates.add(dateKey)
      } else {
        if (e1rm > sa.previousBest) sa.previousBest = e1rm
        sa.previousDates.add(dateKey)
      }
    }

    // ── Recent loads (last 14 days) ───────────────────────────────────────────
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000).toISOString()
    if (completedAt >= fourteenDaysAgo) {
      const existing = recentLoadsMap.get(exercise.id)
      if (!existing || completedAt > existing.completedAt) {
        recentLoadsMap.set(exercise.id, {
          completedAt,
          load: {
            exerciseId:   exercise.id,
            exerciseName: exercise.name,
            muscleGroup:  muscle ?? '',
            lastWeight:   weight,
            lastReps:     reps,
            lastRPE:      row.rpe != null ? Number(row.rpe) : undefined,
          }
        })
      }
    }

    // ── Muscle training frequency (last 28 days) ──────────────────────────────
    const cutoff28 = new Date(Date.now() - 28 * 86400_000).toISOString()
    if (muscle && completedAt >= cutoff28) {
      if (!muscleDays28.has(muscle)) muscleDays28.set(muscle, new Set())
      muscleDays28.get(muscle)!.add(dateKey)
    }

    // ── Most improved exercises (last 12 weeks/84 days) ────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString()
    if (exercise.name) {
      if (!exerciseMap[exercise.name]) {
        exerciseMap[exercise.name] = {
          name: exercise.name,
          muscleGroup: muscle ?? '',
          recentBest: 0,
          previousBest: 0,
        }
      }
      const exImp = exerciseMap[exercise.name]
      if (completedAt >= thirtyDaysAgo) {
        if (e1rm > exImp.recentBest) exImp.recentBest = e1rm
      } else {
        if (e1rm > exImp.previousBest) exImp.previousBest = e1rm
      }
    }
  }

  // ── Build weeklyData (ascending) ─────────────────────────────────────────────
  const allWeeks = new Set([...weekVolumeMap.keys(), ...weekSessionsMap.keys()])
  const weeklyData: WeeklySnapshotData[] = Array.from(allWeeks)
    .sort()
    .map(weekStart => {
      const totalVolume  = weekVolumeMap.get(weekStart) ?? 0
      const sessionCount = weekSessionsMap.get(weekStart)?.size ?? 0
      const rpeAcc       = weekRpeMap.get(weekStart)
      return {
        weekStart,
        totalVolume,
        sessionCount,
        avgRpe:      rpeAcc && rpeAcc.count > 0 ? rpeAcc.sum / rpeAcc.count : null,
        density:     sessionCount > 0 ? totalVolume / sessionCount : 0,
        setsByMuscle: weekMuscleMap.get(weekStart) ?? {},
      }
    })

  // ── Key lifts (top N compounds by distinct session count) ────────────────────
  const keyLifts: KeyLift[] = Array.from(liftSessions.entries())
    .map(([exerciseId, entry]) => ({
      exerciseId,
      exerciseName: entry.name,
      muscleGroup:  entry.muscleGroup,
      sessionCount: entry.dates.size,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, KEY_LIFT_COUNT)

  // ── Staleness map (convert internal Sets to counts) ───────────────────────────
  const exerciseStaleness = new Map<string, StalenessEntry>()
  for (const [id, sa] of stalenessAccum) {
    exerciseStaleness.set(id, {
      name:             sa.name,
      muscleGroup:      sa.muscleGroup,
      movementPattern:  sa.movementPattern,
      recentBest:       sa.recentBest,
      previousBest:     sa.previousBest,
      recentSessions:   sa.recentDates.size,
      previousSessions: sa.previousDates.size,
    })
  }

  const recentLoads = Array.from(recentLoadsMap.values())
    .map(v => v.load)
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))

  const muscleFrequency: Record<string, number> = {}
  for (const [mGroup, days] of muscleDays28) {
    muscleFrequency[mGroup] = Number((days.size / 4).toFixed(2))
  }

  const mostImprovedExercises = Object.values(exerciseMap)
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

  return {
    weeklyData,
    exerciseWeeklyE1RM,
    keyLifts,
    currentWeekSetsByMuscle,
    pushSets,
    pullSets,
    legSets,
    exerciseStaleness,
    recentLoads,
    muscleFrequency,
    mostImprovedExercises,
  }
})
