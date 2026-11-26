import { describe, it, expect } from 'vitest'
import { buildReason, noCycleContext, planExercise } from './plan-exercise'
import type { LoggedSet, PastSession, PlanContext, SetSuggestion } from './types'

const NOW = new Date('2026-11-26T10:00:00Z')
const LAST_WEEK = '2026-11-19T10:00:00Z'

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

function sessionAt(
  weekKind: PastSession['weekKind'], weightKg: number, reps: number[], setOneRpe: number | null = null,
): PastSession {
  const sets = reps.map((count, index) => makeSet(weightKg, count, index === 0 ? setOneRpe : null))
  return { workoutId: `w-${weekKind}`, startedAt: LAST_WEEK, weekKind, isDeload: false, sets }
}

function weightsAndReps(sets: SetSuggestion[]): string[] {
  return sets.map(set => `${set.weightKg}x${set.reps}`)
}

const USER_EXAMPLE = sessionAt('hypertrophy', 30, [10, 9, 7])

describe('planExercise — routing', () => {
  it('returns null without history', () => {
    expect(planExercise([], makeContext(), NOW)).toBeNull()
  })

  it('returns null when every session is a deload', () => {
    const deloadOnly = { ...USER_EXAMPLE, isDeload: true }
    expect(planExercise([deloadOnly], makeContext(), NOW)).toBeNull()
  })

  it('plans a deload in a deload week', () => {
    const plan = planExercise([USER_EXAMPLE], makeContext({ isDeloadWeek: true }), NOW)
    expect(plan?.explanation.rule).toBe('deload')
    expect(weightsAndReps(plan?.sets ?? [])).toEqual(['25x10', '25x9', '25x7'])
    expect(plan?.explanation.confidence).toBe('medium')
  })

  it('calibrates on the first exposure to a week type', () => {
    const plan = planExercise([USER_EXAMPLE], makeContext({ weekKind: 'strength' }), NOW)
    expect(plan?.explanation.rule).toBe('calibration')
    expect(plan?.explanation.confidence).toBe('low')
  })

  it('plans a top set and back-offs for a compound in a Strength week', () => {
    const reference = sessionAt('strength', 100, [5, 5, 5], 8.5)
    const ctx = makeContext({ weekKind: 'strength', repRange: { min: 3, max: 5 }, rpeTarget: 8.5 })
    const plan = planExercise([reference], ctx, NOW)
    expect(plan?.explanation.rule).toMatch(/^top-set-/)
    expect(plan?.sets.map(set => set.role)).toEqual(['top', 'backoff', 'backoff'])
  })

  it('uses 6–10 @ 8.5 for an isolation in a Strength week', () => {
    const reference = sessionAt('strength', 20, [8, 8, 8])
    const ctx = makeContext({ weekKind: 'strength', repRange: { min: 3, max: 5 }, rpeTarget: 8.5, movement: 'isolation' })
    const plan = planExercise([reference], ctx, NOW)
    expect(plan?.sets.every(set => set.weightKg === 20 && set.role === 'straight')).toBe(true)
    expect(plan?.sets.every(set => set.rpeTarget === 8.5 && set.reps >= 8 && set.reps <= 10)).toBe(true)
  })

  it('calibrates an isolation into a Strength week with the 6–10 range', () => {
    const ctx = makeContext({ weekKind: 'strength', repRange: { min: 3, max: 5 }, rpeTarget: 8.5, movement: 'isolation' })
    const plan = planExercise([USER_EXAMPLE], ctx, NOW)
    expect(plan?.explanation.rule).toBe('calibration')
    expect(plan?.sets.every(set => set.reps === 6 && set.repsMax === 10)).toBe(true)
  })

  it('plans straight sets in a Hypertrophy week', () => {
    const plan = planExercise([USER_EXAMPLE], makeContext(), NOW)
    expect(weightsAndReps(plan?.sets ?? [])).toEqual(['30x10', '30x9', '30x8'])
    expect(plan?.explanation.rule).toBe('hold-add-reps')
  })
})

describe('planExercise — bodyweight only', () => {
  const ctx = makeContext({ equipment: 'bodyweight', isBodyweightOnly: true })
  const mixedWeights: PastSession = {
    ...USER_EXAMPLE, sets: [makeSet(80, 15), makeSet(0, 13), makeSet(80, 12)],
  }

  it('ignores logged weight and progresses reps', () => {
    const plan = planExercise([mixedWeights], ctx, NOW)
    expect(plan?.sets.every(set => set.weightKg === 0)).toBe(true)
    const reps = plan?.sets.map(set => set.reps) ?? []
    expect(reps[0]).toBeGreaterThanOrEqual(15)
    expect(reps[1]).toBeGreaterThanOrEqual(13)
    expect(reps[2]).toBeGreaterThanOrEqual(12)
    expect(reps.reduce((sum, count) => sum + count, 0)).toBeGreaterThan(40)
  })

  it('stays on straight sets in a Strength week', () => {
    const strengthCtx = { ...ctx, weekKind: 'strength' as const, repRange: { min: 3, max: 5 }, rpeTarget: 8.5 }
    const plan = planExercise([mixedWeights], strengthCtx, NOW)
    expect(plan?.sets.every(set => set.role === 'straight' && set.weightKg === 0)).toBe(true)
  })

  it('deloads at weight 0', () => {
    const plan = planExercise([mixedWeights], { ...ctx, isDeloadWeek: true }, NOW)
    expect(plan?.explanation.rule).toBe('deload')
    expect(plan?.sets.every(set => set.weightKg === 0)).toBe(true)
  })
})

