import type { WeeklyVolume, TrainingGoal, ExperienceLevel, TrainingPhase } from '@/types/database'
import { REP_RANGES, WEIGHT_INCREMENTS, DELOAD_THRESHOLDS, STALL_THRESHOLD_PCT, TARGET_RPE, type RepRange } from '@/lib/workout-intelligence'

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
  score: number           // total fatigue score
  signals: string[]       // human-readable strings shown in the DeloadCard
  /**
   * True when a missed week was detected: the user already got unplanned rest
   * so a deload suggestion was suppressed. UI should show a ramp-back-up note
   * instead of a recovery week card.
   */
  recoveryMode?: boolean
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
  readinessLogs?: { sleep_score: number; soreness_score: number; energy_score: number }[] | null,
): FatigueAssessment {
  const empty: FatigueAssessment = { shouldSuggest: false, confidence: 'low', score: 0, signals: [] }
  if (weeks.length < 3) return empty

  const sorted = [...weeks].sort(
    (a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
  )

  // ── Missed workout detection ─────────────────────────────────────────────────
  // If the user hasn't trained since at least one full calendar week ago, they
  // already got unplanned rest. A deload on top of that would cause unnecessary
  // detraining rather than recovery. Suppress the suggestion and signal
  // recovery-ramp-up mode to the UI instead.
  //
  // We find "last week's Monday" (the most recently completed ISO week) and
  // compare it to the most recent week in the data. If the data is older than
  // last week, at least one full week was skipped.
  const lastWeekMonday = (() => {
    const today = new Date()
    const dayOfWeek = today.getUTCDay()
    const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6  // go back to Mon of prev week
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - daysToLastMonday)
    return d.toISOString().split('T')[0]
  })()

  const mostRecentWeek = sorted[sorted.length - 1].week_start
  if (mostRecentWeek < lastWeekMonday) {
    // Most recent data is older than last week → user missed at least one full week
    return { shouldSuggest: false, confidence: 'low', score: 0, signals: [], recoveryMode: true }
  }

  // Detect missed sessions within the most recent week.
  // If the user trained significantly less than their usual frequency, volume
  // decline may be explained by absence rather than accumulated fatigue.
  // We reduce the score proportionally so false signals don't stack up.
  const priorWeeks = sorted.slice(0, -1)
  const priorAvgSessions = priorWeeks.length > 0
    ? priorWeeks.reduce((s, w) => s + w.workout_count, 0) / priorWeeks.length
    : 0
  const recentWeek = sorted[sorted.length - 1]
  const missedSessions = Math.max(0, Math.round(priorAvgSessions) - recentWeek.workout_count)
  // 2+ missed sessions: volume-decline and streak signals are unreliable.
  // We'll track this and subtract from the score at the end.
  const missedSessionPenalty = missedSessions >= 2 ? 2 : 0

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

  // ── Signal 6: subjective readiness ──────────────────────────────────────
  if (readinessLogs && readinessLogs.length >= 3) {
    const avgScore = readinessLogs.reduce((acc, log) => acc + log.sleep_score + log.soreness_score + log.energy_score, 0) / (readinessLogs.length * 3)
    if (avgScore <= 2.5) {
      score += 2
      signals.push(`Subjective readiness is very low (avg ${avgScore.toFixed(1)}/5)`)
    } else if (avgScore <= 3.2) {
      score += 1
      signals.push(`Subjective readiness is trending down (avg ${avgScore.toFixed(1)}/5)`)
    }
  }

  // Apply penalty for missed sessions: subtract from score so signals driven
  // by absence (volume drop, broken streak) don't incorrectly trigger a deload.
  const adjustedScore = Math.max(0, score - missedSessionPenalty)

  if (adjustedScore < 2) return { ...empty, score: adjustedScore, signals }

  const confidence: FatigueAssessment['confidence'] =
    adjustedScore >= 4 ? 'high' : adjustedScore === 3 ? 'medium' : 'low'

  return { shouldSuggest: true, confidence, score: adjustedScore, signals }
}

/**
 * Epley formula for estimated 1-rep max.
 * Accurate within ±3.5% for 1–10 rep ranges.
 */
export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return Number((weight * (1 + reps / 30)).toFixed(1))
}

