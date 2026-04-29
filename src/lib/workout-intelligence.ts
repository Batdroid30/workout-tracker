/**
 * workout-intelligence.ts
 *
 * Pure constants and functions — no DB, no async, no side effects.
 * Everything in this file is evaluated at build time or runs in <1ms.
 *
 * Imported only by workout-screen components so Next.js code-splits it
 * away from the dashboard bundle automatically.
 */

import type {
  MuscleGroup,
  MovementPattern,
  Exercise,
  TrainingGoal,
  TrainingPhase,
  TrainingStyle,
  ExperienceLevel,
} from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

type MovementKey = `${MuscleGroup}-${MovementPattern}`

export interface SuccessorPattern {
  muscleGroup:     MuscleGroup
  movementPattern: MovementPattern
  /** Lower number = shown first */
  priority: number
}

export interface RepRange {
  min: number
  max: number
}

export interface WeightIncrement {
  compound:  number  // kg
  isolation: number  // kg
}

export interface WeeklySetTarget {
  /** Inclusive range shown as "aim for X–Y sets" */
  min: number
  max: number
}

// ── Rep ranges by training goal ───────────────────────────────────────────────

export const REP_RANGES: Record<TrainingGoal, RepRange> = {
  strength: { min: 3,  max: 6  },
  muscle:   { min: 8,  max: 15 },
  both:     { min: 5,  max: 10 },
}

// ── Weight jump increments by experience ─────────────────────────────────────
//
// Beginners progress faster so larger jumps are appropriate.
// Advanced lifters are near their ceiling — smaller jumps avoid missed reps.

export const WEIGHT_INCREMENTS: Record<ExperienceLevel, WeightIncrement> = {
  beginner:     { compound: 5,    isolation: 2.5  },
  intermediate: { compound: 2.5,  isolation: 1.25 },
  advanced:     { compound: 1.25, isolation: 1.25 },
}

// ── Weekly set targets per muscle × training style ───────────────────────────
//
// Volume style: spread volume across more sets, moderate effort per set.
// Intensity style: fewer total sets, each one taken close to failure.
//
// Targets are also scaled down ~20% during a cut (handled in the card layer).

export const WEEKLY_SET_TARGETS: Record<MuscleGroup, Record<TrainingStyle, WeeklySetTarget>> = {
  chest:      { volume: { min: 10, max: 16 }, intensity: { min: 4, max: 8 } },
  back:       { volume: { min: 12, max: 18 }, intensity: { min: 5, max: 9 } },
  lats:       { volume: { min: 10, max: 16 }, intensity: { min: 4, max: 8 } },
  shoulders:  { volume: { min: 10, max: 16 }, intensity: { min: 4, max: 8 } },
  traps:      { volume: { min: 6,  max: 12 }, intensity: { min: 3, max: 6 } },
  biceps:     { volume: { min: 8,  max: 14 }, intensity: { min: 3, max: 6 } },
  triceps:    { volume: { min: 8,  max: 14 }, intensity: { min: 3, max: 6 } },
  forearms:   { volume: { min: 4,  max: 8  }, intensity: { min: 2, max: 4 } },
  quads:      { volume: { min: 8,  max: 14 }, intensity: { min: 3, max: 6 } },
  hamstrings: { volume: { min: 6,  max: 12 }, intensity: { min: 3, max: 6 } },
  glutes:     { volume: { min: 6,  max: 12 }, intensity: { min: 3, max: 6 } },
  calves:     { volume: { min: 8,  max: 14 }, intensity: { min: 3, max: 6 } },
  core:       { volume: { min: 6,  max: 10 }, intensity: { min: 2, max: 5 } },
}

// Phase multipliers applied to the targets above
export const PHASE_VOLUME_MULTIPLIER: Record<TrainingPhase, number> = {
  bulking:     1.1,   // slightly more volume — surplus supports recovery
  cutting:     0.8,   // reduced volume — preservation mode
  maingaining: 1.0,   // steady
}

// ── Weeks before deload — by experience + phase ───────────────────────────────
//
// Beginners recover faster. Cutting is already a stressor so deload less often.
// All values are in weeks.

