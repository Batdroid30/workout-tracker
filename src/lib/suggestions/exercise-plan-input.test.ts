import { describe, it, expect } from 'vitest'
import { WUP_CYCLE } from '@/lib/workout-intelligence'
import type { TrainingCycle } from '@/lib/training-cycle'
import type { ActiveExercise, ActiveSet, Exercise } from '@/types/database'
import {
  buildPlanContext,
  buildPlanData,
  resolveExercisePlan,
  toHookResult,
  toPreviousSession,
} from './exercise-plan-input'
import { formatAddedWeight } from '@/lib/load'
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
    expect(plan?.explanation.referenceSets[0].weightKg).toBe(20)
    expect(plan?.explanation.reason).toContain('20 kg assistance')
  })

  it('explains an assisted weight-up as dropping assistance', () => {
    const exercise = makeActiveExercise(makeExercise({ name: 'Assisted Pull-up', equipment: 'bodyweight' }))
    const history = [makeSession(60, [12, 12, 12], { bodyweightKg: 80 })]
    const plan = resolveExercisePlan({ history, ctx: contextFor(exercise), exercise, todayBodyweightKg: 80, now: NOW })
    expect(plan?.explanation.rule).toBe('weight-up')
    expect(plan?.sets[0].weightKg).toBeLessThan(20)
    expect(plan?.explanation.reason).toContain('drop assistance')
  })

  it('explains an assisted rep_sum weight-up as dropping assistance', () => {
    const exercise = makeActiveExercise(
      makeExercise({ name: 'Assisted Dip', equipment: 'bodyweight' }), undefined,
      { progression_model: 'rep_sum', rep_sum_target: 25 },
    )
    const history = [makeSession(60, [10, 9, 7], { bodyweightKg: 80 })]
    const plan = resolveExercisePlan({ history, ctx: contextFor(exercise), exercise, todayBodyweightKg: 80, now: NOW })
    expect(plan?.sets[0].weightKg).toBe(17.5)
    expect(plan?.explanation.reason).toContain('drop assistance to 17.5 kg')
    expect(plan?.explanation.referenceSets[0].weightKg).toBe(20)
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

  it('drops a computed plan when the training cycle failed to load', () => {
    const exercise = makeActiveExercise()
    const data = buildPlanData({
      history: [makeSession(30, [10, 9, 7])], ctx: contextFor(exercise, null), exercise, todayBodyweightKg: 75, now: NOW,
    })
    const cycleError = new Error('cycle down')
    expect(data.plan).not.toBeNull()
    expect(toHookResult(data, cycleError, false)).toMatchObject({ plan: null, error: cycleError })
  })

  it('wraps a non-Error failure in an Error', () => {
    expect(toHookResult(null, 'offline', false).error).toBeInstanceOf(Error)
  })
})

describe('resolveExercisePlan — live adjustment', () => {
  function withRpe(set: LoggedSet, rpe: number): LoggedSet {
    return { ...set, rpe, rpeSource: 'entered' }
  }

  function planAfterSetOne(history: PastSession[], setOne: Partial<ActiveSet>) {
    const sets = [makeActiveSet(1, { completed: true, weight_kg: 30, ...setOne }), makeActiveSet(2), makeActiveSet(3)]
    const exercise = makeActiveExercise(makeExercise(), sets)
    return resolveExercisePlan({ history, ctx: contextFor(exercise), exercise, todayBodyweightKg: 75, now: NOW })
  }

  it('keeps sets 2–3 at the plan after set 1 hit it at the target RPE', () => {
    const roomLeft = makeSession(30, [9, 9, 9])
    roomLeft.sets[0] = withRpe(roomLeft.sets[0], 6)
    const plan = planAfterSetOne([roomLeft], { reps: 10, rpe: 7.5, rpe_source: 'entered' })
    expect(weightsAndReps(plan?.sets ?? [])).toEqual(['30x10', '30x10', '30x10'])
  })

  it('never lowers the remaining reps after set 1 met its reps with no RPE', () => {
    const plan = planAfterSetOne([makeSession(30, [9, 9, 9])], { reps: 10 })
    // Planned 30x10, 30x9, 30x9 before set 1.
    expect(plan?.sets[1].reps).toBeGreaterThanOrEqual(9)
    expect(plan?.sets[2].reps).toBeGreaterThanOrEqual(9)
  })

  it('rebuilds the reason from the adjusted sets', () => {
    const plan = planAfterSetOne([makeSession(30, [10, 9, 7])], { reps: 10, rpe: 10, rpe_source: 'entered' })
    expect(plan?.sets[1].reps).toBeLessThan(9)
    expect(plan?.explanation.reason).toContain(`set 2 (9 → ${plan?.sets[1].reps})`)
    expect(plan?.explanation.reason).not.toContain('add a rep on set 3')
  })
})