/**
 * Brzycki formula for estimated 1-rep max.
 * Complementary to Epley — averaging both reduces population-specific bias.
 * Only valid for 1–10 reps; degrades significantly above that.
 */
export function calculateBrzycki1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  if (reps >= 37) return weight  // denominator approaches zero — formula breaks down
  return Number((weight * (36 / (37 - reps))).toFixed(1))
}

/**
 * Averaged Epley + Brzycki 1RM estimate.
 * Falls back to Epley alone above 10 reps where Brzycki degrades.
 * Use this everywhere a 1RM estimate is needed.
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  if (reps > 10) return calculateEpley1RM(weight, reps)
  return Number(((calculateEpley1RM(weight, reps) + calculateBrzycki1RM(weight, reps)) / 2).toFixed(1))
}

/**
 * Converts an RPE value to Reps In Reserve.
 * RPE 10 = 0 RIR (failure), RPE 8 = 2 RIR (optimal sweet spot), etc.
 */
export function rpeToRIR(rpe: number): number {
  return Math.max(0, Math.round(10 - rpe))
}

// ─── TDEE / Nutrition targets ─────────────────────────────────────────────────
//
// Mifflin-St Jeor (1990) is the most validated BMR formula for general
// populations (Thomas 2016 meta-analysis: lowest mean bias across BMI ranges).
//
// Activity multiplier is estimated from weekly session count — using a
// fixed "moderate" 1.55 would underestimate for high-frequency athletes.
//
// Calorie targets per phase (Israetel 2019, Helms 2015):
//   Bulk: TDEE + 250 kcal  — lean bulk aiming for ~0.3–0.5% BW/week gain
//   Cut:  TDEE − 500 kcal  — moderate deficit, ~0.5 kg/week loss
//   Maingain: TDEE         — maintenance with slight natural surplus
//
// Protein targets (Stokes 2018, Morton 2018 meta-analysis):
//   Bulk/Maingain: 1.8 g/kg — adequate for muscle protein synthesis
//   Cut:           2.2 g/kg — higher to preserve lean mass in deficit

export interface NutritionTargets {
  tdee:          number   // maintenance calories (kcal/day)
  targetCalories: number  // phase-adjusted calorie target
  proteinGrams:  number   // daily protein target (g)
  surplusDeficit: number  // positive = surplus, negative = deficit
}

export function calculateNutritionTargets({
  weightKg,
  heightCm,
  ageYears,
  sex,
  weeklyGoalSessions,
  trainingPhase,
}: {
  weightKg:           number
  heightCm:           number
  ageYears:           number
  sex:                'male' | 'female'
  weeklyGoalSessions: number
  trainingPhase:      'bulking' | 'cutting' | 'maingaining' | null
}): NutritionTargets | null {
  // Mifflin-St Jeor BMR
  const sexOffset = sex === 'male' ? 5 : -161
  const bmr       = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + sexOffset

  // Extreme-but-valid inputs (e.g. age 90, weight 45 kg) can produce a BMR
  // too low to be meaningful — guard before multiplying by activity factor.
  if (bmr < 800) return null

  // Activity multiplier from session frequency
  const activityFactor =
    weeklyGoalSessions <= 2 ? 1.375 :
    weeklyGoalSessions <= 4 ? 1.55  :
    weeklyGoalSessions <= 6 ? 1.725 : 1.9

  const tdee = Math.round(bmr * activityFactor)

  const surplusDeficit =
    trainingPhase === 'bulking'  ?  250 :
    trainingPhase === 'cutting'  ? -500 : 0

  const targetCalories = tdee + surplusDeficit

  const proteinMultiplier = trainingPhase === 'cutting' ? 2.2 : 1.8
  const proteinGrams      = Math.round(weightKg * proteinMultiplier)

  return { tdee, targetCalories, proteinGrams, surplusDeficit }
}

export interface OverloadSuggestion {
  weight_kg:   number
  target_reps: number
  rpe_target:  number
  reason:      string
}

