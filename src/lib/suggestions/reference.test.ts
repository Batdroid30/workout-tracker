import { describe, it, expect } from 'vitest'
import { REFERENCE_WINDOW_WEEKS, pickReference, sameTypeExposures, isStalled, topOfRangeStreak } from './reference'
import type { LoggedSet, PastSession, WeekKind } from './types'

const NOW = new Date('2026-11-26T10:00:00Z')

function makeSet(overrides: Partial<LoggedSet> = {}): LoggedSet {
  return {
    weightKg: 30, reps: 10, rpe: null, rpeSource: null,
    suggestedWeightKg: null, suggestedReps: null,
    ...overrides,
  }
}

function makeSession(overrides: Partial<PastSession> = {}): PastSession {
  return {
    workoutId: 'w', startedAt: '2026-11-20T10:00:00Z',
    weekKind: 'hypertrophy', isDeload: false, sets: [makeSet()],
    ...overrides,
  }
}

function sessionOn(startedAt: string, weekKind: WeekKind | null, isDeload = false): PastSession {
  return makeSession({ workoutId: startedAt, startedAt, weekKind, isDeload })
}

/** Same e1RM (41) every time: 30 kg, set 1 of 10 reps with lower later sets. */
function flatSession(startedAt: string): PastSession {
  const sets = [makeSet({ reps: 10 }), makeSet({ reps: 9 }), makeSet({ reps: 7 })]
  return makeSession({ workoutId: startedAt, startedAt, sets })
}

function failureSession(startedAt: string, reps: number, weightKg = 30): PastSession {
  const sets = [makeSet({ weightKg, reps, rpe: 10, rpeSource: 'entered' })]
  return makeSession({ workoutId: startedAt, startedAt, sets })
}

describe('pickReference', () => {
  it('skips a deload and uses the older same-type session', () => {
    const sessions = [
      sessionOn('2026-11-24T10:00:00Z', 'hypertrophy', true),
      sessionOn('2026-11-17T10:00:00Z', 'hypertrophy'),
    ]
    const result = pickReference(sessions, 'hypertrophy', NOW)
    expect(result?.session.startedAt).toBe('2026-11-17T10:00:00Z')
    expect(result?.sameType).toBe(true)
  })

  it('null week type is never a same-type reference', () => {
    const result = pickReference([sessionOn('2026-11-24T10:00:00Z', null)], 'hypertrophy', NOW)
    expect(result?.sameType).toBe(false)
  })

  it('falls back when the same-type session is older than the window', () => {
    const tooOld = new Date(NOW.getTime() - (REFERENCE_WINDOW_WEEKS * 7 + 1) * 24 * 60 * 60 * 1000)
    const result = pickReference([sessionOn(tooOld.toISOString(), 'hypertrophy')], 'hypertrophy', NOW)
    expect(result?.sameType).toBe(false)
    expect(result?.session.startedAt).toBe(tooOld.toISOString())
  })

  it('falls back to the newest non-deload session of another type', () => {
    const sessions = [
      sessionOn('2026-11-24T10:00:00Z', 'strength', true),
      sessionOn('2026-11-20T10:00:00Z', 'strength'),
    ]
    const result = pickReference(sessions, 'hypertrophy', NOW)
    expect(result).toEqual({ session: sessions[1], sameType: false })
  })

  it('returns null for no sessions or only deloads', () => {
    expect(pickReference([], 'hypertrophy', NOW)).toBeNull()
    expect(pickReference([sessionOn('2026-11-24T10:00:00Z', 'hypertrophy', true)], 'hypertrophy', NOW)).toBeNull()
  })
})

describe('sameTypeExposures', () => {
  it('returns the newest non-deload same-type sessions up to count', () => {
    const sessions = [
      sessionOn('2026-11-24T10:00:00Z', 'hypertrophy', true),
      sessionOn('2026-11-22T10:00:00Z', 'strength'),
      sessionOn('2026-11-20T10:00:00Z', 'hypertrophy'),
      sessionOn('2026-11-13T10:00:00Z', 'hypertrophy'),
      sessionOn('2026-11-06T10:00:00Z', 'hypertrophy'),
    ]
    const result = sameTypeExposures(sessions, 'hypertrophy', 2)
    expect(result.map(s => s.startedAt)).toEqual(['2026-11-20T10:00:00Z', '2026-11-13T10:00:00Z'])
  })
})

describe('isStalled', () => {
  const flat = [flatSession('2026-11-20T10:00:00Z'), flatSession('2026-11-13T10:00:00Z'), flatSession('2026-11-06T10:00:00Z')]

  it('is stalled on a bulk when e1RM has not gained twice', () => {
    expect(isStalled(flat, 'bulking')).toBe(true)
    expect(isStalled(flat, null)).toBe(true)
  })

  it('is not stalled on a cut when e1RM is flat', () => {
    expect(isStalled(flat, 'cutting')).toBe(false)
  })

  it('is stalled on a cut only when e1RM declined twice', () => {
    const declining = [
      failureSession('2026-11-20T10:00:00Z', 8),
      failureSession('2026-11-13T10:00:00Z', 9),
      failureSession('2026-11-06T10:00:00Z', 10),
    ]
    expect(isStalled(declining, 'cutting')).toBe(true)
  })

  it('is not stalled when the newest session improved', () => {
    const improving = [
      failureSession('2026-11-20T10:00:00Z', 10),
      failureSession('2026-11-13T10:00:00Z', 9),
      failureSession('2026-11-06T10:00:00Z', 9),
    ]
    expect(isStalled(improving, 'bulking')).toBe(false)
  })

  it('is not stalled with fewer than 3 exposures or differing weights', () => {
    expect(isStalled(flat.slice(0, 2), 'bulking')).toBe(false)
    const mixed = [flat[0], flat[1], failureSession('2026-11-06T10:00:00Z', 10, 32.5)]
    expect(isStalled(mixed, 'bulking')).toBe(false)
  })
})

describe('topOfRangeStreak', () => {
  function atReps(startedAt: string, reps: number, weightKg = 30): PastSession {
    return makeSession({ workoutId: startedAt, startedAt, sets: [makeSet({ weightKg, reps })] })
  }

  it('counts consecutive newest exposures at max reps and the same weight', () => {
    const exposures = [atReps('2026-11-20T10:00:00Z', 12), atReps('2026-11-13T10:00:00Z', 12), atReps('2026-11-06T10:00:00Z', 10)]
    expect(topOfRangeStreak(exposures, 12)).toBe(2)
  })

  it('stops at a different weight', () => {
    const exposures = [atReps('2026-11-20T10:00:00Z', 12), atReps('2026-11-13T10:00:00Z', 12, 27.5)]
    expect(topOfRangeStreak(exposures, 12)).toBe(1)
  })

  it('is 0 when the newest exposure is below the range top or there are none', () => {
    expect(topOfRangeStreak([atReps('2026-11-20T10:00:00Z', 11)], 12)).toBe(0)
    expect(topOfRangeStreak([], 12)).toBe(0)
  })
})
