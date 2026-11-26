import { describe, it, expect } from 'vitest'
import { planStrengthSets } from './strength-sets'
import type { LoggedSet, PastSession, PlanContext } from './types'

function makeContext(overrides: Partial<PlanContext> = {}): PlanContext {
  return {
    weekKind: 'strength', repRange: { min: 3, max: 5 }, rpeTarget: 8.5, isDeloadWeek: false,
    phase: 'bulking', experience: 'intermediate', movement: 'compound', equipment: 'barbell',
    weightStepKg: 2.5, isBodyweightOnly: false, plannedSets: 3, readinessAverage: null,
    ...overrides,
  }
}

function makeSet(weightKg: number, reps: number, rpe: number | null = null): LoggedSet {
  return {
    weightKg, reps, rpe, rpeSource: rpe === null ? null : 'entered',
    suggestedWeightKg: null, suggestedReps: null,
  }
}

function strengthSession(startedAt: string, sets: LoggedSet[]): PastSession {
  return { workoutId: startedAt, startedAt, weekKind: 'strength', isDeload: false, sets }
}

function weightsAndReps(sets: { weightKg: number; reps: number }[]): string[] {
  return sets.map(set => `${set.weightKg}x${set.reps}`)
}

const TOP_AT_MAX = strengthSession('2026-11-19T10:00:00Z', [
  makeSet(100, 5, 8.5), makeSet(90, 6), makeSet(90, 6),
])

describe('planStrengthSets', () => {
  it('strength top set up', () => {
    const plan = planStrengthSets([TOP_AT_MAX], TOP_AT_MAX, makeContext())
    expect(weightsAndReps(plan.sets)).toEqual(['102.5x4', '90x5', '90x5'])
    expect(plan.sets.map(set => set.role)).toEqual(['top', 'backoff', 'backoff'])
    expect(plan.rule).toBe('top-set-up')
    expect(plan.sets.every(set => set.rpeTarget === 8.5 && !set.optional && set.repsMax === null)).toBe(true)
  })

  it('strength assumed effort needs two exposures', () => {
    const reference = strengthSession('2026-11-19T10:00:00Z', [
      makeSet(100, 5), makeSet(90, 6), makeSet(90, 6),
    ])
    const plan = planStrengthSets([reference], reference, makeContext())
    expect(plan.sets[0].weightKg).toBe(100)
    expect(plan.rule).toBe('top-set-hold')
  })

  it('assumed effort goes up after two exposures at the top of the range', () => {
    const older = strengthSession('2026-11-12T10:00:00Z', [makeSet(100, 5), makeSet(90, 6)])
    const reference = strengthSession('2026-11-19T10:00:00Z', [makeSet(100, 5), makeSet(90, 6)])
    const plan = planStrengthSets([reference, older], reference, makeContext())
    expect(plan.sets[0].weightKg).toBe(102.5)
    expect(plan.rule).toBe('top-set-up')
  })

  it('holds and adds a rep below the top of the range', () => {
    const reference = strengthSession('2026-11-19T10:00:00Z', [makeSet(100, 4, 8), makeSet(90, 5)])
    const plan = planStrengthSets([reference], reference, makeContext())
    expect(weightsAndReps(plan.sets)).toEqual(['100x5', '90x5', '90x5'])
    expect(plan.rule).toBe('top-set-hold')
  })

  it('holds and matches when the extra rep is beyond the ceiling', () => {
    const reference = strengthSession('2026-11-19T10:00:00Z', [makeSet(100, 4, 10), makeSet(90, 5)])
    const plan = planStrengthSets([reference], reference, makeContext())
    expect(plan.sets[0]).toMatchObject({ weightKg: 100, reps: 4 })
    expect(plan.rule).toBe('top-set-hold')
  })

  it('low readiness blocks the weight increase and matches reps', () => {
    const plan = planStrengthSets([TOP_AT_MAX], TOP_AT_MAX, makeContext({ readinessAverage: 2 }))
    expect(plan.sets[0]).toMatchObject({ weightKg: 100, reps: 5 })
    expect(plan.sets.every(set => set.rpeTarget === 8)).toBe(true)
    expect(plan.rule).toBe('top-set-hold')
  })

  it('back-offs at the reference weight keep the reference reps', () => {
    const reference = strengthSession('2026-11-19T10:00:00Z', [makeSet(25, 5), makeSet(25, 5), makeSet(25, 5)])
    const plan = planStrengthSets([reference], reference, makeContext({ experience: 'beginner' }))
    expect(weightsAndReps(plan.sets)).toEqual(['30x3', '25x5', '25x5'])
    expect(plan.rule).toBe('top-set-up')
  })

  it('one planned set is the top set only', () => {
    const plan = planStrengthSets([TOP_AT_MAX], TOP_AT_MAX, makeContext({ plannedSets: 1 }))
    expect(plan.sets).toHaveLength(1)
    expect(plan.sets[0].role).toBe('top')
  })
})
