import { describe, it, expect } from 'vitest'
import { planDeload } from './deload'
import type { LoggedSet, PastSession, PlanContext } from './types'

function makeContext(overrides: Partial<PlanContext> = {}): PlanContext {
  return {
    weekKind: 'hypertrophy', repRange: { min: 8, max: 12 }, rpeTarget: 7.5, isDeloadWeek: true,
    phase: 'bulking', experience: 'intermediate', movement: 'compound', equipment: 'barbell',
    weightStepKg: 2.5, isBodyweightOnly: false, plannedSets: 3, readinessAverage: null,
    ...overrides,
  }
}

function makeSet(weightKg: number, reps: number): LoggedSet {
  return { weightKg, reps, rpe: null, rpeSource: null, suggestedWeightKg: null, suggestedReps: null }
}

function sessionWith(sets: LoggedSet[]): PastSession {
  const startedAt = '2026-11-19T10:00:00Z'
  return { workoutId: startedAt, startedAt, weekKind: 'hypertrophy', isDeload: false, bodyweightKg: 75, sets }
}

function describeSets(sets: { weightKg: number; reps: number; optional: boolean }[]): string[] {
  return sets.map(set => `${set.weightKg}x${set.reps}${set.optional ? ' optional' : ''}`)
}

describe('planDeload', () => {
  it('deload rounds down and marks optional', () => {
    const reference = sessionWith([makeSet(100, 8), makeSet(100, 8), makeSet(100, 8)])
    const plan = planDeload(reference, makeContext())
    expect(describeSets(plan.sets)).toEqual(['85x8', '85x8', '85x8 optional'])
    expect(plan.sets.every(set => set.rpeTarget === 7 && set.role === 'straight')).toBe(true)
    expect(plan.rule).toBe('deload')
  })

  it('deload keeps light weights', () => {
    const reference = sessionWith([makeSet(5, 12), makeSet(5, 12), makeSet(5, 12)])
    const plan = planDeload(reference, makeContext())
    expect(plan.sets.map(set => set.weightKg)).toEqual([5, 5, 5])
  })

  it('is at least one step below an on-grid reference', () => {
    const reference = sessionWith([makeSet(15, 10)])
    const plan = planDeload(reference, makeContext({ plannedSets: 1 }))
    // 15 × 0.87 = 13.05 → 12.5, which is one step down.
    expect(plan.sets[0].weightKg).toBe(12.5)
  })

  it('takes the largest step multiple below an off-grid reference', () => {
    const reference = sessionWith([makeSet(12, 10)])
    const plan = planDeload(reference, makeContext({ plannedSets: 1 }))
    // 12 × 0.87 = 10.44 → 10, already below 12 on the 2.5 kg grid.
    expect(plan.sets[0].weightKg).toBe(10)
  })

  it('keeps an off-grid reference when one step is over a quarter of it', () => {
    const reference = sessionWith([makeSet(12, 10)])
    expect(planDeload(reference, makeContext({ plannedSets: 1, weightStepKg: 5 })).sets[0].weightKg).toBe(12)
  })

  it('repeats the last reference set beyond its count', () => {
    const reference = sessionWith([makeSet(100, 8), makeSet(100, 7)])
    const plan = planDeload(reference, makeContext({ plannedSets: 4 }))
    expect(describeSets(plan.sets)).toEqual(['85x8', '85x7', '85x7 optional', '85x7 optional'])
  })
})
