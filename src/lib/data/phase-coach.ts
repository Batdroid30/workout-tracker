import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { calculateEpley1RM, suggestNextSet } from '@/lib/algorithms'
import type { RecentExerciseLoad } from '@/lib/algorithms'
import {
  getAdjustedLandmarks,
  classifyVolumeStatus,
  classifyStrengthTrend,
  getStrengthExpectation,
  linearSlopePerWeek,
  type VolumeLandmarks,
  type VolumeStatus,
  type StrengthTrendStatus,
} from '@/lib/phase-coach'
import { getWeeklySetsByMuscle } from '@/lib/data/insights'
import type {
  StalledMovement,
  NeglectedMuscle,
  PushPullBalance,
} from '@/lib/data/insights'
import type {
  MuscleGroup,
  Profile,
  TrainingPhase,
  TrainingStyle,
} from '@/types/database'

// ── Constants ────────────────────────────────────────────────────────────────

/** Window for auto-detecting the user's most-frequent compound lifts. */
const KEY_LIFT_WINDOW_DAYS = 84   // 12 weeks
const DEFAULT_KEY_LIFT_COUNT = 5

/** Strength Index history is bounded to the smaller of phase length or this. */
const STRENGTH_INDEX_FALLBACK_WEEKS = 12

const ALL_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'lats', 'shoulders', 'traps',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// ── Key lift auto-detection ──────────────────────────────────────────────────

export interface KeyLift {
  exerciseId:   string
  exerciseName: string
  muscleGroup:  string
  /** Distinct sessions this lift appeared in over the detection window. */
  sessionCount: number
}

/**
 * Auto-detects the user's "key lifts" — most-frequent compound exercises
 * over the last 12 weeks. Compound = movement_pattern is anything except
 * 'isolation'. These lifts feed the Strength Index.
 *
 * Returns at most {@link DEFAULT_KEY_LIFT_COUNT} lifts, sorted by frequency.
 * Can return fewer (or empty) — callers MUST handle the < 3 case as
 * "not enough data for an Index."
 */
