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
  return { workoutId: `w-${weekKind}`, startedAt: LAST_WEEK, weekKind, isDeload: false, bodyweightKg: 75, sets }
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

describe('buildReason — assistance', () => {
  const assisted = (weightKg: number, reps: number): SetSuggestion => ({
    weightKg, reps, repsMax: null, rpeTarget: 7.5, role: 'straight', optional: false,
  })
  const referenceAt = (weightKg: number, reps: number): LoggedSet[] => [makeSet(weightKg, reps)]

  it('names the held assistance', () => {
    const reason = buildReason('hold-match', [], [assisted(20, 10)], referenceAt(20, 10), 'assistance')
    expect(reason).toBe('Same 20 kg assistance — match last time (10).')
  })

  it('reads a weight-up as dropping assistance and a come-down as adding it', () => {
    expect(buildReason('weight-up', [], [assisted(17.5, 8)], referenceAt(20, 12), 'assistance'))
      .toContain('drop assistance to 17.5 kg')
    expect(buildReason('come-down', [], [assisted(22.5, 8)], referenceAt(20, 5), 'assistance'))
      .toContain('add a little assistance (22.5 kg)')
  })

  it('keeps the deload weight check like for like in assistance', () => {
    expect(buildReason('deload', [], [assisted(20, 10)], referenceAt(20, 10), 'assistance'))
      .toBe('Deload week — same weight, easy effort.')
  })
})

describe('buildReason', () => {
  const straight = (weightKg: number, reps: number): SetSuggestion => ({
    weightKg, reps, repsMax: null, rpeTarget: 7.5, role: 'straight', optional: false,
  })
  const reference = (weightKg: number, reps: number[]): LoggedSet[] => reps.map(count => makeSet(weightKg, count))
  const plannedAt = (weightKg: number, reps: number[]): SetSuggestion[] => reps.map(count => straight(weightKg, count))

  it('names the one set that gains a rep', () => {
    const reason = buildReason('hold-add-reps', [], plannedAt(30, [10, 9, 8]), reference(30, [10, 9, 7]))
    expect(reason).toBe('Same 30 kg — add a rep on set 3 (7 → 8).')
  })

  it('says when every set gains a rep', () => {
    const reason = buildReason('hold-add-reps', [], plannedAt(30, [11, 10, 8]), reference(30, [10, 9, 7]))
    expect(reason).toBe('Same 30 kg — add a rep to every set.')
  })

  it('lists several changed sets', () => {
    const reason = buildReason('hold-add-reps', [], plannedAt(30, [11, 9, 8]), reference(30, [10, 9, 7]))
    expect(reason).toBe('Same 30 kg — add reps on set 1 (10 → 11) and set 3 (7 → 8).')
  })

  it('says match when the reps are unchanged', () => {
    const reason = buildReason('hold-match', [], plannedAt(30, [10, 9, 7]), reference(30, [10, 9, 7]))
    expect(reason).toBe('Same 30 kg — match last time (10, 9, 7).')
  })

  it('says capped when the reference was above the range max', () => {
    const reason = buildReason('hold-match', [], plannedAt(30, [12, 12, 12]), reference(30, [20, 18, 16]))
    expect(reason).toBe('Same 30 kg — capped at the top of the range (12).')
  })

  it('leads with bodyweight for weight 0', () => {
    const reason = buildReason('hold-add-reps', [], plannedAt(0, [16, 13, 12]), reference(0, [15, 13, 12]))
    expect(reason).toBe('Bodyweight — add a rep on set 1 (15 → 16).')
  })

  it('names the new weight for a weight increase', () => {
    expect(buildReason('weight-up', [], [straight(32.5, 8)], reference(30, [12]))).toContain('32.5 kg')
  })

  it.each([
    [8.5, '1–2'],
    [7.5, '2–3'],
    [7, 'about 3'],
  ])('derives calibration reps left from RPE %s', (rpeTarget, repsLeft) => {
    const calibration: SetSuggestion = { ...straight(35, 3), repsMax: 5, rpeTarget }
    expect(buildReason('calibration', [], [calibration], reference(30, [10]))).toBe(
      `First week in this rep range for this lift — start at 35 kg × 3–5 and stop with ${repsLeft} reps left.`,
    )
  })

  it('appends the low readiness note', () => {
    const reason = buildReason('hold-match', ['low-readiness'], plannedAt(30, [10]), reference(30, [10]))
    expect(reason).toBe('Same 30 kg — match last time (10). Low readiness today — no progression, aim a touch easier.')
  })

  it('adds no readiness note to a deload', () => {
    const deloadSets = [{ ...straight(25, 10), rpeTarget: 7 }, { ...straight(25, 9), rpeTarget: 7, optional: true }]
    const reason = buildReason('deload', ['low-readiness'], deloadSets, reference(30, [10, 9]))
    expect(reason).toBe('Deload week — ease off to 25 kg for 10, 9 reps. The last set is optional.')
  })

  it('says same weight, fewer sets when a deload keeps the weight', () => {
    const deloadSets = [{ ...straight(7.5, 10), rpeTarget: 7 }, { ...straight(7.5, 9), rpeTarget: 7, optional: true }]
    expect(buildReason('deload', [], deloadSets, reference(7.5, [10, 9]))).toBe(
      'Deload week — same weight, fewer sets. The last set is optional.',
    )
  })
})

