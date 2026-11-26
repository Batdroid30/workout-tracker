import { describe, it, expect } from 'vitest'
import { adjustRemainingSets } from './live'
import type { ExercisePlan, LoggedSet, PlanContext, PlanRule, SetSuggestion } from './types'

function makeContext(overrides: Partial<PlanContext> = {}): PlanContext {
  return {
    weekKind: 'hypertrophy', repRange: { min: 8, max: 12 }, rpeTarget: 7.5, isDeloadWeek: false,
    phase: 'bulking', experience: 'intermediate', movement: 'compound', equipment: 'barbell',
    weightStepKg: 2.5, isBodyweightOnly: false, plannedSets: 3, readinessAverage: null,
    ...overrides,
  }
}

function suggestion(weightKg: number, reps: number, overrides: Partial<SetSuggestion> = {}): SetSuggestion {
  return { weightKg, reps, repsMax: null, rpeTarget: 7.5, role: 'straight', optional: false, ...overrides }
}

function makePlan(sets: SetSuggestion[], rule: PlanRule = 'hold-match'): ExercisePlan {
  return {
    sets,
    explanation: {
      rule, referenceDate: null, referenceSets: [], effortSources: [], modifiers: [], confidence: 'high', reason: '',
    },
  }
}

function logged(weightKg: number, reps: number, rpe: number | null = null): LoggedSet {
  return {
    weightKg, reps, rpe, rpeSource: rpe === null ? null : 'entered', suggestedWeightKg: null, suggestedReps: null,
  }
}

function weightsAndReps(sets: SetSuggestion[]): string[] {
  return sets.map(set => `${set.weightKg}x${set.reps}`)
}

const STRAIGHT_PLAN = makePlan([suggestion(30, 10), suggestion(30, 9), suggestion(30, 8)])

describe('adjustRemainingSets', () => {
  it('returns the plan unchanged when nothing is completed', () => {
    expect(adjustRemainingSets(STRAIGHT_PLAN, [], makeContext())).toEqual(STRAIGHT_PLAN.sets)
  })

  it('keeps completed positions unchanged and lowers reps after an easy set', () => {
    const result = adjustRemainingSets(STRAIGHT_PLAN, [logged(30, 12, 7)], makeContext())
    expect(result[0]).toEqual(STRAIGHT_PLAN.sets[0])
    expect(result[1].reps).toBeGreaterThanOrEqual(9)
    expect(result[1].reps).toBeLessThanOrEqual(10)
    expect(result[1].weightKg).toBe(30)
  })

  it('steps the remaining weight down when a set missed the range by two or more', () => {
    const result = adjustRemainingSets(STRAIGHT_PLAN, [logged(30, 6)], makeContext())
    expect(result.slice(1).map(set => set.weightKg)).toEqual([27.5, 27.5])
    expect(result[0].weightKg).toBe(30)
  })

  it('re-plans strength back-offs from the actual top set', () => {
    const plan = makePlan(
      [suggestion(100, 4, { role: 'top', rpeTarget: 8.5 }),
        suggestion(90, 5, { role: 'backoff', rpeTarget: 8.5 }),
        suggestion(90, 5, { role: 'backoff', rpeTarget: 8.5 })],
      'top-set-up',
    )
    const ctx = makeContext({ weekKind: 'strength', repRange: { min: 3, max: 5 }, rpeTarget: 8.5 })
    const result = adjustRemainingSets(plan, [logged(105, 3)], ctx)
    expect(weightsAndReps(result)).toEqual(['100x4', '92.5x4', '92.5x4'])
  })

  it.each([
    ['deload', makePlan([suggestion(30, 10), suggestion(30, 10)], 'deload'), makeContext()],
    ['bodyweight', makePlan([suggestion(0, 10), suggestion(0, 9)]), makeContext({ isBodyweightOnly: true })],
    ['calibration range', makePlan([suggestion(30, 8, { repsMax: 12 }), suggestion(30, 8, { repsMax: 12 })], 'calibration'),
      makeContext()],
  ])('leaves %s sets unchanged', (_label, plan, ctx) => {
    expect(adjustRemainingSets(plan, [logged(30, 6)], ctx)).toEqual(plan.sets)
  })
})
