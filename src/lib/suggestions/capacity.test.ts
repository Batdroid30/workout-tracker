import { describe, it, expect } from 'vitest'
import {
  sessionE1rm, currentE1rm, conversionE1rm, sessionFatigue, repsToFailure, predictReps,
} from './capacity'
import { calculate1RM } from '@/lib/algorithms'
import type { LoggedSet, PastSession } from './types'

function makeSet(overrides: Partial<LoggedSet> = {}): LoggedSet {
  return {
    weightKg: 30, reps: 10, rpe: null, rpeSource: null,
    suggestedWeightKg: null, suggestedReps: null,
    ...overrides,
  }
}

function makeSession(overrides: Partial<PastSession> = {}): PastSession {
  return {
    workoutId: 'w', startedAt: '2026-11-01T10:00:00Z',
    weekKind: null, isDeload: false, bodyweightKg: 75, sets: [makeSet()],
    ...overrides,
  }
}

function sessionWithReps(startedAt: string, weightKg: number, ...reps: number[]): PastSession {
  return makeSession({ startedAt, sets: reps.map(r => makeSet({ weightKg, reps: r })) })
}

function enteredSet(weightKg: number, reps: number, rpe: number): LoggedSet {
  return makeSet({ weightKg, reps, rpe, rpeSource: 'entered' })
}

describe('sessionE1rm', () => {
  it('uses set 1 reps plus inferred RIR', () => {
    expect(sessionE1rm(sessionWithReps('2026-11-01T10:00:00Z', 30, 10, 9, 7))).toBeCloseTo(41, 1)
  })
  it('assumes 1.5 RIR for a single set', () => {
    expect(sessionE1rm(sessionWithReps('2026-11-01T10:00:00Z', 100, 10))).toBeCloseTo(138.3, 1)
  })
  it('returns null when reps-to-failure exceeds 20', () => {
    const tooHigh = makeSession({ sets: [enteredSet(20, 20, 9)] })
    expect(sessionE1rm(tooHigh)).toBeNull()
  })
  it('returns null for a zero weight', () => {
    expect(sessionE1rm(makeSession({ sets: [makeSet({ weightKg: 0 })] }))).toBeNull()
  })
})

describe('repsToFailure and predictReps', () => {
  it('inverts the e1RM formula without rounding artefacts', () => {
    expect(repsToFailure(150, 102.5)).toBeCloseTo(13.9, 1)
    expect(repsToFailure(41, 30)).toBeCloseTo(11, 1)
  })
  it('returns 1 when the weight reaches the e1RM', () => {
    expect(repsToFailure(100, 100)).toBe(1)
    expect(repsToFailure(100, 120)).toBe(1)
  })
  it('predicts whole reps from RIR and fatigue', () => {
    expect(predictReps(41, 30, 0, 0, 0)).toBe(11)
    expect(predictReps(150, 102.5, 2.5, 0, 1)).toBe(11)
    expect(predictReps(150, 102.5, 2.5, 2, 1)).toBe(9)
  })
})

describe('currentE1rm', () => {
  it('skips deload sessions', () => {
    const sessions = [
      makeSession({ startedAt: '2026-11-10T10:00:00Z', isDeload: true, sets: [makeSet({ weightKg: 200, reps: 5 })] }),
      sessionWithReps('2026-11-03T10:00:00Z', 30, 10, 9, 7),
    ]
    expect(currentE1rm(sessions)).toBeCloseTo(41, 1)
  })

  it('returns the higher of the two most recent usable values', () => {
    const newest = makeSession({ startedAt: '2026-11-10T10:00:00Z', sets: [enteredSet(95, 1, 10)] })
    const older = makeSession({ startedAt: '2026-11-03T10:00:00Z', sets: [enteredSet(100, 1, 10)] })
    expect(currentE1rm([newest, older])).toBe(100)
  })

  it('ignores session e1RM above 115% of prior best', () => {
    const sessions = [
      sessionWithReps('2026-11-24T10:00:00Z', 300, 10, 9, 7),
      sessionWithReps('2026-11-17T10:00:00Z', 30, 10, 9, 7),
      sessionWithReps('2026-11-10T10:00:00Z', 30, 10, 9, 7),
      sessionWithReps('2026-11-03T10:00:00Z', 30, 10, 9, 7),
    ]
    expect(currentE1rm(sessions)).toBeCloseTo(41, 0)
  })

  it('returns null with no usable sessions', () => {
    expect(currentE1rm([])).toBeNull()
  })
})

describe('conversionE1rm', () => {
  it('rejects sessions whose set 1 reps exceed 12', () => {
    const session = makeSession({ sets: [enteredSet(20, 20, 10)] })
    expect(conversionE1rm([session])).toBeNull()
  })
  it('caps reps to failure at 12 for a set of 12 or fewer reps', () => {
    const easy = makeSession({ sets: [enteredSet(100, 12, 6)] })
    const hard = makeSession({ sets: [enteredSet(100, 12, 10)] })
    expect(conversionE1rm([easy])).toBe(calculate1RM(100, 12))
    expect(conversionE1rm([hard])).toBe(calculate1RM(100, 12))
    expect(calculate1RM(100, 12)).toBeCloseTo(140, 0)
  })
  it('ignores sessions more than 8 weeks older than the newest one', () => {
    const recent = sessionWithReps('2026-11-19T10:00:00Z', 60, 15, 14, 13)
    const fifteenWeeksOlder = makeSession({ startedAt: '2026-08-06T10:00:00Z', sets: [enteredSet(100, 5, 8)] })
    expect(conversionE1rm([recent, fifteenWeeksOlder])).toBeNull()
  })
  it('accepts low-rep sessions', () => {
    const session = makeSession({ sets: [enteredSet(100, 5, 8)] })
    expect(conversionE1rm([session])).toBeCloseTo(calculate1RM(100, 7), 1)
  })
})

describe('sessionFatigue', () => {
  it('measures average reps lost per set at set 1 weight', () => {
    expect(sessionFatigue([sessionWithReps('2026-11-01T10:00:00Z', 50, 12, 11, 10)], 0.5)).toBe(1)
  })
  it('falls back when no session has multiple sets at one weight', () => {
    expect(sessionFatigue([sessionWithReps('2026-11-01T10:00:00Z', 50, 12)], 0.7)).toBe(0.7)
  })
  it('clamps to the 0 to 3 range', () => {
    expect(sessionFatigue([sessionWithReps('2026-11-01T10:00:00Z', 50, 20, 10)], 0.5)).toBe(3)
  })
})
