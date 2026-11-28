import { describe, it, expect } from 'vitest'
import { hitRate } from './hit-rate'
import type { LoggedSet, PastSession } from './types'

function loggedSet(
  weightKg: number, reps: number, suggestedWeightKg: number | null, suggestedReps: number | null,
): LoggedSet {
  return { weightKg, reps, rpe: null, rpeSource: null, suggestedWeightKg, suggestedReps }
}

function session(sets: LoggedSet[]): PastSession {
  return { workoutId: 'w1', startedAt: '2026-11-19T10:00:00Z', weekKind: 'hypertrophy', isDeload: false, bodyweightKg: 75, sets }
}

describe('hitRate', () => {
  it('counts suggested sets hit on weight and within one rep', () => {
    const sessions = [
      session([loggedSet(30, 9, 30, 10), loggedSet(30, 8, 30, 10)]),
      session([loggedSet(32.5, 11, 32.5, 10)]),
    ]
    expect(hitRate(sessions)).toEqual({ hits: 2, total: 3 })
  })

  it('ignores sets without a suggestion', () => {
    const sessions = [session([
      loggedSet(30, 10, null, null), loggedSet(30, 10, 30, null), loggedSet(30, 10, 27.5, 10),
    ])]
    expect(hitRate(sessions)).toEqual({ hits: 0, total: 1 })
  })

  it('is zero for no sessions', () => {
    expect(hitRate([])).toEqual({ hits: 0, total: 0 })
  })
})