interface SuggestNextSetParams {
  lastWeight:       number
  lastReps:         number
  /**
   * RPE logged on this set last session.
   * When provided, the suggestion is calibrated against TARGET_RPE for the
   * user's goal — too hard means hold the weight, too easy means push harder.
   */
  lastRPE?:         number
  /** Compound lifts (squat, bench, row) use larger jumps than isolation. */
  exerciseType?:    'compound' | 'isolation'
  trainingGoal?:    TrainingGoal    | null
  experienceLevel?: ExperienceLevel | null
  /**
   * When provided, overrides the goal-based rep range with today's DUP scheme
   * target. This keeps suggestions coherent with the range shown in the
   * workout header — they must always agree.
   */
  dupRepRange?:    RepRange | null
  /**
   * When provided, overrides the goal-based RPE target with the DUP scheme's
   * rpeTarget for the current week. Prevents Volume Week (RPE 7.0) from being
   * calibrated against a goal target (muscle=7.5, both=8.0) that doesn't match.
   */
  dupRpeTarget?:   number | null
  /**
   * When true, overrides normal progression with deload-appropriate loads:
   * ~60% of last weight, 5–8 reps, RPE 6.0.
   */
  isDeloadWeek?: boolean
  /**
   * Progression model from the routine exercise. 'rep_sum' uses total reps
   * across all sets as the progression trigger instead of per-set rep ranges.
   */
  progressionModel?: 'double' | 'rep_sum' | null
  /**
   * Target total reps across all working sets for this exercise (rep_sum mode).
   */
  repSumTarget?: number | null
  /**
   * Total working reps completed for this exercise in the previous session.
   * undefined = no history yet (first session). Used in rep_sum mode only.
   */
  prevTotalReps?: number
}

/**
 * Progressive overload suggestion, personalised to the user's goal,
 * experience level, and — when RPE data is available — last session's effort.
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
 *
 * RPE calibration (when lastRPE is provided):
 *   Each RPE unit ≈ 2.5% of 1RM (Tuchscherer 2008).
 *   deviation = lastRPE − targetRPE
 *   deviation > +1.5 → too hard: back off weight before progressing
 *   deviation < −1.5 → too easy: progress more aggressively
 *   otherwise        → standard double-progression
 */
