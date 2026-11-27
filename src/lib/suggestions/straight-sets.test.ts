import { describe, it, expect } from 'vitest'
import { planStraightSets } from './straight-sets'
import type { LoggedSet, PastSession, PlanContext } from './types'

const NOW = new Date('2026-11-26T10:00:00Z')

function makeContext(overrides: Partial<PlanContext> = {}): PlanContext {
  return {
    weekKind: 'hypertrophy', repRange: { min: 8, max: 12 }, rpeTarget: 7.5, isDeloadWeek: false,
    phase: 'bulking', experience: 'intermediate', movement: 'compound', equipment: 'dumbbell',
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

function makeSession(startedAt: string, sets: LoggedSet[], weekKind: PastSession['weekKind'] = 'hypertrophy'): PastSession {
  return { workoutId: startedAt, startedAt, weekKind, isDeload: false, bodyweightKg: 75, sets }
}

/** Set 1 carries the entered RPE; later sets have none. */
function sessionAt(startedAt: string, weightKg: number, reps: number[], setOneRpe: number | null = null): PastSession {
  const sets = reps.map((count, index) => makeSet(weightKg, count, index === 0 ? setOneRpe : null))
  return makeSession(startedAt, sets)
}

function weightsAndReps(sets: { weightKg: number; reps: number }[]): string[] {
  return sets.map(set => `${set.weightKg}x${set.reps}`)
}

const USER_EXAMPLE = sessionAt('2026-11-19T10:00:00Z', 30, [10, 9, 7])

describe('planStraightSets — weight held', () => {
  it('user example on bulk', () => {
    const plan = planStraightSets([USER_EXAMPLE], USER_EXAMPLE, makeContext(), NOW)
    expect(weightsAndReps(plan.sets)).toEqual(['30x10', '30x9', '30x8'])
    expect(plan.rule).toBe('hold-add-reps')
  })

  it('user example on cut', () => {
    const plan = planStraightSets([USER_EXAMPLE], USER_EXAMPLE, makeContext({ phase: 'cutting' }), NOW)
    expect(weightsAndReps(plan.sets)).toEqual(['30x10', '30x9', '30x7'])
    expect(plan.rule).toBe('hold-match')
    expect(plan.modifiers).toContain('cut')
  })

  it('low readiness matches', () => {
    const plan = planStraightSets([USER_EXAMPLE], USER_EXAMPLE, makeContext({ readinessAverage: 2 }), NOW)
    expect(weightsAndReps(plan.sets)).toEqual(['30x10', '30x9', '30x7'])
    expect(plan.sets.every(set => set.rpeTarget === 7)).toBe(true)
    expect(plan.rule).toBe('hold-match')
    expect(plan.modifiers).toContain('low-readiness')
  })

  it('reps never exceed max', () => {
    const reference = sessionAt('2026-11-19T10:00:00Z', 30, [11, 11, 11], 6)
    const plan = planStraightSets([reference], reference, makeContext(), NOW)
    expect(weightsAndReps(plan.sets)).toEqual(['30x12', '30x12', '30x12'])
    expect(plan.rule).toBe('hold-add-reps')
  })

  it('set beyond reference count is predicted', () => {
    const plan = planStraightSets([USER_EXAMPLE], USER_EXAMPLE, makeContext({ plannedSets: 4 }), NOW)
    expect(plan.sets).toHaveLength(4)
    expect(plan.sets[3].weightKg).toBe(30)
    expect(plan.sets[3].reps).toBeGreaterThanOrEqual(1)
  })

  it('uses only the first plannedSets reference sets', () => {
    const reference = sessionAt('2026-11-19T10:00:00Z', 30, [10, 9, 8, 7])
    const plan = planStraightSets([reference], reference, makeContext({ plannedSets: 2 }), NOW)
    expect(plan.sets).toHaveLength(2)
  })

  it('marks every set as a straight, required set at the effective target', () => {
    const plan = planStraightSets([USER_EXAMPLE], USER_EXAMPLE, makeContext(), NOW)
    for (const set of plan.sets) {
      expect(set).toMatchObject({ role: 'straight', repsMax: null, optional: false, rpeTarget: 7.5 })
    }
  })
})

describe('planStraightSets — weight changed', () => {
  it('weight up when capacity allows', () => {
    const reference = sessionAt('2026-11-19T10:00:00Z', 100, [12, 11, 10], 7)
    const plan = planStraightSets([reference], reference, makeContext({ equipment: 'barbell' }), NOW)
    expect(weightsAndReps(plan.sets)).toEqual(['102.5x11', '102.5x10', '102.5x9'])
    expect(plan.rule).toBe('weight-up')
  })

  it('low readiness blocks the weight-up', () => {
    const reference = sessionAt('2026-11-19T10:00:00Z', 100, [12, 11, 10], 7)
    const ctx = makeContext({ equipment: 'barbell', readinessAverage: 2 })
    const plan = planStraightSets([reference], reference, ctx, NOW)
    expect(weightsAndReps(plan.sets)).toEqual(['100x12', '100x11', '100x10'])
    expect(plan.rule).toBe('hold-match')
  })

  it('forced weight up after two exposures at top', () => {
    const history = [
      sessionAt('2026-11-19T10:00:00Z', 30, [12, 11, 10], 10),
      sessionAt('2026-11-12T10:00:00Z', 30, [12, 11, 10], 10),
    ]
    const plan = planStraightSets(history, history[0], makeContext(), NOW)
    expect(plan.sets.every(set => set.weightKg === 32.5)).toBe(true)
    expect(plan.rule).toBe('weight-up-forced')
  })

  it('stall reset drops one increment', () => {
    const history = [
      sessionAt('2026-11-19T10:00:00Z', 30, [10, 9, 7]),
      sessionAt('2026-11-12T10:00:00Z', 30, [10, 9, 7]),
      sessionAt('2026-11-05T10:00:00Z', 30, [10, 9, 7]),
    ]
    const plan = planStraightSets(history, history[0], makeContext(), NOW)
    expect(plan.sets.every(set => set.weightKg === 27.5)).toBe(true)
    expect(plan.rule).toBe('stall-reset')
    expect(plan.modifiers).toContain('stall-reset')
  })

  it('flat e1RM at the top of the range is not a stall', () => {
    const history = [
      sessionAt('2026-11-19T10:00:00Z', 30, [12, 11, 10]),
      sessionAt('2026-11-12T10:00:00Z', 30, [12, 11, 10]),
      sessionAt('2026-11-05T10:00:00Z', 30, [12, 11, 10]),
    ]
    const plan = planStraightSets(history, history[0], makeContext(), NOW)
    expect(plan.rule).not.toBe('stall-reset')
    expect(plan.sets.every(set => set.weightKg === 32.5)).toBe(true)
  })

  it('no stall reset when the weight is already one step', () => {
    const history = [
      sessionAt('2026-11-19T10:00:00Z', 2.5, [10, 9, 7]),
      sessionAt('2026-11-12T10:00:00Z', 2.5, [10, 9, 7]),
      sessionAt('2026-11-05T10:00:00Z', 2.5, [10, 9, 7]),
    ]
    const plan = planStraightSets(history, history[0], makeContext(), NOW)
    expect(plan.rule).not.toBe('stall-reset')
    expect(plan.modifiers).not.toContain('stall-reset')
    expect(plan.sets.every(set => set.weightKg === 2.5)).toBe(true)
  })

  it('volume reps-only', () => {
    const reference = sessionAt('2026-11-19T10:00:00Z', 20, [20, 19, 18], 6)
    reference.weekKind = 'volume'
    const ctx = makeContext({ weekKind: 'volume', repRange: { min: 13, max: 20 }, rpeTarget: 7 })
    const plan = planStraightSets([reference], reference, ctx, NOW)
    expect(weightsAndReps(plan.sets)).toEqual(['22.5x13', '22.5x13', '22.5x13'])
    expect(plan.rule).toBe('reps-only')
  })

  it('comes down when set 1 was ground out below the range', () => {
    const reference = sessionAt('2026-11-19T10:00:00Z', 40, [6, 5, 4], 10)
    const plan = planStraightSets([reference], reference, makeContext(), NOW)
    expect(plan.rule).toBe('come-down')
    expect(plan.sets[0].weightKg).toBeLessThan(40)
    expect(plan.sets[0].reps).toBeGreaterThanOrEqual(8)
  })
})

describe('planStraightSets — bodyweight only', () => {
  it('adds one rep with zero weight and no max cap', () => {
    const reference = sessionAt('2026-11-19T10:00:00Z', 0, [15, 14, 13])
    const ctx = makeContext({ equipment: 'bodyweight', isBodyweightOnly: true })
    const plan = planStraightSets([reference], reference, ctx, NOW)
    expect(weightsAndReps(plan.sets)).toEqual(['0x16', '0x14', '0x13'])
    expect(plan.rule).toBe('hold-add-reps')
  })

  it('matches on a cut', () => {
    const reference = sessionAt('2026-11-19T10:00:00Z', 0, [15, 14, 13])
    const ctx = makeContext({ equipment: 'bodyweight', isBodyweightOnly: true, phase: 'cutting' })
    const plan = planStraightSets([reference], reference, ctx, NOW)
    expect(weightsAndReps(plan.sets)).toEqual(['0x15', '0x14', '0x13'])
    expect(plan.modifiers).toContain('cut')
  })
})
