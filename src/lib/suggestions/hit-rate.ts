import type { LoggedSet, PastSession } from './types'

// Landing within one rep of the suggestion still counts as following it.
const REP_TOLERANCE = 1

export interface HitRate { hits: number; total: number }

function isHit(set: LoggedSet, suggestedWeightKg: number, suggestedReps: number): boolean {
  return set.weightKg === suggestedWeightKg && Math.abs(set.reps - suggestedReps) <= REP_TOLERANCE
}

/** Share of suggested sets where the lifter used the suggested weight and about the suggested reps. */
export function hitRate(sessions: PastSession[]): HitRate {
  let hits = 0
  let total = 0
  for (const set of sessions.flatMap(session => session.sets)) {
    if (set.suggestedWeightKg === null || set.suggestedReps === null) continue
    total += 1
    if (isHit(set, set.suggestedWeightKg, set.suggestedReps)) hits += 1
  }
  return { hits, total }
}
