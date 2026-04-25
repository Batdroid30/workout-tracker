import type { WeeklyVolume } from '@/types/database'

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
 * Multi-signal fatigue assessment — replaces the old checkDeloadNeeded.
 *
 * Works without RPE data (volume + frequency signals only), but gets
 * sharper once RPE input is wired up.
 *
 * Scoring:
 *   volume_declining  (+2) — volume down ≥10% for 2+ consecutive weeks
 *                            while workout_count is stable (rules out missed sessions)
 *   pr_drought        (+2) — no PR in 21+ days despite consistent training
 *   long_streak       (+1) — 6+ consecutive weeks of consistent training
 *   high_rpe          (+2) — avg_rpe ≥ 8.5 for 2+ weeks (future signal)
 *
 *   score 0-1  → no suggestion
 *   score 2    → confidence: low
 *   score 3    → confidence: medium
 *   score 4+   → confidence: high
 */
export function assessFatigueLevel(
  weeks: WeekSummary[],
  daysSinceLastPR: number | null
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

  // ── Signal 4: high RPE (future signal — fires once RPE input is live) ───
  const recentWithRPE = sorted.slice(-2).filter(w => w.avg_rpe !== null)
  if (recentWithRPE.length === 2 && recentWithRPE.every(w => (w.avg_rpe ?? 0) >= 8.5)) {
    score += 2
    const avgRPE = (recentWithRPE.reduce((s, w) => s + (w.avg_rpe ?? 0), 0) / 2).toFixed(1)
    signals.push(`Average RPE of ${avgRPE} over the last 2 weeks`)
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
  weight_kg: number
  target_reps: number
  reason: string
}

/**
 * Double progression overload suggestion.
 * If upper rep limit hit → bump weight 2.5kg, drop reps to lower bound.
 */
export function suggestNextSet(
  lastWeight: number,
  lastReps: number,
  repRangeObj: { min: number; max: number } = { min: 8, max: 12 }
): OverloadSuggestion {
  if (lastReps >= repRangeObj.max) {
    return {
      weight_kg: lastWeight + 2.5,
      target_reps: repRangeObj.min,
      reason: `Hit upper rep limit (${repRangeObj.max}). Increase weight by 2.5kg.`,
    }
  }

  if (lastReps >= repRangeObj.min) {
    return {
      weight_kg: lastWeight,
      target_reps: lastReps + 1,
      reason: 'Keep weight steady. Push for one extra rep this week.',
    }
  }

  return {
    weight_kg: Math.max(0, lastWeight - 2.5),
    target_reps: repRangeObj.max,
    reason: `Fell below target (${repRangeObj.min} reps). Drop weight by 2.5kg to rebuild.`,
  }
}
