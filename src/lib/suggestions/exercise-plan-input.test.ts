import { describe, it, expect } from 'vitest'
import { WUP_CYCLE } from '@/lib/workout-intelligence'
import type { TrainingCycle } from '@/lib/training-cycle'
import type { ActiveExercise, ActiveSet, Exercise } from '@/types/database'
import {
  buildPlanContext,
  resolveExercisePlan,
  toHookResult,
  toPreviousSession,
} from './exercise-plan-input'
import { noCycleContext } from './plan-exercise'
import type { LoggedSet, PastSession, PlanContext } from './types'

const NOW = new Date('2026-11-26T10:00:00Z')
const LAST_WEEK = '2026-11-19T10:00:00Z'
const PROFILE = { training_goal: 'muscle', experience_level: 'intermediate', training_phase: 'bulking' } as const

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex-1', name: 'Dumbbell Press', muscle_group: 'chest', secondary_muscles: null,
    equipment: 'dumbbell', movement_pattern: 'push', is_custom: false, created_by: null,
    created_at: null, youtube_video_id: null,
    ...overrides,
  }
}

function makeActiveSet(setNumber: number, overrides: Partial<ActiveSet> = {}): ActiveSet {
  return {
    id: `s${setNumber}`, set_number: setNumber, weight_kg: 0, reps: 0, rpe: null,
    is_warmup: false, completed: false, saved: false,
    ...overrides,
  }
}

function makeActiveExercise(
  exercise: Exercise = makeExercise(), sets: ActiveSet[] = [1, 2, 3].map(n => makeActiveSet(n)),
  overrides: Partial<ActiveExercise> = {},
): ActiveExercise {
  return { clientId: 'c1', workout_exercise_id: null, exercise, sets, order_index: 0, ...overrides }
}

function makeCycle(kind: 'strength' | 'hypertrophy' | 'volume', isDeloadWeek = false): TrainingCycle {
  const scheme = WUP_CYCLE.find(candidate => candidate.kind === kind)
  if (!scheme) throw new Error(`missing scheme ${kind}`)
  return {
    scheme, cycleWeek: 1, phaseWeek: 1, isDeloadWeek, missedWeeks: 0, offerRestart: false,
    phaseTrainingWeeks: [], currentWeekStart: '2026-11-23', currentWeekSessions: 0,
  }
}

function makeSet(weightKg: number, reps: number): LoggedSet {
  return { weightKg, reps, rpe: null, rpeSource: null, suggestedWeightKg: null, suggestedReps: null }
}

function makeSession(weightKg: number, reps: number[], overrides: Partial<PastSession> = {}): PastSession {
  return {
    workoutId: 'w1', startedAt: LAST_WEEK, weekKind: 'hypertrophy', isDeload: false, bodyweightKg: 75,
    sets: reps.map(count => makeSet(weightKg, count)),
    ...overrides,
  }
}

function contextFor(exercise: ActiveExercise, cycle: TrainingCycle | null = makeCycle('hypertrophy')): PlanContext {
  return buildPlanContext({ exercise, cycle, profile: PROFILE, weightStep: null, readinessAverage: null })
}

function weightsAndReps(sets: { weightKg: number; reps: number }[]): string[] {
  return sets.map(set => `${set.weightKg}x${set.reps}`)
}

describe('buildPlanContext', () => {
  it('uses the cycle scheme and the exercise for the context', () => {
    const exercise = makeActiveExercise(makeExercise({ movement_pattern: 'isolation', equipment: 'Machine' }))
    const ctx = buildPlanContext({
      exercise, cycle: makeCycle('volume', true), profile: PROFILE, weightStep: null, readinessAverage: 2,
    })
    expect(ctx).toMatchObject({
      weekKind: 'volume', repRange: { min: 13, max: 20 }, rpeTarget: 7, isDeloadWeek: true,
      movement: 'isolation', equipment: 'machine', weightStepKg: 5, plannedSets: 3,
      phase: 'bulking', experience: 'intermediate', isBodyweightOnly: false, readinessAverage: 2,
    })
  })

  it('uses noCycleContext from the training goal when there is no cycle', () => {
    const ctx = buildPlanContext({
      exercise: makeActiveExercise(), cycle: null, profile: { ...PROFILE, training_goal: 'strength' },
      weightStep: null, readinessAverage: null,
    })
    expect(ctx).toMatchObject({ ...noCycleContext('strength'), isDeloadWeek: false })
  })

  it('prefers the saved weight step and counts only working sets', () => {
    const sets = [makeActiveSet(1, { is_warmup: true }), makeActiveSet(2), makeActiveSet(3)]
    const ctx = buildPlanContext({
      exercise: makeActiveExercise(makeExercise(), sets), cycle: null, profile: PROFILE,
      weightStep: 1.25, readinessAverage: null,
    })
    expect(ctx.weightStepKg).toBe(1.25)
    expect(ctx.plannedSets).toBe(2)
    expect(ctx.movement).toBe('compound')
  })

  it('plans at least one set when the exercise has no working sets yet', () => {
    expect(contextFor(makeActiveExercise(makeExercise(), [])).plannedSets).toBe(1)
  })

  it('treats a plain bodyweight exercise as bodyweight only, but not weighted or assisted ones', () => {
    const plain = makeExercise({ name: 'Push-up', equipment: 'Bodyweight' })
    const weighted = makeExercise({ name: 'Weighted Dip', equipment: 'bodyweight' })
    const assisted = makeExercise({ name: 'Assisted Pull-up', equipment: 'bodyweight' })
    expect(contextFor(makeActiveExercise(plain)).isBodyweightOnly).toBe(true)
    expect(contextFor(makeActiveExercise(weighted)).isBodyweightOnly).toBe(false)
    expect(contextFor(makeActiveExercise(assisted)).isBodyweightOnly).toBe(false)
  })
})

