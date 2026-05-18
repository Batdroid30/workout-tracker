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

export type MovementKey = `${MuscleGroup}-${MovementPattern}`

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

// Phase multipliers applied to the targets above.
// During a cut, volume targets are maintained — evidence shows ≥10 sets/muscle/week
// is required to preserve lean mass during caloric restriction.
export const PHASE_VOLUME_MULTIPLIER: Record<TrainingPhase, number> = {
  bulking:     1.1,   // slightly more volume — surplus supports recovery
  cutting:     1.0,   // maintain volume — fight to keep sets high during a cut
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

// ── Target RPE by training goal ───────────────────────────────────────────────
//
// Used by suggestNextSet() to calibrate whether last session's RPE was on
// target, too hard, or too easy.
//
// Each RPE unit ≈ 2.5% of 1RM (Tuchscherer 2008).
// Strength work tolerates higher RPE (closer to maximal effort).
// Hypertrophy is most effective at RPE 7–8 — high effort but not failure.

export const TARGET_RPE: Record<TrainingGoal, number> = {
  strength: 8.5,  // near-maximal, 1–2 RIR
  muscle:   7.5,  // moderate-high, 2–3 RIR
  both:     8.0,
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

// ── Stall variation advice — by movement pattern ─────────────────────────────
//
// When getStalledMovements() detects a plateau, these tips are attached to the
// result so the coach card and mission detail can give concrete, actionable
// advice rather than generic "switch rep range" copy.
//
// Each entry: 2–3 ordered tips (most impactful first).

export const STALL_VARIATION_ADVICE: Partial<Record<MovementKey, string[]>> = {
  'chest-push': [
    'Shift to 3–5 rep range for 3 weeks — higher intensity drives new strength that carries back into volume work.',
    'Add a 2-second pause at chest contact to eliminate the stretch reflex and build true pressing strength.',
    'Try incline bench for 2–3 sessions to change the stimulus; upper-chest strength transfers back to flat.',
  ],
  'chest-isolation': [
    'Increase time-under-tension with a 3-second eccentric on each rep.',
    'Switch to cables — constant tension through the full range hits the pecs harder than a machine at lockout.',
  ],
  'back-pull': [
    'Drop to 4–6 rep range for 3 weeks to build raw pulling strength before returning to volume work.',
    'Try chest-supported rows to remove lower-back fatigue and isolate the mid-back directly.',
    'Add a 1-second squeeze at full contraction — improves mind-muscle connection and motor recruitment.',
  ],
  'lats-pull': [
    'Supinate your grip (underhand) to recruit more biceps and achieve a stronger peak contraction.',
    'Try single-arm cable pulldowns to identify and fix side-to-side strength imbalances.',
    'Add a dead-hang stretch between sets for a fuller range of motion and greater lat recruitment.',
  ],
  'back-hinge': [
    'Switch to Romanian deadlifts for 3 weeks to build posterior-chain strength without compressive spinal load.',
    'Try deficit deadlifts (2–4 cm) to extend the range and build strength from a deeper starting position.',
    'Use a belt — it enables harder bracing and typically unlocks 5–10% more load immediately.',
  ],
  'shoulders-push': [
    'Drop to 3–5 reps for 3 weeks to build overhead pressing strength that carries back into volume sets.',
    'Switch to seated dumbbell press — each side works independently, exposing and fixing strength gaps.',
    'Add a 2-second pause at the bottom position to build strength out of the hole.',
  ],
  'shoulders-isolation': [
    'Drop weight 20% and focus on a strict 2-second eccentric — lateral raises respond better to tension than load.',
    'Try cables instead of dumbbells for constant tension through the full arc.',
    'Switch to prone incline lateral raises for rear-delt bias if front/rear balance is off.',
  ],
  'biceps-isolation': [
    'Use a 3-second eccentric — biceps respond strongly to lengthened-position tension.',
    'Try incline dumbbell curls for a greater stretch at the bottom and increased peak contraction.',
    'Switch to hammer curls (neutral grip) to target the brachialis and add upper-arm thickness.',
  ],
  'triceps-isolation': [
    'Try close-grip bench press — a compound tricep movement that allows far heavier loading than extensions.',
    'Switch from pushdowns to overhead cable extensions to train the long head in its stretched position.',
    'Add a 2-second pause at full extension to maximise the peak contraction.',
  ],
  'quads-squat': [
    'Add pause squats (3 seconds in the hole) to build strength at the sticking point out of the bottom.',
    'Include Bulgarian split squats — unilateral loading frequently breaks bilateral strength plateaus.',
    'Try front squats or goblet squats to force a more upright torso and increase direct quad drive.',
  ],
  'quads-isolation': [
    'Add a 2-second pause at full extension — peak contraction is the primary stimulus for the quads.',
    'Shift to a higher rep range (15–20) with shorter rest to increase metabolic stress and hypertrophy.',
  ],
  'hamstrings-hinge': [
    'Switch to single-leg RDLs for 2 weeks to correct side-to-side imbalances and improve hip stability.',
    'Add a 2-second pause at the bottom of each rep for a deeper hamstring stretch and greater stimulus.',
  ],
  'hamstrings-isolation': [
    'Perform leg curls with plantarflexed feet (toes pointed) to increase hamstring activation.',
    'Use a 3-second eccentric — hamstrings respond strongly to lengthened-position tension.',
  ],
  'glutes-isolation': [
    'Add a 1-second squeeze at the top of each rep — peak glute activation occurs at full hip extension.',
    'Switch to single-leg variations to load each glute independently and address imbalances.',
  ],
  'traps-isolation': [
    'Try dumbbell shrugs instead of a machine for greater range of motion and a stronger peak contraction.',
    'Hold the top position for 1–2 seconds on each rep.',
  ],
  'core-isolation': [
    'Add an isometric hold at the point of peak contraction on each rep.',
    'Progress to weighted variations (cable crunches, weighted leg raises) once bodyweight feels easy.',
  ],
}

// ── Weekly Undulating Periodization (WUP) rep schemes ────────────────────────
//
// Rotating rep schemes week-to-week produces better long-term results than
// fixed rep ranges for intermediate and advanced lifters (Rhea et al., 2002).
//
// Cycle length: 3 weeks (strength → hypertrophy → metabolic stress → repeat).
// Week index is derived from ISO week number modulo 3.

export interface WUPScheme {
  label:      string
  repRange:   RepRange
  rpeTarget:  number
  rationale:  string
}

/** @deprecated Use WUPScheme */
export type DUPScheme = WUPScheme

export const WUP_CYCLE: WUPScheme[] = [
  {
    label:     'Strength Week',
    repRange:  { min: 3, max: 5 },
    rpeTarget: 8.5,
    rationale: 'Low reps, heavy load — drives neuromuscular adaptation and 1RM strength.',
  },
  {
    label:     'Hypertrophy Week',
    repRange:  { min: 8, max: 12 },
    rpeTarget: 7.5,
    rationale: 'Moderate reps, moderate load — maximises muscle protein synthesis.',
  },
  {
    label:     'Volume Week',
    repRange:  { min: 13, max: 20 },
    rpeTarget: 7.0,
    rationale: 'Higher reps, metabolic stress — builds work capacity and muscle endurance.',
  },
]

/** @deprecated Use WUP_CYCLE */
export const DUP_CYCLE = WUP_CYCLE

/**
 * Returns the WUP scheme for the current ISO week.
 * The cycle resets every 3 weeks automatically — no user configuration needed.
 * Accepts an optional `now` date for testability; defaults to the current time.
 */
export function getCurrentWUPScheme(now: Date = new Date()): WUPScheme {
  const date = new Date(now)
  const dayOfWeek = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const isoWeek = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return WUP_CYCLE[isoWeek % 3]
}

/** @deprecated Use getCurrentWUPScheme */
export const getCurrentDUPScheme = getCurrentWUPScheme

/**
 * Returns true when the user is at or past their recommended deload threshold.
 * Used to override progression suggestions with recovery-appropriate loads.
 */
export function isCurrentWeekDeload(profile: {
  phase_started_at:  string | null
  experience_level:  ExperienceLevel | null
  training_phase:    TrainingPhase   | null
} | null): boolean {
  if (!profile?.phase_started_at) return false
  const experience  = profile.experience_level ?? 'intermediate'
  const phase       = profile.training_phase   ?? 'maingaining'
  const threshold   = DELOAD_THRESHOLDS[experience][phase]
  const weeksInPhase = (Date.now() - new Date(profile.phase_started_at).getTime()) / (7 * 24 * 60 * 60 * 1000)
  return weeksInPhase >= threshold
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