export const getKeyLifts = cache(async (userId: string): Promise<KeyLift[]> => {
  const supabase = getSupabaseAdmin()
  const since = new Date(Date.now() - KEY_LIFT_WINDOW_DAYS * 86400000)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      completed_at, is_warmup,
      workout_exercises!inner (
        exercise:exercises ( id, name, muscle_group, movement_pattern ),
        workouts!inner ( id, user_id, started_at )
      )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .eq('is_warmup', false)
    .gt('weight_kg', 0)
    .gt('reps', 0)
    .gte('completed_at', since.toISOString())

  if (error) throw new DatabaseError('Failed to fetch sets for key lift detection', error)
  if (!data || data.length === 0) return []

  // exerciseId → distinct workout dates
  const sessions = new Map<string, { name: string; muscleGroup: string; dates: Set<string> }>()

  for (const row of data as any[]) {
    const we       = Array.isArray(row.workout_exercises) ? row.workout_exercises[0] : row.workout_exercises
    const exercise = Array.isArray(we?.exercise) ? we.exercise[0] : we?.exercise
    const workout  = Array.isArray(we?.workouts) ? we.workouts[0] : we?.workouts
    if (!exercise?.id || !workout?.started_at) continue
    if (exercise.movement_pattern === 'isolation') continue

    const dateKey = (workout.started_at as string).split('T')[0]
    let entry = sessions.get(exercise.id)
    if (!entry) {
      entry = { name: exercise.name, muscleGroup: exercise.muscle_group ?? '', dates: new Set() }
      sessions.set(exercise.id, entry)
    }
    entry.dates.add(dateKey)
  }

  return Array.from(sessions.entries())
    .map(([exerciseId, entry]) => ({
      exerciseId,
      exerciseName: entry.name,
      muscleGroup:  entry.muscleGroup,
      sessionCount: entry.dates.size,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, DEFAULT_KEY_LIFT_COUNT)
})

// ── Strength Index ───────────────────────────────────────────────────────────

export interface StrengthIndexPoint {
  weekStart:    string
  /** Normalised: 1.0 = phase baseline, 1.05 = +5% gain. */
  index:        number
  /** How many of the user's key lifts had data this week. */
  liftsCovered: number
}

export interface StrengthIndexSummary {
  history:      StrengthIndexPoint[]
  /** Average % change per week from least-squares fit. null when <3 points. */
  pctPerWeek:   number | null
  status:       StrengthTrendStatus | null
  baselineWeek: string | null
  liftCount:    number
}

/**
 * Strength Index — average normalised e1RM across the user's auto-detected
 * key lifts, sampled weekly.
 *
 * Window: max(phase_started_at, 12 weeks ago) → now. The phase boundary is
 * what makes the index honest — a fresh phase starts at 1.0 and we measure
 * gain *within that phase*, not lifetime.
 *
 * Each lift is normalised against its own first observed week before
 * averaging — a 200kg squat and a 60kg overhead press contribute equally
 * to the index. Weeks where a lift wasn't trained are skipped (not zero-
 * filled), so taking a week off doesn't tank the curve.
 *
 * Important caveat surfaced in the UI: strength is a *proxy* for hypertrophy,
 * not a direct measure. Don't claim "muscle grew X%."
 */
export const getStrengthIndex = cache(async (
  userId: string,
  profile: Pick<Profile, 'training_phase' | 'experience_level' | 'phase_started_at'> | null,
): Promise<StrengthIndexSummary> => {
  const empty: StrengthIndexSummary = {
    history: [], pctPerWeek: null, status: null, baselineWeek: null, liftCount: 0,
  }

  const keyLifts = await getKeyLifts(userId)
  if (keyLifts.length < 3) return empty

  const phaseStartMs = profile?.phase_started_at
    ? new Date(profile.phase_started_at).getTime()
    : 0
  const fallbackMs = Date.now() - STRENGTH_INDEX_FALLBACK_WEEKS * 7 * 86400000
  const windowStart = new Date(Math.max(phaseStartMs, fallbackMs))

  const supabase = getSupabaseAdmin()
  const liftIds = keyLifts.map(l => l.exerciseId)

  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg, reps, completed_at, is_warmup,
      workout_exercises!inner (
        exercise_id,
        workouts!inner ( user_id, started_at )
      )
    `)
    .eq('workout_exercises.workouts.user_id', userId)
    .in('workout_exercises.exercise_id', liftIds)
    .eq('is_warmup', false)
    .gt('weight_kg', 0)
    .gt('reps', 0)
    .gte('completed_at', windowStart.toISOString())

  if (error) throw new DatabaseError('Failed to fetch sets for strength index', error)
  if (!data || data.length === 0) return { ...empty, liftCount: keyLifts.length }

  // exerciseId → weekStart → best e1RM that week
  const liftWeekly = new Map<string, Map<string, number>>()

  for (const row of data as any[]) {
    const we = Array.isArray(row.workout_exercises) ? row.workout_exercises[0] : row.workout_exercises
    const exerciseId = we?.exercise_id as string | undefined
    const workout    = Array.isArray(we?.workouts) ? we.workouts[0] : we?.workouts
    if (!exerciseId || !workout?.started_at) continue

    const weekKey = getMondayOf(new Date(workout.started_at))
    const e1rm    = calculateEpley1RM(Number(row.weight_kg), Number(row.reps))

    let weekMap = liftWeekly.get(exerciseId)
    if (!weekMap) { weekMap = new Map(); liftWeekly.set(exerciseId, weekMap) }
    const current = weekMap.get(weekKey) ?? 0
    if (e1rm > current) weekMap.set(weekKey, e1rm)
  }

  // Per-lift baseline = first observed week's best e1RM in the window.
  const baselines = new Map<string, number>()
  for (const [liftId, weeks] of liftWeekly.entries()) {
    const earliest = Array.from(weeks.keys()).sort()[0]
    if (!earliest) continue
    const baseline = weeks.get(earliest)
    if (baseline && baseline > 0) baselines.set(liftId, baseline)
  }

  // Union of weeks where ANY key lift was trained.
  const allWeeks = new Set<string>()
  for (const weeks of liftWeekly.values()) for (const w of weeks.keys()) allWeeks.add(w)
  const sortedWeeks = Array.from(allWeeks).sort()
  if (sortedWeeks.length < 2) return { ...empty, liftCount: keyLifts.length }

  const history: StrengthIndexPoint[] = sortedWeeks.map(week => {
    let total = 0
    let count = 0
    for (const [liftId, weeks] of liftWeekly.entries()) {
      const baseline = baselines.get(liftId)
      if (!baseline) continue
      const e1rm = weeks.get(week)
      if (!e1rm) continue
      total += e1rm / baseline
      count += 1
    }
    return {
      weekStart:    week,
      index:        count > 0 ? Number((total / count).toFixed(4)) : 1,
      liftsCovered: count,
    }
  })

  // Slope is in index-units per week; baseline is ~1.0 by construction so
  // the slope is already a fractional weekly change. ×100 → percent.
  const slope = linearSlopePerWeek(history.map(p => ({ weekStart: p.weekStart, value: p.index })))
  const pctPerWeek = slope === null ? null : Number((slope * 100).toFixed(2))

  let status: StrengthTrendStatus | null = null
  if (pctPerWeek !== null && profile?.experience_level && profile?.training_phase) {
    status = classifyStrengthTrend(
      pctPerWeek,
      getStrengthExpectation(profile.experience_level, profile.training_phase),
    )
  }

  return {
    history,
    pctPerWeek,
    status,
    baselineWeek: history[0].weekStart,
    liftCount:    keyLifts.length,
  }
})

// ── Volume Landmarks per muscle ──────────────────────────────────────────────

export interface MuscleVolumeLandmarkPoint {
  muscleGroup: MuscleGroup
  setCount:    number
  landmarks:   VolumeLandmarks
  status:      VolumeStatus
}

/**
 * Joins this week's set count per muscle (from the existing weekly sets
 * helper) with the user's phase- and style-adjusted volume landmarks.
 *
 * Always returns one entry per known MuscleGroup — including muscles with
 * zero sets, which the UI surfaces as "below MV" warnings. That's the
 * point: missing muscles are the most common volume problem.
 */
export const getVolumeLandmarksByMuscle = cache(async (
  userId: string,
  profile: Pick<Profile, 'training_style' | 'training_phase'> | null,
): Promise<MuscleVolumeLandmarkPoint[]> => {
  const style: TrainingStyle = profile?.training_style ?? 'volume'
  const phase: TrainingPhase = profile?.training_phase ?? 'maingaining'

  const sets   = await getWeeklySetsByMuscle(userId)
  const setMap = new Map(sets.map(s => [s.muscleGroup, s.setCount]))

  return ALL_MUSCLES.map(muscle => {
    const setCount  = setMap.get(muscle) ?? 0
    const landmarks = getAdjustedLandmarks(muscle, style, phase)
    return {
      muscleGroup: muscle,
      setCount,
      landmarks,
      status: classifyVolumeStatus(setCount, landmarks),
    }
  })
})

// ── This Week mission builder ────────────────────────────────────────────────
//
// Pure transform — takes already-fetched signals and emits a small, ordered
// list of "missions" the user should focus on this week. The card layer
// renders these directly.
//
// Priority logic:
//   critical — over MRV (overtraining)
//   high     — stalls, strong push/pull imbalance, muscles below MEV
//   normal   — progressive-overload prompts on key lifts
//
// Output capped at 4 — more than that and the user tunes everything out.

export type MissionPriority = 'critical' | 'high' | 'normal'

export type MissionType =
  | 'volume_excess'   // over MRV
  | 'stall'           // stalled compound
  | 'imbalance'       // push/pull off
  | 'volume_gap'      // below MEV
  | 'overload'        // progressive-overload prompt

export interface Mission {
  id:       string
  type:     MissionType
  priority: MissionPriority
  icon:     string
  headline: string
  detail:   string
}

export interface BuildMissionsInput {
  stalledMovements: StalledMovement[]
  neglectedMuscles: NeglectedMuscle[]
  volumeLandmarks:  MuscleVolumeLandmarkPoint[]
  pushPullBalance:  PushPullBalance
  keyLifts:         KeyLift[]
  recentLoads:      RecentExerciseLoad[]
  profile: Pick<Profile, 'training_goal' | 'experience_level'> | null
}

const PRIORITY_ORDER: Record<MissionPriority, number> = {
  critical: 0, high: 1, normal: 2,
}

const MIN_PUSHPULL_SETS_FOR_SIGNAL = 10
const STRONG_IMBALANCE_HIGH_RATIO  = 1.5   // 60/40 split
const STRONG_IMBALANCE_LOW_RATIO   = 0.65

const MAX_MISSIONS = 4

export function buildThisWeekMissions(input: BuildMissionsInput): Mission[] {
  const missions: Mission[] = []

  // ── Critical: muscles over MRV ─────────────────────────────────────────────
  for (const m of input.volumeLandmarks) {
    if (m.status !== 'over_mrv') continue
    missions.push({
      id:       `excess-${m.muscleGroup}`,
      type:     'volume_excess',
      priority: 'critical',
      icon:     '🚨',
      headline: `Cut back on ${m.muscleGroup}`,
      detail:   `${m.setCount} sets this week — above your recoverable max (${m.landmarks.mrv}). Drop a set on your next session.`,
    })
  }

  // ── High: stalls (max 2) ───────────────────────────────────────────────────
  const stalledNames = new Set(input.stalledMovements.map(s => s.exerciseName))
  for (const s of input.stalledMovements.slice(0, 2)) {
    const sign = s.pctPerWeek >= 0 ? '+' : ''
    missions.push({
      id:       `stall-${s.exerciseName}`,
      type:     'stall',
      priority: 'high',
      icon:     '📉',
      headline: `${s.exerciseName} is stalled`,
      detail:   `${sign}${s.pctPerWeek.toFixed(1)}%/wk over 3 weeks. Switch rep range — try 5×5 if you've been doing 8–12, or vice versa.`,
    })
  }

  // ── High: strong push/pull imbalance ───────────────────────────────────────
  const pp = input.pushPullBalance
  const ppTotal = pp.pushSets + pp.pullSets
  if (pp.ratio !== null && ppTotal >= MIN_PUSHPULL_SETS_FOR_SIGNAL) {
    if (pp.ratio > STRONG_IMBALANCE_HIGH_RATIO) {
      missions.push({
        id:       'imbalance-push',
        type:     'imbalance',
        priority: 'high',
        icon:     '⚖️',
        headline: 'Push-heavy program',
        detail:   `${pp.pushSets}:${pp.pullSets} push:pull over 4 weeks. Add a row or pull-up to your next session.`,
      })
    } else if (pp.ratio < STRONG_IMBALANCE_LOW_RATIO) {
      missions.push({
        id:       'imbalance-pull',
        type:     'imbalance',
        priority: 'high',
        icon:     '⚖️',
        headline: 'Pull-heavy program',
        detail:   `${pp.pushSets}:${pp.pullSets} push:pull over 4 weeks. Add a press to your next session.`,
      })
    }
  }

  // ── High: muscles below MEV (max 2, worst-first) ──────────────────────────
  const neglectedDays = new Map(
    input.neglectedMuscles.map(n => [n.muscleGroup, n.daysSinceLastTrained] as const),
  )
  const gaps = input.volumeLandmarks
    .filter(m => m.status === 'below_mv' || m.status === 'maintenance')
    .sort((a, b) => (b.landmarks.mev - b.setCount) - (a.landmarks.mev - a.setCount))
    .slice(0, 2)

  for (const m of gaps) {
    const needed   = Math.max(1, m.landmarks.mev - m.setCount)
    const daysSince = neglectedDays.get(m.muscleGroup)
    const detail = daysSince !== undefined
      ? `Last trained ${daysSince} days ago. Add ${needed} set${needed === 1 ? '' : 's'} this week to hit MEV (${m.landmarks.mev}).`
      : `${m.setCount} of ${m.landmarks.mev} sets needed for growth. Add ${needed} more this week.`
    missions.push({
      id:       `gap-${m.muscleGroup}`,
      type:     'volume_gap',
      priority: 'high',
      icon:     '⚠️',
      headline: `${m.muscleGroup} below MEV`,
      detail,
    })
  }

  // ── Normal: progressive-overload prompts (top 2 non-stalled key lifts) ─────
  const overloadPicks = input.keyLifts
    .filter(l => !stalledNames.has(l.exerciseName))
    .map(lift => ({
      lift,
      load: input.recentLoads.find(r => r.exerciseId === lift.exerciseId),
    }))
    .filter((entry): entry is { lift: KeyLift; load: RecentExerciseLoad } => !!entry.load)
    .slice(0, 2)

  for (const { lift, load } of overloadPicks) {
    const suggestion = suggestNextSet({
      lastWeight:      load.lastWeight,
      lastReps:        load.lastReps,
      exerciseType:    'compound',
      trainingGoal:    input.profile?.training_goal    ?? null,
      experienceLevel: input.profile?.experience_level ?? null,
    })
    missions.push({
      id:       `overload-${lift.exerciseId}`,
      type:     'overload',
      priority: 'normal',
      icon:     '🎯',
      headline: `${lift.exerciseName}: aim ${suggestion.weight_kg}×${suggestion.target_reps}`,
      detail:   `Last set: ${load.lastWeight}×${load.lastReps}. ${suggestion.reason}`,
    })
  }

  return missions
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, MAX_MISSIONS)
}