export const DELOAD_THRESHOLDS: Record<ExperienceLevel, Record<TrainingPhase, number>> = {
  beginner:     { bulking: 8, cutting: 10, maingaining: 8  },
  intermediate: { bulking: 5, cutting: 7,  maingaining: 6  },
  advanced:     { bulking: 4, cutting: 6,  maingaining: 5  },
}

// ── Stall thresholds — minimum monthly e1RM progress before flagging ──────────
//
// Beginners should be making faster progress. Advanced lifters progressing
// even 0.5% per month over a sustained period are doing well.

export const STALL_THRESHOLD_PCT: Record<ExperienceLevel, number> = {
  beginner:     3.0,   // <3% per 4 weeks = plateau for a beginner
  intermediate: 1.5,
  advanced:     0.5,
}

// ── Successor movement patterns ───────────────────────────────────────────────
//
// Maps the last exercise's muscle_group + movement_pattern to what typically
// comes next in a session. Used by getNextExerciseSuggestions().
//
// Keys that are missing simply return no suggestions — no crash.

export const MOVEMENT_SUCCESSORS: Partial<Record<MovementKey, SuccessorPattern[]>> = {

  // ── Chest ──────────────────────────────────────────────────────────────────
  'chest-push': [
    { muscleGroup: 'chest',   movementPattern: 'push',      priority: 1 }, // incline, other compound
    { muscleGroup: 'chest',   movementPattern: 'isolation',  priority: 2 }, // cable fly, pec deck
    { muscleGroup: 'triceps', movementPattern: 'isolation',  priority: 3 }, // accessory work
  ],
  'chest-isolation': [
    { muscleGroup: 'triceps', movementPattern: 'isolation',  priority: 1 },
    { muscleGroup: 'chest',   movementPattern: 'push',       priority: 2 },
  ],

  // ── Back ───────────────────────────────────────────────────────────────────
  'back-pull': [
    { muscleGroup: 'back',    movementPattern: 'pull',       priority: 1 }, // another row / pull
    { muscleGroup: 'lats',    movementPattern: 'pull',       priority: 2 },
    { muscleGroup: 'biceps',  movementPattern: 'isolation',  priority: 3 },
  ],
  'lats-pull': [
    { muscleGroup: 'back',    movementPattern: 'pull',       priority: 1 },
    { muscleGroup: 'biceps',  movementPattern: 'isolation',  priority: 2 },
  ],
  'back-hinge': [  // deadlift and heavy hinge patterns
    { muscleGroup: 'back',      movementPattern: 'pull',      priority: 1 },
    { muscleGroup: 'hamstrings',movementPattern: 'hinge',     priority: 2 },
    { muscleGroup: 'hamstrings',movementPattern: 'isolation', priority: 3 },
  ],
  'traps-isolation': [
    { muscleGroup: 'back',    movementPattern: 'pull',       priority: 1 },
    { muscleGroup: 'traps',   movementPattern: 'isolation',  priority: 2 },
  ],

  // ── Shoulders ──────────────────────────────────────────────────────────────
  'shoulders-push': [
    { muscleGroup: 'shoulders', movementPattern: 'isolation', priority: 1 }, // lateral/rear delt
    { muscleGroup: 'traps',     movementPattern: 'isolation', priority: 2 },
    { muscleGroup: 'triceps',   movementPattern: 'isolation', priority: 3 },
  ],
  'shoulders-isolation': [
    { muscleGroup: 'shoulders', movementPattern: 'isolation', priority: 1 }, // other delt variation
    { muscleGroup: 'shoulders', movementPattern: 'push',      priority: 2 },
  ],

  // ── Legs ───────────────────────────────────────────────────────────────────
  'quads-squat': [
    { muscleGroup: 'quads',     movementPattern: 'isolation', priority: 1 }, // leg extension
    { muscleGroup: 'hamstrings',movementPattern: 'hinge',     priority: 2 }, // RDL after squat
    { muscleGroup: 'glutes',    movementPattern: 'isolation', priority: 3 },
  ],
  'quads-isolation': [
    { muscleGroup: 'hamstrings',movementPattern: 'isolation', priority: 1 },
    { muscleGroup: 'calves',    movementPattern: 'isolation', priority: 2 },
  ],
  'hamstrings-hinge': [
    { muscleGroup: 'hamstrings',movementPattern: 'isolation', priority: 1 }, // leg curl
    { muscleGroup: 'glutes',    movementPattern: 'isolation', priority: 2 },
  ],
  'hamstrings-isolation': [
    { muscleGroup: 'glutes',    movementPattern: 'isolation', priority: 1 },
    { muscleGroup: 'calves',    movementPattern: 'isolation', priority: 2 },
  ],
  'glutes-isolation': [
    { muscleGroup: 'hamstrings',movementPattern: 'isolation', priority: 1 },
    { muscleGroup: 'glutes',    movementPattern: 'isolation', priority: 2 },
  ],

  // ── Arms ───────────────────────────────────────────────────────────────────
  'biceps-isolation': [
    { muscleGroup: 'biceps',   movementPattern: 'isolation',  priority: 1 }, // different curl variation
    { muscleGroup: 'forearms', movementPattern: 'isolation',  priority: 2 },
  ],
  'triceps-isolation': [
    { muscleGroup: 'triceps',  movementPattern: 'isolation',  priority: 1 }, // different extension
    { muscleGroup: 'chest',    movementPattern: 'push',       priority: 2 },
  ],
  'forearms-isolation': [
    { muscleGroup: 'biceps',   movementPattern: 'isolation',  priority: 1 },
  ],

  // ── Core ───────────────────────────────────────────────────────────────────
  'core-isolation': [
    { muscleGroup: 'core',     movementPattern: 'isolation',  priority: 1 },
  ],
  'core-carry': [
    { muscleGroup: 'core',     movementPattern: 'isolation',  priority: 1 },
  ],
}

