import type { WeeklyVolume } from '@/types/database'

/**
 * PHASE 6.6: Auto Deload Algorithm
 * Flags if systemic fatigue is accumulating based on recent weeks of training.
 * Trigger: Volume drops >= 10% for two consecutive weeks while RPE remains high (>= 8.5).
 */
export function checkDeloadNeeded(weeklyData: WeeklyVolume[]): boolean {
  if (weeklyData.length < 3) return false

  // Sort chronological ascending (oldest first)
  const sorted = [...weeklyData].sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime())

  const latest = sorted[sorted.length - 1]
  const previous = sorted[sorted.length - 2]
  const baseline = sorted[sorted.length - 3]

  // If we don't have RPE data, we can't reliably predict physical fatigue vs just skipping the gym
  if (!latest.avg_rpe || !previous.avg_rpe) return false

  const volumeDrop1 = (baseline.total_volume - previous.total_volume) / baseline.total_volume
  const volumeDrop2 = (previous.total_volume - latest.total_volume) / previous.total_volume

  const persistentHighRPE = latest.avg_rpe >= 8.5 && previous.avg_rpe >= 8.5
  const sequentialVolumeDrop = volumeDrop1 >= 0.1 && volumeDrop2 >= 0.1

  return persistentHighRPE && sequentialVolumeDrop
}

/**
 * PHASE 6.7: Progressive Overload Engine (Double Progression)
 * Goal: If upper rep limit is achieved, suggest a 2.5kg weight bump and drop reps to lower bound.
 * Epley 1RM formula incorporated for baseline scoring comparisons.
 */

export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return Number((weight * (1 + reps / 30)).toFixed(1))
}

export interface OverloadSuggestion {
  weight_kg: number;
  target_reps: number;
  reason: string;
}

export function suggestNextSet(
  lastWeight: number, 
  lastReps: number, 
  repRangeObj: { min: number; max: number } = { min: 8, max: 12 }
): OverloadSuggestion {
  // Scenario 1: They crushed the upper rep bound
  if (lastReps >= repRangeObj.max) {
    return {
      weight_kg: lastWeight + 2.5,
      target_reps: repRangeObj.min,
      reason: `Hit upper rep limit (${repRangeObj.max}). Increase weight by 2.5kg.`
    }
  }

  // Scenario 2: They are successfully bridging the gap inside the rep progression band
  if (lastReps >= repRangeObj.min) {
    return {
      weight_kg: lastWeight,
      target_reps: lastReps + 1,
      reason: `Keep weight steady. Push for one extra rep this week.`
    }
  }

  // Scenario 3: Falling short. Likely means ego lifting or fatigue.
  return {
    weight_kg: Math.max(0, lastWeight - 2.5),
    target_reps: repRangeObj.max,
    reason: `Fell below target volume (${repRangeObj.min} reps). Drop weight by 2.5kg to master form.`
  }
}