describe('resolveExercisePlan — assisted and weighted numbers stay on the equipment grid', () => {
  const ASSISTED_MACHINE = makeExercise({ name: 'Assisted Pull-up', equipment: 'machine', movement_pattern: 'pull' })
  const WEIGHTED_DIP = makeExercise({ name: 'Weighted Dip', equipment: 'bodyweight' })

  function assistedSession(bodyweightKg: number, assistanceKg: number, reps: number[]): PastSession {
    return makeSession(bodyweightKg - assistanceKg, reps, { bodyweightKg })
  }

  function planFor(exercise: Exercise, history: PastSession[], todayBodyweightKg: number, cycle = makeCycle('hypertrophy')) {
    const active = makeActiveExercise(exercise)
    return resolveExercisePlan({ history, ctx: contextFor(active, cycle), exercise: active, todayBodyweightKg, now: NOW })
  }

  it('drops assistance to a machine step on a weight-up', () => {
    const plan = planFor(ASSISTED_MACHINE, [assistedSession(80.3, 20, [12, 12, 11])], 80.3)
    expect(plan?.explanation.rule).toBe('weight-up')
    expect(plan?.sets.map(set => set.weightKg)).toEqual([15, 15, 15])
    expect(plan?.explanation.reason).toContain('drop assistance to 15 kg')
  })

  it('deloads to more assistance on the grid', () => {
    const plan = planFor(ASSISTED_MACHINE, [assistedSession(80.3, 20, [10, 9, 7])], 80.3, makeCycle('hypertrophy', true))
    expect(plan?.sets.every(set => [25, 30].includes(set.weightKg))).toBe(true)
  })

  it('never gives a back-off less assistance than the top set', () => {
    const plan = planFor(ASSISTED_MACHINE, [assistedSession(80.3, 20, [10, 9, 7])], 80.3, makeCycle('strength'))
    const [top, ...backoffs] = plan?.sets ?? []
    expect(plan?.explanation.rule).toBe('calibration')
    expect(backoffs.every(set => set.weightKg >= top.weightKg && set.weightKg % 5 === 0)).toBe(true)
  })

  it('moves weighted dips up by a whole step of added weight', () => {
    const history = [makeSession(90.3, [12, 12, 11], { bodyweightKg: 80.3 })]
    const plan = planFor(WEIGHTED_DIP, history, 80.3)
    expect(plan?.explanation.rule).toBe('weight-up')
    expect(formatAddedWeight(plan?.sets[0].weightKg ?? 0, 80.3)).toBe('+12.5kg')
  })

  it('holds the added weight when bodyweight changed since', () => {
    const history = [makeSession(90, [10, 9, 7], { bodyweightKg: 80 })]
    const plan = planFor(WEIGHTED_DIP, history, 81)
    expect(plan?.explanation.rule).toBe('hold-add-reps')
    expect(formatAddedWeight(plan?.sets[0].weightKg ?? 0, 81)).toBe('+10kg')
    expect(formatAddedWeight(plan?.explanation.referenceSets[0].weightKg ?? 0, 81)).toBe('+10kg')
  })
})

