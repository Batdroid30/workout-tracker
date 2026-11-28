import { describe, it, expect } from 'vitest'
import { inferSetOneRir, trustedRpe, sessionEfforts } from './effort'
import type { LoggedSet } from './types'

function makeSet(overrides: Partial<LoggedSet> = {}): LoggedSet {
  return {
    weightKg: 30, reps: 10, rpe: null, rpeSource: null,
    suggestedWeightKg: null, suggestedReps: null,
    ...overrides,
  }
}

function setsWithReps(...reps: number[]): LoggedSet[] {
  return reps.map(r => makeSet({ reps: r }))
}

describe('inferSetOneRir', () => {
  it('maps average rep loss to set-1 RIR', () => {
    expect(inferSetOneRir(setsWithReps(10, 9, 7))).toBe(1)
    expect(inferSetOneRir(setsWithReps(12, 10))).toBe(0)
    expect(inferSetOneRir(setsWithReps(10, 10, 10))).toBe(3)
    expect(inferSetOneRir(setsWithReps(10, 9, 8))).toBe(1.5)
  })

  it('returns null with fewer than two sets at set 1 weight', () => {
    expect(inferSetOneRir(setsWithReps(10))).toBeNull()
    expect(inferSetOneRir([makeSet(), makeSet({ weightKg: 25 })])).toBeNull()
  })
})

describe('trustedRpe', () => {
  it('ignores legacy prefill values with no source', () => {
    expect(trustedRpe(makeSet({ rpe: 8, rpeSource: null }))).toBeNull()
  })
  it('trusts non-prefill values with no source', () => {
    expect(trustedRpe(makeSet({ rpe: 9, rpeSource: null }))).toBe(9)
  })
  it('trusts any value with an explicit source', () => {
    expect(trustedRpe(makeSet({ rpe: 8, rpeSource: 'prompt' }))).toBe(8)
  })
  it('returns null when no rpe was logged', () => {
    expect(trustedRpe(makeSet())).toBeNull()
  })
})

describe('sessionEfforts', () => {
  it('steps RIR down by half a rep per set from the inferred set-1 value', () => {
    const efforts = sessionEfforts(setsWithReps(10, 9, 7))
    expect(efforts.map(e => e.rir)).toEqual([1, 0.5, 0])
    expect(efforts.every(e => e.source === 'inferred')).toBe(true)
  })

  it('assumes 1.5 RIR for a lone set with no RPE', () => {
    expect(sessionEfforts(setsWithReps(10))).toEqual([{ rir: 1.5, source: 'assumed' }])
  })

  it('uses entered RPE as 10 minus rpe', () => {
    const efforts = sessionEfforts([makeSet({ rpe: 9, rpeSource: 'entered' })])
    expect(efforts).toEqual([{ rir: 1, source: 'entered' }])
  })

  it('steps down from an earlier entered set when inference is impossible', () => {
    const efforts = sessionEfforts([
      makeSet({ rpe: 8, rpeSource: 'entered' }),
      makeSet({ weightKg: 25 }),
    ])
    expect(efforts).toEqual([
      { rir: 2, source: 'entered' },
      { rir: 1.5, source: 'inferred' },
    ])
  })

  it('lets a later trusted RPE set the set-1 effort over rep-loss inference', () => {
    const efforts = sessionEfforts([makeSet(), makeSet(), makeSet({ rpe: 10, rpeSource: 'prompt' })])
    expect(efforts).toEqual([
      { rir: 1, source: 'entered' },
      { rir: 0.5, source: 'inferred' },
      { rir: 0, source: 'entered' },
    ])
  })

  it('keeps set 1 on its own trusted RPE when a later set has one too', () => {
    const efforts = sessionEfforts([
      makeSet({ rpe: 8, rpeSource: 'entered' }), makeSet(), makeSet({ rpe: 10, rpeSource: 'prompt' }),
    ])
    expect(efforts.map(effort => effort.rir)).toEqual([2, 1.5, 0])
    expect(efforts[0].source).toBe('entered')
  })
})