export function suggestNextSet({
  lastWeight,
  lastReps,
  lastRPE,
  exerciseType      = 'compound',
  trainingGoal      = null,
  experienceLevel   = null,
  dupRepRange       = null,
  dupRpeTarget      = null,
  isDeloadWeek      = false,
  progressionModel  = null,
  repSumTarget      = null,
  prevTotalReps,
}: SuggestNextSetParams): OverloadSuggestion {
  // ── Deload week override ─────────────────────────────────────────────────────
  // Science: reduce VOLUME (sets), maintain INTENSITY (weight).
  // Dropping both causes neuromuscular detraining — slow return next block.
  // Weight stays at ~87% of recent load; sets are cut at the session level.
  if (isDeloadWeek) {
    const deloadWeight = roundToPlate(lastWeight * 0.87)
    return {
      weight_kg:   Math.max(deloadWeight, 2.5),
      target_reps: lastReps,
      rpe_target:  7.0,
      reason:      'Deload week — maintain load at ~87%, cut total sets. Preserve strength, let fatigue clear.',
    }
  }

  // ── Rep-sum progression ───────────────────────────────────────────────────────
  // Progression trigger: total reps across all sets crosses repSumTarget.
  // Science: accumulating reps is more relevant for hypertrophy than per-set
  // rep ranges (Schoenfeld, 2017). This mode suits exercises where per-set
  // rep variance is high (e.g. bodyweight rows, dips).
  if (progressionModel === 'rep_sum' && repSumTarget != null) {
    const increment = WEIGHT_INCREMENTS[experienceLevel ?? 'intermediate'][exerciseType]
    const targetRPE = dupRpeTarget ?? TARGET_RPE[trainingGoal ?? 'both']
    if (prevTotalReps === undefined) {
      return {
        weight_kg:   lastWeight,
        target_reps: lastReps,
        rpe_target:  targetRPE,
        reason:      `Rep bank target: ${repSumTarget} total reps. First session — build your baseline.`,
      }
    }
    if (prevTotalReps >= repSumTarget) {
      return {
        weight_kg:   lastWeight + increment,
        target_reps: lastReps,
        rpe_target:  targetRPE,
        reason:      `Hit ${repSumTarget} total reps last session — add ${increment}kg and rebuild.`,
      }
    }
    const remaining = repSumTarget - prevTotalReps
    return {
      weight_kg:   lastWeight,
      target_reps: lastReps,
      rpe_target:  targetRPE,
      reason:      `Rep bank: ${prevTotalReps}/${repSumTarget} last session — ${remaining} more reps to earn a weight bump.`,
    }
  }

  // DUP scheme range takes precedence — keeps suggestions coherent with the
  // week label and rep range shown in the workout header.
  const range     = dupRepRange ?? REP_RANGES[trainingGoal ?? 'muscle']
  const increment = WEIGHT_INCREMENTS[experienceLevel ?? 'intermediate'][exerciseType]
  // Resolved RPE target — shared across all return paths so it can be included
  // in the suggestion and used to pre-fill the RPE input in the UI.
  const targetRPE = dupRpeTarget ?? TARGET_RPE[trainingGoal ?? 'both']

  // ── Cross-phase WUP transition ──────────────────────────────────────────────
  // lastReps outside the current range means the WUP week changed (e.g. Hyp → Volume).
  // Fixed-increment adjustments produce nonsensical load/rep combinations across phases.
  // Use e1RM to back-calculate a sensible starting load for the new rep range instead.
  if (lastReps < range.min || lastReps > range.max) {
    // Account for reps in reserve when RPE is known — gives a more accurate e1RM.
    // When no RPE was logged, assume RPE 8 (2 RIR) as a working-set default rather
    // than treating the last rep as failure, which underestimates e1RM and produces
    // a weight that feels too light when transitioning to a lower-rep phase.
    const repsToFailure = lastRPE != null ? lastReps + (10 - lastRPE) : lastReps + 2
    const e1rm = calculate1RM(lastWeight, repsToFailure)
    // At targetRPE the lifter has (10 - targetRPE) reps in reserve on the final rep.
    const targetRepsToFailure = range.min + (10 - targetRPE)
    const targetWeight = roundToPlate(e1rm / (1 + targetRepsToFailure / 30))
    return {
      weight_kg:   targetWeight,
      target_reps: range.min,
      rpe_target:  targetRPE,
      reason:      `Week changed to ${range.min}–${range.max} reps — starting weight estimated from your recent performance.`,
    }
  }

  // ── RPE calibration ───────────────────────────────────────────────────────
  if (lastRPE != null) {
    const deviation = lastRPE - targetRPE

    if (deviation > 1.5) {
      // Last session was too hard — back off before adding load.
      // Each unit over target ≈ 2.5% reduction, capped at 2 standard increments.
      const backoffPct     = Math.min(deviation * 0.025, (increment * 2) / lastWeight)
      const adjustedWeight = roundToPlate(lastWeight * (1 - backoffPct))
      return {
        weight_kg:   Math.max(adjustedWeight, lastWeight - increment * 2),
        target_reps: range.min,
        rpe_target:  targetRPE,
        reason:      `RPE ${lastRPE} last session was above target — consolidate at reduced load before progressing.`,
      }
    }

    if (deviation < -1.5) {
      // Last session was too easy — progress more aggressively.
      if (lastReps >= range.max) {
        return {
          weight_kg:   lastWeight + increment,
          target_reps: range.min + 1, // start 1 above minimum since capacity is clearly there
          rpe_target:  targetRPE,
          reason:      `RPE ${lastRPE} was well below target — progress the load with confidence.`,
        }
      }
      return {
        weight_kg:   lastWeight,
        target_reps: Math.min(lastReps + 2, range.max), // add 2 reps instead of 1
        rpe_target:  targetRPE,
        reason:      `RPE ${lastRPE} was below target — push for ${Math.min(lastReps + 2, range.max)} reps.`,
      }
    }
    // deviation within ±1.5 → on target, fall through to standard double-progression
  }

  // ── Standard double-progression ──────────────────────────────────────────
  if (lastReps >= range.max) {
    return {
      weight_kg:   lastWeight + increment,
      target_reps: range.min,
      rpe_target:  targetRPE,
      reason: `Hit ${range.max} reps — add ${increment}kg and reset to ${range.min} reps.`,
    }
  }

  return {
    weight_kg:   lastWeight,
    target_reps: lastReps + 1,
    rpe_target:  targetRPE,
    reason: `Keep weight steady. Push for ${lastReps + 1} reps this set.`,
  }
}