describe('resolveExercisePlan — storage-space values are step multiples', () => {
  const TOLERANCE = 1e-9
  const LIFTS = [
    { exercise: makeExercise({ name: 'Assisted Pull-up', equipment: 'machine' }), step: 5, logged: [10, 20, 30] },
    { exercise: makeExercise({ name: 'Assisted Dip', equipment: 'bodyweight' }), step: 2.5, logged: [7.5, 15] },
    { exercise: makeExercise({ name: 'Weighted Dip', equipment: 'bodyweight' }), step: 2.5, logged: [0, 10, 22.5] },
    { exercise: makeExercise({ name: 'Dumbbell Press', equipment: 'dumbbell' }), step: 2.5, logged: [12.5, 30] },
  ]
  const BODYWEIGHTS = [{ session: 75, today: 75 }, { session: 80.3, today: 80.3 }, { session: 80, today: 81.4 }]
  const REP_PATTERNS = [[12, 12, 11], [10, 9, 7], [5, 5, 5], [20, 18, 16]]
  const CYCLES = [makeCycle('hypertrophy'), makeCycle('strength'), makeCycle('volume'), makeCycle('hypertrophy', true)]

  function storageValue(name: string, weightKg: number, todayBodyweightKg: number): number {
    return /weighted/i.test(name) ? weightKg - todayBodyweightKg : weightKg
  }

  function loggedWeight(name: string, logged: number, bodyweightKg: number): number {
    if (/assisted/i.test(name)) return bodyweightKg - logged
    return /weighted/i.test(name) ? bodyweightKg + logged : logged
  }

  it('assistance, added weight and plain weight all land on the grid', () => {
    const failures: string[] = []
    for (const { exercise, step, logged } of LIFTS) for (const value of logged) for (const bodyweight of BODYWEIGHTS)
      for (const reps of REP_PATTERNS) for (const cycle of CYCLES) {
        const history = [makeSession(loggedWeight(exercise.name, value, bodyweight.session), reps, { bodyweightKg: bodyweight.session })]
        const active = makeActiveExercise(exercise)
        const plan = resolveExercisePlan({
          history, ctx: contextFor(active, cycle), exercise: active, todayBodyweightKg: bodyweight.today, now: NOW,
        })
        for (const set of plan?.sets ?? []) {
          const stored = storageValue(exercise.name, set.weightKg, bodyweight.today)
          if (Math.abs(stored / step - Math.round(stored / step)) > TOLERANCE) {
            failures.push(`${exercise.name} ${value} bw ${JSON.stringify(bodyweight)} ${reps} ${cycle.scheme.kind}: ${stored}`)
          }
        }
      }
    expect(failures.slice(0, 10)).toEqual([])
  })
})

describe('resolveExercisePlan — flags an older reference session', () => {
  const exercise = makeActiveExercise()
  const newerVolume = makeSession(22.5, [15, 14, 13], { workoutId: 'v', startedAt: '2026-11-24T10:00:00Z', weekKind: 'volume' })

  it('marks the reference as not the newest when it is older than the Last column', () => {
    const plan = resolveExercisePlan({
      history: [newerVolume, makeSession(30, [10, 9, 7])], ctx: contextFor(exercise), exercise, todayBodyweightKg: 75, now: NOW,
    })
    expect(plan?.explanation.isReferenceNewest).toBe(false)
    expect(plan?.explanation.referenceWeekKind).toBe('hypertrophy')
    expect(plan?.explanation.reason).toBe('Same 30 kg — add a rep on set 3 (7 → 8).')
  })

  it('marks the reference as the newest when it is the Last column session', () => {
    const plan = resolveExercisePlan({
      history: [makeSession(30, [10, 9, 7])], ctx: contextFor(exercise), exercise, todayBodyweightKg: 75, now: NOW,
    })
    expect(plan?.explanation.isReferenceNewest).toBe(true)
    expect(plan?.explanation.weekKind).toBe('hypertrophy')
    expect(plan?.explanation.repRange).toEqual({ min: 8, max: 12 })
  })
})
