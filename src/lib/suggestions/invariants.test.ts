import { beforeAll, describe, it, expect } from 'vitest'
import { planExercise } from './plan-exercise'
import { progressionIncrement } from './steps'
import type {
  EquipmentKind, ExercisePlan, LoggedSet, PastSession, PlanContext, PlanRule, RepRange, WeekKind,
} from './types'

const NOW = new Date('2026-11-26T10:00:00Z')
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
const TOLERANCE = 1e-9
// The re-planning checks (determinism, prior deload) run on every Nth eligible point.
const SAMPLE_EVERY = 25
// Each invariant keeps this many failure messages; the count is always exact.
const MAX_SAMPLES = 50

const STEPS = [2, 2.5, 5]
const STEP_MULTIPLES = [3, 10, 15, 40]
const REP_PATTERNS = [[12, 11, 10], [10, 9, 7], [8, 8, 8], [5, 5, 5], [20, 18, 16]]
const RPES = [null, 6, 8, 10]
const WEEK_KINDS: WeekKind[] = ['strength', 'hypertrophy', 'volume']
const PHASES: PlanContext['phase'][] = ['bulking', 'cutting', 'maingaining', null]
const SCENARIOS = ['same-type', 'conversion', 'deload-week'] as const
const MOVEMENTS: PlanContext['movement'][] = ['compound', 'isolation']
const READINESS = [null, 2]
const HISTORY_DEPTHS = [1, 3]
// One more planned set than the reference covers the "beyond the reference" positions.
const EXTRA_PLANNED_SETS = [0, 1]

interface Lifter { experience: PlanContext['experience']; equipment: EquipmentKind; isBodyweightOnly: boolean }
const LIFTERS: Lifter[] = [
  { experience: 'intermediate', equipment: 'dumbbell', isBodyweightOnly: false },
  { experience: 'beginner', equipment: 'barbell', isBodyweightOnly: false },
  { experience: 'intermediate', equipment: 'bodyweight', isBodyweightOnly: true },
]

const WEEK_SCHEMES: Record<WeekKind, { repRange: RepRange; rpeTarget: number }> = {
  strength: { repRange: { min: 3, max: 5 }, rpeTarget: 8.5 },
  hypertrophy: { repRange: { min: 8, max: 12 }, rpeTarget: 7.5 },
  volume: { repRange: { min: 13, max: 20 }, rpeTarget: 7 },
}
const STRENGTH_ISOLATION_RANGE: RepRange = { min: 6, max: 10 }
const CONVERSION_SOURCE: Record<WeekKind, WeekKind> = {
  strength: 'hypertrophy', hypertrophy: 'volume', volume: 'hypertrophy',
}
const SAME_WEIGHT_EXEMPT_RULES: PlanRule[] = ['deload', 'stall-reset', 'come-down', 'calibration']
const DELOAD_RPE_TARGET = 7
const DELOAD_MAX_STEP_SHARE = 0.25
const ALL_RULES: PlanRule[] = [
  'calibration', 'come-down', 'deload', 'hold-add-reps', 'hold-match', 'reps-only',
  'stall-reset', 'top-set-hold', 'top-set-up', 'weight-up', 'weight-up-forced',
]

interface GridPoint {
  step: number; weightKg: number; reps: number[]; rpe: number | null
  weekKind: WeekKind; phase: PlanContext['phase']; scenario: typeof SCENARIOS[number]
  movement: PlanContext['movement']; readinessAverage: number | null; depth: number
  extraSets: number; lifter: Lifter
}

interface GridCase { point: GridPoint; ctx: PlanContext; history: PastSession[]; plan: ExercisePlan }

function loggedSet(weightKg: number, reps: number, rpe: number | null): LoggedSet {
  return {
    weightKg, reps, rpe, rpeSource: rpe === null ? null : 'entered',
    suggestedWeightKg: null, suggestedReps: null,
  }
}

function weeksAgo(weeks: number): string {
  return new Date(NOW.getTime() - weeks * MS_PER_WEEK).toISOString()
}

function buildHistory(point: GridPoint): PastSession[] {
  const weekKind = point.scenario === 'conversion' ? CONVERSION_SOURCE[point.weekKind] : point.weekKind
  return Array.from({ length: point.depth }, (_, index) => ({
    workoutId: `w${index}`, startedAt: weeksAgo(index + 1), weekKind, isDeload: false, bodyweightKg: 75,
    sets: point.reps.map(reps => loggedSet(point.weightKg, reps, point.rpe)),
  }))
}