describe('planExercise — reason copy', () => {
  it('names the added rep for the user example', () => {
    expect(planExercise([USER_EXAMPLE], makeContext(), NOW)?.explanation.reason)
      .toBe('Same 30 kg — add a rep on set 3 (7 → 8).')
  })

  it('matches on low readiness without promising extra reserve', () => {
    expect(planExercise([USER_EXAMPLE], makeContext({ readinessAverage: 2 }), NOW)?.explanation.reason)
      .toBe('Same 30 kg — match last time (10, 9, 7). Low readiness today — no progression, aim a touch easier.')
  })

  it('caps a reference above the range max', () => {
    const reference = sessionAt('hypertrophy', 30, [20, 18, 16])
    expect(planExercise([reference], makeContext({ readinessAverage: 2 }), NOW)?.explanation.reason)
      .toBe('Same 30 kg — capped at the top of the range (12). Low readiness today — no progression, aim a touch easier.')
  })

  it('drops the readiness note on a deload', () => {
    const plan = planExercise([USER_EXAMPLE], makeContext({ isDeloadWeek: true, readinessAverage: 2 }), NOW)
    expect(plan?.explanation.modifiers).toEqual(['low-readiness'])
    expect(plan?.explanation.reason).toBe('Deload week — ease off to 25 kg for 10, 9, 7 reps. The last set is optional.')
  })

  it('says same weight, fewer sets when a light deload keeps the weight', () => {
    const reference = sessionAt('hypertrophy', 7.5, [10, 9, 7])
    expect(planExercise([reference], makeContext({ isDeloadWeek: true }), NOW)?.explanation.reason)
      .toBe('Deload week — same weight, fewer sets. The last set is optional.')
  })

  it('uses the Strength week reps left for calibration', () => {
    const ctx = makeContext({ weekKind: 'strength', repRange: { min: 3, max: 5 }, rpeTarget: 8.5 })
    expect(planExercise([USER_EXAMPLE], ctx, NOW)?.explanation.reason)
      .toBe('First week in this rep range for this lift — start at 35 kg × 3–5 and stop with 1–2 reps left.')
  })

  it('uses the Volume week reps left for calibration', () => {
    const ctx = makeContext({ weekKind: 'volume', repRange: { min: 13, max: 20 }, rpeTarget: 7 })
    expect(planExercise([USER_EXAMPLE], ctx, NOW)?.explanation.reason).toMatch(/stop with about 3 reps left\.$/)
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