// ── Workout focus defaults — by muscle group ──────────────────────────────────
//
// Used in WorkoutFocusSheet when the user selects muscles but has no history.
// Maps a user-facing focus label to an ordered list of patterns to query.
// The exercise store is filtered client-side against these — no DB call.

export interface FocusPattern {
  muscleGroup:     MuscleGroup
  movementPattern: MovementPattern
  /** How many exercises of this pattern to include */
  count: number
}

export const WORKOUT_FOCUS_DEFAULTS: Record<string, FocusPattern[]> = {
  chest: [
    { muscleGroup: 'chest',   movementPattern: 'push',      count: 2 },
    { muscleGroup: 'chest',   movementPattern: 'isolation',  count: 1 },
    { muscleGroup: 'triceps', movementPattern: 'isolation',  count: 1 },
  ],
  back: [
    { muscleGroup: 'back',   movementPattern: 'pull',       count: 2 },
    { muscleGroup: 'lats',   movementPattern: 'pull',       count: 1 },
    { muscleGroup: 'biceps', movementPattern: 'isolation',  count: 1 },
  ],
  shoulders: [
    { muscleGroup: 'shoulders', movementPattern: 'push',      count: 1 },
    { muscleGroup: 'shoulders', movementPattern: 'isolation',  count: 2 },
    { muscleGroup: 'traps',     movementPattern: 'isolation',  count: 1 },
  ],
  legs: [
    { muscleGroup: 'quads',      movementPattern: 'squat',     count: 1 },
    { muscleGroup: 'hamstrings', movementPattern: 'hinge',     count: 1 },
    { muscleGroup: 'quads',      movementPattern: 'isolation', count: 1 },
    { muscleGroup: 'hamstrings', movementPattern: 'isolation', count: 1 },
  ],
  glutes: [
    { muscleGroup: 'glutes',     movementPattern: 'isolation', count: 2 },
    { muscleGroup: 'hamstrings', movementPattern: 'hinge',     count: 1 },
  ],
  arms: [
    { muscleGroup: 'biceps',   movementPattern: 'isolation', count: 2 },
    { muscleGroup: 'triceps',  movementPattern: 'isolation', count: 2 },
    { muscleGroup: 'forearms', movementPattern: 'isolation', count: 1 },
  ],
  push: [
    { muscleGroup: 'chest',     movementPattern: 'push',      count: 2 },
    { muscleGroup: 'shoulders', movementPattern: 'push',      count: 1 },
    { muscleGroup: 'shoulders', movementPattern: 'isolation',  count: 1 },
    { muscleGroup: 'triceps',   movementPattern: 'isolation',  count: 1 },
  ],
  pull: [
    { muscleGroup: 'back',   movementPattern: 'pull',       count: 2 },
    { muscleGroup: 'lats',   movementPattern: 'pull',       count: 1 },
    { muscleGroup: 'biceps', movementPattern: 'isolation',  count: 2 },
  ],
  core: [
    { muscleGroup: 'core', movementPattern: 'isolation', count: 3 },
    { muscleGroup: 'core', movementPattern: 'carry',     count: 1 },
  ],
}

