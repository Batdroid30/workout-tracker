// How strength is read from the lifts a lifter follows on Progress.

import type { TrackedLift } from '@/lib/data/tracked-lifts'
import type { KeyLift } from '@/lib/data/phase-coach'

// A change of a kilo or less either way reads as holding steady.
const FLAT_KG = 1

export type TrendDirection = 'up' | 'flat' | 'down'

export interface LiftTrend {
  current: number
  /** Null until there are two weeks to compare. */
  change: number | null
  direction: TrendDirection
  /** Weekly best estimate, oldest first. */
  points: number[]
}

// Weekly estimates already use the load actually lifted (bodyweight minus
// assistance for assisted lifts), so higher always means stronger.
export function liftTrend(weekly: Map<string, number> | undefined): LiftTrend | null {
  if (!weekly || weekly.size === 0) return null
  const points = [...weekly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value)
  const current = points[points.length - 1]
  if (points.length < 2) return { current, change: null, direction: 'flat', points }
  const change = Math.round((current - points[0]) * 10) / 10
  const direction: TrendDirection = change > FLAT_KG ? 'up' : change < -FLAT_KG ? 'down' : 'flat'
  return { current, change, direction, points }
}

export function resolveStrengthLifts(picks: TrackedLift[], keyLifts: KeyLift[]): { lifts: TrackedLift[]; source: 'picked' | 'auto' } {
  if (picks.length > 0) return { lifts: picks, source: 'picked' }
  return {
    lifts: keyLifts.map(({ exerciseId, exerciseName, muscleGroup }) => ({ exerciseId, exerciseName, muscleGroup })),
    source: 'auto',
  }
}

// The overall-strength average uses lifts with recent sets, and leaves out
// assisted lifts, whose load depends on the day's bodyweight.
export function liftsForIndex(
  lifts: TrackedLift[],
  weeklyE1RM: Map<string, Map<string, number>>,
  isAssisted: (name: string) => boolean,
): KeyLift[] {
  return lifts
    .filter(entry => (weeklyE1RM.get(entry.exerciseId)?.size ?? 0) > 0 && !isAssisted(entry.exerciseName))
    .map(entry => ({ ...entry, sessionCount: weeklyE1RM.get(entry.exerciseId)?.size ?? 0 }))
}