// ─── Deload routine generator ─────────────────────────────────────────────────
//
// Evidence-based deload prescription:
//   • Same exercises and frequency as the previous training week
//   • Volume cut 30–50%: fewer sets (2–3), reps maintained
//   • Intensity maintained: weight stays at 82–92% of last load
//   • Dropping both volume AND intensity causes neuromuscular detraining
//     and a sluggish return to the following mesocycle (Israetel, 2019)
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
  /** RPE logged on the last working set — enables RPE calibration in suggestions. */
  lastRPE?:   number
}

export interface DeloadPrescription {
  exerciseId:   string
  exerciseName: string
  muscleGroup:  string
  sets:         number
  weight_kg:    number
  reps:         number
}

/** Round to nearest 2.5 kg — matches gym plate granularity. Minimum 2.5 kg. */
function roundToPlate(weight: number): number {
  return Math.max(2.5, Math.round(weight / 2.5) * 2.5)
}

// Deload depth scales with how fatigued the athlete actually is.
// Volume (sets) is reduced; intensity (weight) is maintained to preserve
// neuromuscular efficiency for the next training block.
// Over-deloading when the signal is weak causes unnecessary detraining.
// Under-deloading when the signal is strong fails to restore the CNS and joints.
const DELOAD_PARAMS: Record<
  FatigueAssessment['confidence'],
  { intensityFactor: number; sets: number; repReduction: number }
> = {
  low:    { intensityFactor: 0.92, sets: 3, repReduction: 0 }, // light taper — mostly sets reduced
  medium: { intensityFactor: 0.87, sets: 3, repReduction: 0 }, // standard deload
  high:   { intensityFactor: 0.82, sets: 2, repReduction: 0 }, // deep recovery — cut to 2 sets
}

/**
 * Generates a one-week deload prescription from the user's recent training loads.
 *
 * @param loads       Most-recent working set per exercise (last 14 days).
 * @param confidence  Fatigue assessment confidence — drives how deep the deload is.
 *                    Defaults to 'medium' for the general deload prescription.
 */
export function generateDeloadRoutine(
  loads:      RecentExerciseLoad[],
  confidence: FatigueAssessment['confidence'] = 'medium',
): DeloadPrescription[] {
  const { intensityFactor, sets, repReduction } = DELOAD_PARAMS[confidence]
  return loads.map(load => ({
    exerciseId:   load.exerciseId,
    exerciseName: load.exerciseName,
    muscleGroup:  load.muscleGroup,
    sets,
    weight_kg:    roundToPlate(load.lastWeight * intensityFactor),
    reps:         load.lastReps,  // maintain reps — only sets are cut
  }))
}

// ─── Per-exercise coach insights ──────────────────────────────────────────────
//
// Pure function — no DB, no async. Receives the progression array already
// fetched by getExerciseProgression() and returns 1–3 actionable tips.
//
// Signals analysed (in priority order):
//   1. e1RM trend      — last 4 sessions vs previous 4 (positive/stall/decline)
//   2. Peak proximity  — how far the current e1RM is from the all-time best
//   3. Volume trend    — session volume trajectory across the last 4 sessions
//   4. Frequency       — sessions per week over the last 30 days

export interface ExerciseInsight {
  type: 'positive' | 'warning' | 'info'
  message: string
}