function buildContext(point: GridPoint): PlanContext {
  return {
    weekKind: point.weekKind, ...WEEK_SCHEMES[point.weekKind],
    isDeloadWeek: point.scenario === 'deload-week', phase: point.phase,
    experience: point.lifter.experience, movement: point.movement, equipment: point.lifter.equipment,
    weightStepKg: point.step, isBodyweightOnly: point.lifter.isBodyweightOnly,
    plannedSets: point.reps.length + point.extraSets, readinessAverage: point.readinessAverage,
  }
}

/** Yields groups of points that differ only in RPE, so the RPE-order check never needs the whole grid. */
function* gridGroups(): Generator<GridPoint[]> {
  for (const step of STEPS) for (const multiple of STEP_MULTIPLES) for (const reps of REP_PATTERNS)
    for (const weekKind of WEEK_KINDS) for (const phase of PHASES) for (const scenario of SCENARIOS)
      for (const movement of MOVEMENTS) for (const readinessAverage of READINESS)
        for (const depth of HISTORY_DEPTHS) for (const extraSets of EXTRA_PLANNED_SETS)
          for (const lifter of LIFTERS) {
            yield RPES.map(rpe => ({
              step, weightKg: step * multiple, reps, rpe, weekKind, phase,
              scenario, movement, readinessAverage, depth, extraSets, lifter,
            }))
          }
}

function planCase(point: GridPoint): GridCase {
  const ctx = buildContext(point)
  const history = buildHistory(point)
  const plan = planExercise(history, ctx, NOW)
  if (!plan) throw new Error(`No plan for ${describePoint(point)}`)
  return { point, ctx, history, plan }
}

function describePoint(point: GridPoint): string {
  const { lifter, ...rest } = point
  return JSON.stringify({ ...rest, equipment: lifter.equipment, experience: lifter.experience })
}

function effectiveRange(ctx: PlanContext): RepRange {
  const isStrengthIsolation = ctx.weekKind === 'strength' && ctx.movement === 'isolation'
  return isStrengthIsolation ? STRENGTH_ISOLATION_RANGE : ctx.repRange
}

function referenceWeight(gridCase: GridCase): number {
  return gridCase.point.lifter.isBodyweightOnly ? 0 : gridCase.point.weightKg
}

function failure(gridCase: GridCase, detail: string): string {
  return `${describePoint(gridCase.point)} rule=${gridCase.plan.explanation.rule}: ${detail}`
}

function isStepMultiple(weightKg: number, step: number): boolean {
  return Math.abs(weightKg - Math.round(weightKg / step) * step) <= TOLERANCE
}

function weightOnGridFailures(gridCase: GridCase): string[] {
  const { step, lifter } = gridCase.point
  return gridCase.plan.sets.flatMap((set, index) => {
    if (lifter.isBodyweightOnly) return set.weightKg === 0 ? [] : [failure(gridCase, `set ${index + 1} weight ${set.weightKg} ≠ 0`)]
    if (set.weightKg > 0 && isStepMultiple(set.weightKg, step)) return []
    return [failure(gridCase, `set ${index + 1} weight ${set.weightKg} not a positive multiple of ${step}`)]
  })
}

function weightCapFailures(gridCase: GridCase): string[] {
  if (gridCase.plan.explanation.rule === 'calibration') return []
  const cap = referenceWeight(gridCase) + progressionIncrement(gridCase.ctx)
  return gridCase.plan.sets.flatMap((set, index) => set.weightKg <= cap + TOLERANCE
    ? []
    : [failure(gridCase, `set ${index + 1} weight ${set.weightKg} > cap ${cap}`)])
}

function sameWeightRepsFailures(gridCase: GridCase): string[] {
  if (SAME_WEIGHT_EXEMPT_RULES.includes(gridCase.plan.explanation.rule)) return []
  const { max } = effectiveRange(gridCase.ctx)
  return gridCase.plan.sets.flatMap((set, index) => {
    const referenceReps = gridCase.point.reps[index]
    if (referenceReps === undefined || set.weightKg !== referenceWeight(gridCase)) return []
    const floor = Math.min(referenceReps, max)
    return set.reps >= floor ? [] : [failure(gridCase, `set ${index + 1} reps ${set.reps} < ${floor} at same weight`)]
  })
}