describe('planExercise — explanation', () => {
  it('is high confidence when the reference has an entered RPE', () => {
    const reference = sessionAt('hypertrophy', 30, [10, 9, 7], 8)
    expect(planExercise([reference], makeContext(), NOW)?.explanation.confidence).toBe('high')
  })

  it('is medium confidence when efforts are inferred', () => {
    expect(planExercise([USER_EXAMPLE], makeContext(), NOW)?.explanation.confidence).toBe('medium')
  })

  it('is low confidence for reps-only', () => {
    // 18 reps + 3 in reserve exceeds the usable e1RM limit, so the weight goes up without a capacity check.
    const reference = sessionAt('hypertrophy', 30, [18, 18, 18])
    const plan = planExercise([reference], makeContext(), NOW)
    expect(plan?.explanation.rule).toBe('reps-only')
    expect(plan?.explanation.confidence).toBe('low')
  })

  it('describes the reference session', () => {
    const explanation = planExercise([USER_EXAMPLE], makeContext(), NOW)?.explanation
    expect(explanation?.referenceDate).toBe(LAST_WEEK)
    expect(explanation?.referenceSets).toEqual(USER_EXAMPLE.sets)
    expect(explanation?.effortSources).toEqual(['inferred', 'inferred', 'inferred'])
  })

  it('adds low readiness on the strength path', () => {
    const reference = sessionAt('strength', 100, [5, 5, 5], 8.5)
    const ctx = makeContext({
      weekKind: 'strength', repRange: { min: 3, max: 5 }, rpeTarget: 8.5, readinessAverage: 2,
    })
    const explanation = planExercise([reference], ctx, NOW)?.explanation
    expect(explanation?.modifiers).toEqual(['low-readiness'])
    expect(explanation?.reason).toContain('Low readiness today')
  })

  it('keeps the straight planner modifiers without duplicates', () => {
    const plan = planExercise([USER_EXAMPLE], makeContext({ readinessAverage: 1.5 }), NOW)
    expect(plan?.explanation.modifiers).toEqual(['low-readiness'])
  })

  it('frames matching on a cut as a win', () => {
    const plan = planExercise([USER_EXAMPLE], makeContext({ phase: 'cutting' }), NOW)
    expect(plan?.explanation.modifiers).toEqual(['cut'])
    expect(plan?.explanation.reason).toContain('On a cut, matching last time is a win.')
  })

  it('is deterministic', () => {
    const first = planExercise([USER_EXAMPLE], makeContext(), NOW)
    expect(planExercise([USER_EXAMPLE], makeContext(), NOW)).toEqual(first)
  })
})

describe('buildReason', () => {
  const straight = (weightKg: number, reps: number): SetSuggestion => ({
    weightKg, reps, repsMax: null, rpeTarget: 7.5, role: 'straight', optional: false,
  })

  it('names the weight and reps for added reps', () => {
    const reason = buildReason('hold-add-reps', [], [straight(30, 10), straight(30, 9), straight(30, 8)])
    expect(reason).toBe('Stay at 30 kg and beat last time: 10, 9, 8 reps.')
  })

  it('names the new weight for a weight increase', () => {
    expect(buildReason('weight-up', [], [straight(32.5, 8)])).toContain('32.5 kg')
  })

  it('shows calibration reps as a range', () => {
    const calibration: SetSuggestion = { ...straight(35, 3), repsMax: 5 }
    expect(buildReason('calibration', [], [calibration])).toContain('35 kg × 3–5')
  })

  it('appends the low readiness note', () => {
    const reason = buildReason('hold-match', ['low-readiness'], [straight(30, 10)])
    expect(reason).toMatch(/ Low readiness today — keep one more rep in reserve\.$/)
  })

  it('calls weight 0 bodyweight', () => {
    expect(buildReason('hold-add-reps', [], [straight(0, 16)])).toContain('bodyweight')
  })
})

describe('noCycleContext', () => {
  it('uses a Strength week for a strength goal', () => {
    expect(noCycleContext('strength')).toEqual({
      weekKind: 'strength', repRange: { min: 3, max: 5 }, rpeTarget: 8.5,
    })
  })

  it.each(['muscle', 'both', null] as const)('uses a Hypertrophy week for goal %s', goal => {
    expect(noCycleContext(goal)).toEqual({
      weekKind: 'hypertrophy', repRange: { min: 8, max: 12 }, rpeTarget: 7.5,
    })
  })
})