// ── Pure functions ────────────────────────────────────────────────────────────

/**
 * Returns suggested next exercises for a blank workout session.
 *
 * Entirely client-side — operates on the cached exercise list and the
 * per-session frequency map (fetched once at workout start).
 *
 * Priority order:
 *   1. Successor pattern priority from MOVEMENT_SUCCESSORS
 *   2. Familiarity boost — exercises the user has done before rank higher
 *
 * @param lastExercise       The exercise just completed
 * @param allExercises       Full exercise list from Zustand cache
 * @param alreadyInWorkout   IDs of exercises already added this session
 * @param usageFrequency     exerciseId → how many times used (last 90 days)
 * @param limit              Max suggestions to return (default 3)
 */
export function getNextExerciseSuggestions(
  lastExercise:     Exercise,
  allExercises:     Exercise[],
  alreadyInWorkout: string[],
  usageFrequency:   Map<string, number>,
  limit = 3,
): Exercise[] {
  const key = `${lastExercise.muscle_group}-${lastExercise.movement_pattern}` as MovementKey
  const successors = MOVEMENT_SUCCESSORS[key]
  if (!successors || successors.length === 0) return []

  const excluded = new Set(alreadyInWorkout)
  excluded.add(lastExercise.id)  // don't suggest the exercise just done

  return allExercises
    .filter(ex =>
      !excluded.has(ex.id) &&
      successors.some(
        s => s.muscleGroup === ex.muscle_group && s.movementPattern === ex.movement_pattern
      )
    )
    .map(ex => {
      const pattern = successors.find(
        s => s.muscleGroup === ex.muscle_group && s.movementPattern === ex.movement_pattern
      )
      // Lower score = shown first
      // Pattern priority (0–10) minus a small familiarity bonus
      const score = (pattern?.priority ?? 99) - Math.min((usageFrequency.get(ex.id) ?? 0) * 0.1, 2)
      return { exercise: ex, score }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(r => r.exercise)
}

/**
 * Returns exercises to pre-populate a blank workout based on the selected focus.
 *
 * Entirely client-side — filters the cached exercise list.
 * Falls back to pattern-based defaults when history frequency is unavailable.
 *
 * @param focusKey       Key from WORKOUT_FOCUS_DEFAULTS (e.g. 'chest', 'push')
 * @param allExercises   Full exercise list from Zustand cache
 * @param usageFrequency exerciseId → usage count (may be empty for new users)
 */
export function getDefaultExercisesForFocus(
  focusKey:       string,
  allExercises:   Exercise[],
  usageFrequency: Map<string, number>,
): Exercise[] {
  const patterns = WORKOUT_FOCUS_DEFAULTS[focusKey]
  if (!patterns) return []

  const result: Exercise[] = []
  const used = new Set<string>()

  for (const pattern of patterns) {
    const candidates = allExercises
      .filter(ex =>
        !used.has(ex.id) &&
        ex.muscle_group     === pattern.muscleGroup &&
        ex.movement_pattern === pattern.movementPattern
      )
      .map(ex => ({ exercise: ex, usage: usageFrequency.get(ex.id) ?? 0 }))
      .sort((a, b) => b.usage - a.usage)  // most-used first
      .slice(0, pattern.count)
      .map(r => r.exercise)

    candidates.forEach(ex => { result.push(ex); used.add(ex.id) })
  }

  return result
}

/**
 * Returns the effective weekly set target for a muscle group,
 * adjusted for the user's training phase.
 */
export function getAdjustedWeeklyTarget(
  muscle:  MuscleGroup,
  style:   TrainingStyle,
  phase:   TrainingPhase,
): WeeklySetTarget {
  const base       = WEEKLY_SET_TARGETS[muscle][style]
  const multiplier = PHASE_VOLUME_MULTIPLIER[phase]
  return {
    min: Math.round(base.min * multiplier),
    max: Math.round(base.max * multiplier),
  }
}
