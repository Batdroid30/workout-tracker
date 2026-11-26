import { describe, it, expect } from 'vitest'
import { planConversion } from './conversion'
import { planStraightSets } from './straight-sets'
import type { LoggedSet, PastSession, PlanContext } from './types'

const NOW = new Date('2026-11-26T10:00:00Z')

function strengthContext(overrides: Partial<PlanContext> = {}): PlanContext {
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

function hypertrophySession(sets: LoggedSet[]): PastSession {
  const startedAt = '2026-11-19T10:00:00Z'
  return { workoutId: startedAt, startedAt, weekKind: 'hypertrophy', isDeload: false, sets }
}

function describeSets(sets: { weightKg: number; reps: number; repsMax: number | null }[]): string[] {
  return sets.map(set => `${set.weightKg}x${set.reps}${set.repsMax === null ? '' : `-${set.repsMax}`}`)
}

describe('planConversion', () => {
  it('conversion from user example', () => {
    const reference = hypertrophySession([makeSet(30, 10), makeSet(30, 9), makeSet(30, 7)])
    const plan = planConversion([reference], reference, strengthContext({ equipment: 'dumbbell' }), NOW)
    expect(describeSets(plan.sets)).toEqual(['35x3-5', '30x4', '30x4'])
    expect(plan.sets.map(set => set.role)).toEqual(['top', 'backoff', 'backoff'])
    expect(plan.rule).toBe('calibration')
  })

  it('conversion from 100x10', () => {
    const reference = hypertrophySession([makeSet(100, 10)])
    const plan = planConversion([reference], reference, strengthContext(), NOW)
    expect(describeSets(plan.sets)).toEqual(['117.5x3-5', '105x4', '105x4'])
    expect(plan.rule).toBe('calibration')
  })

  it('calibration ignores high-rep estimates', () => {
    const reference = hypertrophySession([makeSet(140, 20, 10)])
    const plan = planConversion([reference], reference, strengthContext(), NOW)
    expect(describeSets(plan.sets)).toEqual(['142.5x3-5', '127.5x4', '127.5x4'])
    expect(plan.rule).toBe('calibration')
  })

  it('straight sets in other weeks show the range at the calibrated weight', () => {
    const reference = hypertrophySession([makeSet(100, 10)])
    const ctx = strengthContext({ weekKind: 'volume', repRange: { min: 13, max: 20 }, rpeTarget: 7 })
    const plan = planConversion([reference], reference, ctx, NOW)
    // e1RM 138.3; reps-to-failure 13 + 3 + 1 = 17 → 138.3 / (1 + 17/30) = 88.3 → 87.5
    expect(describeSets(plan.sets)).toEqual(['87.5x13-20', '87.5x13-20', '87.5x13-20'])
    expect(plan.sets.every(set => set.role === 'straight')).toBe(true)
  })

  it('falls back to the straight planner outside strength weeks', () => {
    const reference = hypertrophySession([makeSet(140, 20, 10)])
    const ctx = strengthContext({ weekKind: 'volume', repRange: { min: 13, max: 20 }, rpeTarget: 7 })
    const plan = planConversion([reference], reference, ctx, NOW)
    expect(plan.sets).toEqual(planStraightSets([reference], reference, ctx, NOW).sets)
    expect(plan.rule).toBe('calibration')
  })
})