function repsCapFailures(gridCase: GridCase): string[] {
  if (gridCase.point.lifter.isBodyweightOnly) return []
  // A deload matches the reference reps (spec 6.8); deloadShapeFailures checks it instead.
  if (gridCase.plan.explanation.rule === 'deload') return []
  const { max } = effectiveRange(gridCase.ctx)
  return gridCase.plan.sets.flatMap((set, index) => set.role !== 'straight' || set.reps <= max
    ? []
    : [failure(gridCase, `straight set ${index + 1} reps ${set.reps} > max ${max}`)])
}

function deloadWeightFailure(gridCase: GridCase, weightKg: number, setNumber: number): string[] {
  const reference = referenceWeight(gridCase)
  const isWeightKept = gridCase.point.step > DELOAD_MAX_STEP_SHARE * reference
  if (isWeightKept && weightKg === reference) return []
  if (!isWeightKept && weightKg < reference) return []
  const expected = isWeightKept ? `= ${reference}` : `< ${reference}`
  return [failure(gridCase, `deload set ${setNumber} weight ${weightKg}, expected ${expected}`)]
}

function deloadShapeFailures(gridCase: GridCase): string[] {
  if (gridCase.plan.explanation.rule !== 'deload') return []
  const { reps } = gridCase.point
  return gridCase.plan.sets.flatMap((set, index) => {
    const expectedReps = reps[index] ?? reps[reps.length - 1]
    const repsFailure = set.reps === expectedReps
      ? [] : [failure(gridCase, `deload set ${index + 1} reps ${set.reps} ≠ ${expectedReps}`)]
    const rpeFailure = set.rpeTarget === DELOAD_RPE_TARGET
      ? [] : [failure(gridCase, `deload set ${index + 1} rpe ${set.rpeTarget} ≠ ${DELOAD_RPE_TARGET}`)]
    return [...repsFailure, ...rpeFailure, ...deloadWeightFailure(gridCase, set.weightKg, index + 1)]
  })
}

/** Within one group (same point, different RPE): a harder reference never gives a heavier set 1 under the same rule. */
function rpeOrderFailures(group: GridCase[]): string[] {
  const rated = group.filter(gridCase => gridCase.point.rpe !== null)
  return rated.flatMap(easier => rated.flatMap(harder => {
    if ((harder.point.rpe ?? 0) <= (easier.point.rpe ?? 0)) return []
    if (harder.plan.explanation.rule !== easier.plan.explanation.rule) return []
    const harderWeight = harder.plan.sets[0]?.weightKg ?? 0
    const easierWeight = easier.plan.sets[0]?.weightKg ?? 0
    if (harderWeight <= easierWeight + TOLERANCE) return []
    return [failure(harder, `rpe ${harder.point.rpe} set-1 ${harderWeight} > rpe ${easier.point.rpe} set-1 ${easierWeight}`)]
  }))
}

function withPriorDeload(history: PastSession[], step: number): PastSession[] {
  const [reference] = history
  const deload: PastSession = {
    ...reference, workoutId: 'deload', startedAt: weeksAgo(0.5), isDeload: true,
    sets: reference.sets.map(set => ({ ...set, weightKg: Math.max(step, Math.floor((set.weightKg * 0.87) / step) * step) })),
  }
  return [deload, ...history]
}

// The newest-session flag follows the Last column, which a newer deload session does change.
function withoutNewestFlag(plan: ExercisePlan | null): unknown {
  if (!plan) return plan
  const { isReferenceNewest: _isReferenceNewest, ...explanation } = plan.explanation
  return { ...plan, explanation }
}

function priorDeloadFailures(gridCase: GridCase): string[] {
  const replanned = planExercise(withPriorDeload(gridCase.history, gridCase.point.step), gridCase.ctx, NOW)
  if (replanned && replanned.explanation.isReferenceNewest) {
    return [failure(gridCase, 'a newer deload session should not be the reference')]
  }
  return JSON.stringify(withoutNewestFlag(replanned)) === JSON.stringify(withoutNewestFlag(gridCase.plan))
    ? []
    : [failure(gridCase, 'plan changed after a prior deload session')]
}