describe('resolveExercisePlan', () => {
  it('returns a plan for the user example', () => {
    const exercise = makeActiveExercise()
    const plan = resolveExercisePlan({
      history: [makeSession(30, [10, 9, 7])], ctx: contextFor(exercise), exercise, todayBodyweightKg: 75, now: NOW,
    })
    expect(weightsAndReps(plan?.sets ?? [])).toEqual(['30x10', '30x9', '30x8'])
    expect(plan?.explanation.rule).toBe('hold-add-reps')
  })

  it('returns null without history', () => {
    const exercise = makeActiveExercise()
    expect(resolveExercisePlan({ history: [], ctx: contextFor(exercise), exercise, todayBodyweightKg: 75, now: NOW }))
      .toBeNull()
  })

  it('adjusts the remaining sets from the completed working sets', () => {
    const sets = [
      makeActiveSet(1, { is_warmup: true, completed: true, weight_kg: 10, reps: 10 }),
      makeActiveSet(2, { completed: true, weight_kg: 30, reps: 6 }),
      makeActiveSet(3), makeActiveSet(4),
    ]
    const exercise = makeActiveExercise(makeExercise(), sets)
    const plan = resolveExercisePlan({
      history: [makeSession(30, [10, 9, 7])], ctx: contextFor(exercise), exercise, todayBodyweightKg: 75, now: NOW,
    })
    expect(plan?.sets[0]).toMatchObject({ weightKg: 30, reps: 10 })
    expect(plan?.sets.slice(1).every(set => set.weightKg < 30)).toBe(true)
  })

  it('assisted lift with new bodyweight holds assistance', () => {
    const exercise = makeActiveExercise(makeExercise({ name: 'Assisted Pull-up', equipment: 'bodyweight' }))
    const history = [makeSession(60, [10, 9, 7], { bodyweightKg: 80 })]
    const plan = resolveExercisePlan({
      history, ctx: contextFor(exercise), exercise, todayBodyweightKg: 78, now: NOW,
    })
    expect(weightsAndReps(plan?.sets ?? [])).toEqual(['20x10', '20x9', '20x8'])
    expect(plan?.explanation.rule).toBe('hold-add-reps')
  })

  it('rep_sum exercise ignores a deload session', () => {
    const exercise = makeActiveExercise(makeExercise(), undefined, { progression_model: 'rep_sum', rep_sum_target: 25 })
    const history = [
      makeSession(20, [5, 5, 5], { workoutId: 'deload', startedAt: '2026-11-24T10:00:00Z', isDeload: true }),
      makeSession(30, [10, 9, 7]),
    ]
    const plan = resolveExercisePlan({ history, ctx: contextFor(exercise), exercise, todayBodyweightKg: 75, now: NOW })
    expect(weightsAndReps(plan?.sets ?? [])).toEqual(['32.5x10', '32.5x9', '32.5x7'])
    expect(plan?.explanation).toMatchObject({ rule: 'weight-up', referenceDate: LAST_WEEK, confidence: 'medium' })
    expect(plan?.sets.every(set => set.role === 'straight' && set.repsMax === null && !set.optional)).toBe(true)
  })

  it('rep_sum exercise below its target holds the weight', () => {
    const exercise = makeActiveExercise(makeExercise(), undefined, { progression_model: 'rep_sum', rep_sum_target: 30 })
    const plan = resolveExercisePlan({
      history: [makeSession(30, [10, 9, 7])], ctx: contextFor(exercise), exercise, todayBodyweightKg: 75, now: NOW,
    })
    expect(weightsAndReps(plan?.sets ?? [])).toEqual(['30x10', '30x9', '30x7'])
    expect(plan?.explanation.rule).toBe('hold-match')
    expect(plan?.explanation.reason).toContain('26/30')
  })
})

describe('toPreviousSession', () => {
  it('returns the newest session back in assistance space with its own bodyweight', () => {
    const exercise = makeExercise({ name: 'Assisted Pull-up', equipment: 'bodyweight' })
    const previous = toPreviousSession([makeSession(60, [10], { bodyweightKg: 80 })], exercise)
    expect(previous?.sets[0].weightKg).toBe(20)
  })

  it('returns null without history', () => {
    expect(toPreviousSession([], makeExercise())).toBeNull()
  })
})

describe('toHookResult', () => {
  it('surfaces history query error', () => {
    const error = new Error('boom')
    const data = { plan: null, previous: null, hitRate: { hits: 1, total: 2 } }
    expect(toHookResult(data, error, false)).toEqual({
      plan: null, previous: null, hitRate: null, isLoading: false, error,
    })
  })

  it('passes data through and reports no hit rate when nothing was suggested', () => {
    const previous = makeSession(30, [10])
    const result = toHookResult({ plan: null, previous, hitRate: { hits: 0, total: 0 } }, undefined, true)
    expect(result).toEqual({ plan: null, previous, hitRate: null, isLoading: true, error: null })
  })

  it('wraps a non-Error failure in an Error', () => {
    expect(toHookResult(null, 'offline', false).error).toBeInstanceOf(Error)
  })
})
