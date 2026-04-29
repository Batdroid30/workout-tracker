import type { WeeklyVolume, TrainingGoal, ExperienceLevel, TrainingPhase } from '@/types/database'
import { REP_RANGES, WEIGHT_INCREMENTS, DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'

/**
 * Weekly training summary — one entry per calendar week.
 * Computed from existing workouts + sets data, no new DB columns needed.
 */
export interface WeekSummary {
  week_start: string      // ISO date string of Monday
  total_volume: number    // kg lifted that week
  workout_count: number   // sessions that week
  avg_rpe: number | null  // null for most users until RPE input is added
}

/**
 * Result of the multi-signal fatigue assessment.
 */
export interface FatigueAssessment {
  shouldSuggest: boolean
  confidence: 'low' | 'medium' | 'high'
  signals: string[]       // human-readable strings shown in the DeloadCard
}

/**
 * Multi-signal fatigue assessment.
 *
 * Scoring:
 *   volume_declining  (+2) — volume down ≥10% for 2+ consecutive weeks
 *                            while workout_count is stable
 *   pr_drought        (+2) — no PR in 21+ days despite consistent training
 *   long_streak       (+1) — 6+ consecutive weeks of consistent training
 *   high_rpe          (+2) — avg_rpe ≥ 8.5 for 2+ weeks
 *   mesocycle_length  (+1/+2) — past the recommended deload threshold for
 *                               the user's experience + training phase
 *
 *   score 0-1  → no suggestion
 *   score 2    → confidence: low
 *   score 3    → confidence: medium
 *   score 4+   → confidence: high
 */
export function assessFatigueLevel(
  weeks: WeekSummary[],
  daysSinceLastPR: number | null,
  profile?: {
    experience_level: ExperienceLevel | null
    training_phase:   TrainingPhase   | null
    phase_started_at: string          | null
  } | null,
): FatigueAssessment {
  const empty: FatigueAssessment = { shouldSuggest: false, confidence: 'low', signals: [] }
  if (weeks.length < 3) return empty

  const sorted = [...weeks].sort(
    (a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
  )

  let score = 0
  const signals: string[] = []

  // ── Signal 1: volume declining while frequency is stable ────────────────
  const recent = sorted.slice(-3)  // last 3 weeks
  const [w3, w2, w1] = recent      // oldest → newest

  const frequencyStable =
    Math.abs(w1.workout_count - w2.workout_count) <= 1 &&
    Math.abs(w2.workout_count - w3.workout_count) <= 1 &&
    w1.workout_count >= 1 && w2.workout_count >= 1

  if (frequencyStable && w3.total_volume > 0 && w2.total_volume > 0) {
    const drop1 = (w3.total_volume - w2.total_volume) / w3.total_volume
    const drop2 = (w2.total_volume - w1.total_volume) / w2.total_volume

    if (drop1 >= 0.1 && drop2 >= 0.1) {
      const totalDrop = Math.round(((w3.total_volume - w1.total_volume) / w3.total_volume) * 100)
      score += 2
      signals.push(`Volume down ${totalDrop}% over the last 3 weeks`)
    }
  }

  // ── Signal 2: PR drought despite consistent training ────────────────────
  const recentWeeksActive = sorted.slice(-4).filter(w => w.workout_count >= 2).length
  const trainingConsistently = recentWeeksActive >= 3

  if (daysSinceLastPR !== null && daysSinceLastPR >= 21 && trainingConsistently) {
    score += 2
    signals.push(`No new PRs in ${daysSinceLastPR} days`)
  } else if (daysSinceLastPR === null && trainingConsistently && sorted.length >= 6) {
    // Has been training for a while but never hit a PR — also a signal
    score += 1
    signals.push('No PRs recorded in recent training')
  }

  // ── Signal 3: long unbroken streak ──────────────────────────────────────
  const activeWeeks = sorted.filter(w => w.workout_count >= 2)
  if (activeWeeks.length >= 6) {
    // Check they are consecutive (no week with 0 sessions in between)
    const allWeeksActive = sorted.slice(-6).every(w => w.workout_count >= 1)
    if (allWeeksActive) {
      score += 1
      signals.push(`${sorted.slice(-6).length}+ weeks of continuous training`)
    }
  }

  // ── Signal 4: high RPE ──────────────────────────────────────────────────────
  const recentWithRPE = sorted.slice(-2).filter(w => w.avg_rpe !== null)
  if (recentWithRPE.length === 2 && recentWithRPE.every(w => (w.avg_rpe ?? 0) >= 8.5)) {
    score += 2
    const avgRPE = (recentWithRPE.reduce((s, w) => s + (w.avg_rpe ?? 0), 0) / 2).toFixed(1)
    signals.push(`Average RPE of ${avgRPE} over the last 2 weeks`)
  }

  // ── Signal 5: mesocycle too long ─────────────────────────────────────────
  // Uses phase_started_at from profile — no extra DB query.
  if (profile?.phase_started_at) {
    const experience = profile.experience_level ?? 'intermediate'
    const phase      = profile.training_phase   ?? 'maingaining'
    const threshold  = DELOAD_THRESHOLDS[experience][phase]
    const weeksInPhase = (Date.now() - new Date(profile.phase_started_at).getTime()) / (7 * 24 * 60 * 60 * 1000)

    if (weeksInPhase >= threshold + 2) {
      score += 2
      signals.push(`${Math.floor(weeksInPhase)} weeks since last deload — well overdue`)
    } else if (weeksInPhase >= threshold) {
      score += 1
      signals.push(`${Math.floor(weeksInPhase)} weeks of continuous training — a deload week is due`)
    }
  }

  if (score < 2) return empty

  const confidence: FatigueAssessment['confidence'] =
    score >= 4 ? 'high' : score === 3 ? 'medium' : 'low'

  return { shouldSuggest: true, confidence, signals }
}

/**
 * Epley formula for estimated 1-rep max.
 * Accurate within ±3.5% for 1–10 rep ranges.
 */
export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return Number((weight * (1 + reps / 30)).toFixed(1))
}

export interface OverloadSuggestion {
  weight_kg:   number
  target_reps: number
  reason:      string
}

interface SuggestNextSetParams {
  lastWeight:      number
  lastReps:        number
  /** Compound lifts (squat, bench, row) use larger jumps than isolation. */
  exerciseType?:   'compound' | 'isolation'
  trainingGoal?:   TrainingGoal    | null
  experienceLevel?:ExperienceLevel | null
}

/**
 * Double-progression overload suggestion, personalised to the user's goal
 * and experience level.
 *
 * Goal drives the rep range target:
 *   strength  → 3–6 reps, heavier weight jumps
 *   muscle    → 8–15 reps, moderate jumps
 *   both      → 5–10 reps
 *
 * Experience drives the weight increment:
 *   beginner     → +5kg compounds / +2.5kg isolation
 *   intermediate → +2.5kg / +1.25kg
 *   advanced     → +1.25kg / +1.25kg
 */
export function suggestNextSet({
  lastWeight,
  lastReps,
  exerciseType    = 'compound',
  trainingGoal    = null,
  experienceLevel = null,
}: SuggestNextSetParams): OverloadSuggestion {
  const range     = REP_RANGES[trainingGoal ?? 'muscle']
  const increment = WEIGHT_INCREMENTS[experienceLevel ?? 'intermediate'][exerciseType]

  if (lastReps >= range.max) {
    return {
      weight_kg:   lastWeight + increment,
      target_reps: range.min,
      reason: `Hit ${range.max} reps — add ${increment}kg and reset to ${range.min} reps.`,
    }
  }

  if (lastReps >= range.min) {
    return {
      weight_kg:   lastWeight,
      target_reps: lastReps + 1,
      reason: `Keep weight steady. Push for ${lastReps + 1} reps this set.`,
    }
  }

  return {
    weight_kg:   Math.max(0, lastWeight - increment),
    target_reps: range.max,
    reason: `Fell below ${range.min} reps — drop ${increment}kg and rebuild to ${range.max}.`,
  }
}

// ─── Deload routine generator ─────────────────────────────────────────────────
//
// Standard deload prescription (well-supported by the literature):
//   • Same exercises and frequency as the previous training week
//   • Working weight reduced to ~60% of last load (rounded to 2.5kg)
//   • 2 fewer reps per set (or floor of 5) — keeping bar speed crisp
//   • 3 sets per exercise — enough to maintain motor patterns, not to fatigue
//
// Pure function — takes the user's recent loads and emits a prescription.
// No DB access here; the caller fetches the inputs.

export interface RecentExerciseLoad {
  exerciseId:   string
  exerciseName: string
  muscleGroup:  string
  /** Last working set weight (kg). */
  lastWeight: number
  /** Last working set reps. */
  lastReps:   number
}

export interface DeloadPrescription {
  exerciseId:   string
  exerciseName: string
  muscleGroup:  string
  sets:         number
  weight_kg:    number
  reps:         number
}

/** Round to nearest 2.5 kg — matches gym plate granularity. */
function roundToPlate(weight: number): number {
  return Math.max(0, Math.round(weight / 2.5) * 2.5)
}

export function generateDeloadRoutine(loads: RecentExerciseLoad[]): DeloadPrescription[] {
  return loads.map(load => ({
    exerciseId:   load.exerciseId,
    exerciseName: load.exerciseName,
    muscleGroup:  load.muscleGroup,
    sets:         3,
    weight_kg:    roundToPlate(load.lastWeight * 0.6),
    reps:         Math.max(5, load.lastReps - 2),
  }))
}