export function deriveExerciseInsights(
  progression: { date: string; maxWeight: number; best1RM: number; volume: number }[],
  experienceLevel: ExperienceLevel | null = null,
): ExerciseInsight[] {
  if (progression.length < 3) return []

  const insights: ExerciseInsight[] = []
  const sorted      = [...progression].sort((a, b) => a.date.localeCompare(b.date))
  const allTimePeak = Math.max(...sorted.map(p => p.best1RM))
  const current     = sorted[sorted.length - 1]
  const pctFromPeak = (current.best1RM / allTimePeak) * 100

  // ── Signal 1: e1RM trend (last 4 sessions vs previous 4) ─────────────────
  const last4 = sorted.slice(-4)
  const prev4 = sorted.slice(-8, -4)

  if (prev4.length >= 2) {
    const recentAvg  = last4.reduce((s, p) => s + p.best1RM, 0) / last4.length
    const prevAvg    = prev4.reduce((s, p) => s + p.best1RM, 0) / prev4.length
    const changePct  = ((recentAvg - prevAvg) / prevAvg) * 100
    // Use the experience-appropriate threshold so a beginner needs more change
    // to be "healthy" than an advanced lifter, matching STALL_THRESHOLD_PCT.
    const stallFloor = STALL_THRESHOLD_PCT[experienceLevel ?? 'intermediate']

    if (changePct >= stallFloor * 2) {
      insights.push({
        type: 'positive',
        message: `e1RM is up ${changePct.toFixed(1)}% over your last 8 sessions — strong upward trend. Keep pushing the top of your rep range before adding weight.`,
      })
    } else if (changePct < -2) {
      insights.push({
        type: 'warning',
        message: `e1RM has dropped ${Math.abs(changePct).toFixed(1)}% recently. Accumulated fatigue is likely — consider a deload week for this lift specifically before pushing heavy again.`,
      })
    } else if (changePct < stallFloor) {
      insights.push({
        type: 'warning',
        message: `Progress has plateaued over your last ${last4.length} sessions. Try shifting to a lower rep range (3–5) for 3 weeks to drive new strength, or swap to a variation that hits the same muscle from a different angle.`,
      })
    } else {
      insights.push({
        type: 'positive',
        message: `Steady progress — e1RM up ${changePct.toFixed(1)}% over your last 8 sessions. Stay consistent with your current rep range.`,
      })
    }
  } else {
    // Not enough history for a block comparison — show overall gain instead
    const first   = sorted[0]
    const gainPct = ((current.best1RM - first.best1RM) / first.best1RM) * 100
    if (gainPct > 0) {
      insights.push({
        type: 'positive',
        message: `Up ${gainPct.toFixed(1)}% from your first session — keep building. Log a few more sessions to unlock trend analysis.`,
      })
    }
  }

  // ── Signal 2: peak proximity ──────────────────────────────────────────────
  if (pctFromPeak >= 99) {
    insights.push({
      type: 'positive',
      message: `You're at your all-time best e1RM. A new PR may be within reach — consider a peak week: work up to a heavy triple or double with crisp technique.`,
    })
  } else if (pctFromPeak < 88 && sorted.length >= 6) {
    insights.push({
      type: 'warning',
      message: `Current e1RM is ${(100 - pctFromPeak).toFixed(0)}% below your all-time best. Check recovery: sleep quality, calorie intake, and stress all have a direct impact on performance.`,
    })
  }

  // ── Signal 3: session volume trend (last 4 sessions) ─────────────────────
  if (last4.length >= 3) {
    const vols        = last4.map(p => p.volume)
    const volFirst    = vols[0]
    const volLast     = vols[vols.length - 1]
    const volDeltaPct = volFirst > 0 ? ((volLast - volFirst) / volFirst) * 100 : 0

    if (volDeltaPct >= 15) {
      insights.push({
        type: 'positive',
        message: `Session volume is up ${volDeltaPct.toFixed(0)}% — you're handling significantly more total work, which is a primary driver of hypertrophy.`,
      })
    } else if (volDeltaPct < -20) {
      insights.push({
        type: 'info',
        message: `Session volume has dropped ${Math.abs(volDeltaPct).toFixed(0)}% recently. If you're focusing on heavier intensity work, that's intentional and fine — otherwise it may signal fatigue or motivation dips.`,
      })
    }
  }

  // ── Signal 4: training frequency (last 30 days) ───────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const recentCount   = sorted.filter(p => p.date >= thirtyDaysAgo).length
  const freqPerWeek   = recentCount / 4.3  // 30 days ≈ 4.3 weeks

  if (recentCount >= 2 && freqPerWeek < 0.8) {
    insights.push({
      type: 'info',
      message: `You're training this exercise roughly ${Math.round(recentCount)}× per month. Increasing to 2× per week typically doubles the rate of strength adaptation for most lifters.`,
    })
  }

  // Cap at 3 — more than that becomes noise rather than signal
  return insights.slice(0, 3)
}