function determinismFailures(gridCase: GridCase): string[] {
  const replanned = planExercise(gridCase.history, gridCase.ctx, NOW)
  return JSON.stringify(replanned) === JSON.stringify(gridCase.plan)
    ? []
    : [failure(gridCase, 'second run differs')]
}

type InvariantName =
  | 'weightOnGrid' | 'weightCap' | 'sameWeightReps' | 'repsCap' | 'deloadShape'
  | 'rpeOrder' | 'priorDeload' | 'determinism'

const PER_CASE_CHECKS: [InvariantName, (gridCase: GridCase) => string[]][] = [
  ['weightOnGrid', weightOnGridFailures],
  ['weightCap', weightCapFailures],
  ['sameWeightReps', sameWeightRepsFailures],
  ['repsCap', repsCapFailures],
  ['deloadShape', deloadShapeFailures],
]

interface InvariantResult { count: number; samples: string[] }

class GridSweep {
  readonly results = new Map<InvariantName, InvariantResult>()
  readonly rulesFired = new Set<PlanRule>()
  pointCount = 0
  private deloadPointCount = 0

  record(name: InvariantName, failures: string[]): void {
    const result = this.results.get(name) ?? { count: 0, samples: [] }
    result.count += failures.length
    result.samples.push(...failures.slice(0, MAX_SAMPLES - result.samples.length))
    this.results.set(name, result)
  }

  checkCase(gridCase: GridCase): void {
    this.pointCount += 1
    this.rulesFired.add(gridCase.plan.explanation.rule)
    for (const [name, check] of PER_CASE_CHECKS) this.record(name, check(gridCase))
    if (this.pointCount % SAMPLE_EVERY === 0) this.record('determinism', determinismFailures(gridCase))
    if (gridCase.point.scenario !== 'deload-week') return
    this.deloadPointCount += 1
    if (this.deloadPointCount % SAMPLE_EVERY === 0) this.record('priorDeload', priorDeloadFailures(gridCase))
  }

  checkGroup(points: GridPoint[]): void {
    const group = points.map(planCase)
    group.forEach(gridCase => this.checkCase(gridCase))
    this.record('rpeOrder', rpeOrderFailures(group))
  }

  resultFor(name: InvariantName): InvariantResult {
    return this.results.get(name) ?? { count: 0, samples: [] }
  }
}

const NO_FAILURES: InvariantResult = { count: 0, samples: [] }

describe('planExercise invariants over the grid', { timeout: 120_000 }, () => {
  const sweep = new GridSweep()

  beforeAll(() => {
    for (const group of gridGroups()) sweep.checkGroup(group)
  }, 120_000)

  it('covers the whole grid and fires every rule', () => {
    expect(sweep.pointCount).toBe(414_720)
    expect([...sweep.rulesFired].sort()).toEqual(ALL_RULES)
  })

  it('every weight is a positive step multiple, or 0 for bodyweight', () => {
    expect(sweep.resultFor('weightOnGrid')).toEqual(NO_FAILURES)
  })

  it('outside calibration, no weight exceeds reference set 1 + one increment', () => {
    expect(sweep.resultFor('weightCap')).toEqual(NO_FAILURES)
  })

  it('at the same weight, reps never drop below min(reference reps, range max)', () => {
    expect(sweep.resultFor('sameWeightReps')).toEqual(NO_FAILURES)
  })

  it('straight-set reps never exceed the range max', () => {
    expect(sweep.resultFor('repsCap')).toEqual(NO_FAILURES)
  })

  it('a deload matches reference reps at RPE 7 and a lighter weight unless one step is too big', () => {
    expect(sweep.resultFor('deloadShape')).toEqual(NO_FAILURES)
  })

  it('within one rule, a harder reference never yields a heavier set 1', () => {
    expect(sweep.resultFor('rpeOrder')).toEqual(NO_FAILURES)
  })

  it('a prior deload session does not change a deload plan (sampled)', () => {
    expect(sweep.resultFor('priorDeload')).toEqual(NO_FAILURES)
  })

  it('is deterministic (sampled)', () => {
    expect(sweep.resultFor('determinism')).toEqual(NO_FAILURES)
  })
})
