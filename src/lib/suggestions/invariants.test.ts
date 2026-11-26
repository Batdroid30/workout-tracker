import { describe, it, expect } from 'vitest'
import { conversionE1rm } from './capacity'
import { planExercise } from './plan-exercise'
import { progressionIncrement } from './steps'
import type {
  EquipmentKind, ExercisePlan, LoggedSet, PastSession, PlanContext, PlanRule, RepRange, WeekKind,
} from './types'

const NOW = new Date('2026-11-26T10:00:00Z')
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
const TOLERANCE = 1e-9

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

interface GridPoint {
  step: number; weightKg: number; reps: number[]; rpe: number | null
  weekKind: WeekKind; phase: PlanContext['phase']; scenario: typeof SCENARIOS[number]
  movement: PlanContext['movement']; readinessAverage: number | null; depth: number; lifter: Lifter
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
    workoutId: `w${index}`, startedAt: weeksAgo(index + 1), weekKind, isDeload: false,
    sets: point.reps.map(reps => loggedSet(point.weightKg, reps, point.rpe)),
  }))
}

function buildContext(point: GridPoint): PlanContext {
  return {
    weekKind: point.weekKind, ...WEEK_SCHEMES[point.weekKind],
    isDeloadWeek: point.scenario === 'deload-week', phase: point.phase,
    experience: point.lifter.experience, movement: point.movement, equipment: point.lifter.equipment,
    weightStepKg: point.step, isBodyweightOnly: point.lifter.isBodyweightOnly,
    plannedSets: point.reps.length, readinessAverage: point.readinessAverage,
  }
}

function* gridPoints(): Generator<GridPoint> {
  for (const step of STEPS) for (const multiple of STEP_MULTIPLES) for (const reps of REP_PATTERNS)
    for (const rpe of RPES) for (const weekKind of WEEK_KINDS) for (const phase of PHASES)
      for (const scenario of SCENARIOS) for (const movement of MOVEMENTS)
        for (const readinessAverage of READINESS) for (const depth of HISTORY_DEPTHS)
          for (const lifter of LIFTERS) {
            yield {
              step, weightKg: step * multiple, reps, rpe, weekKind, phase,
              scenario, movement, readinessAverage, depth, lifter,
            }
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
  // A deload matches the reference reps by design (spec 6.8), so it is not capped by today's range.
  if (gridCase.plan.explanation.rule === 'deload') return []
  const { max } = effectiveRange(gridCase.ctx)
  return gridCase.plan.sets.flatMap((set, index) => set.role !== 'straight' || set.reps <= max
    ? []
    : [failure(gridCase, `straight set ${index + 1} reps ${set.reps} > max ${max}`)])
}

function rpeKey(point: GridPoint): string {
  return describePoint({ ...point, rpe: null })
}

type CasePair = (easier: GridCase, harder: GridCase) => boolean

function groupByAllButRpe(cases: GridCase[]): GridCase[][] {
  const groups = new Map<string, GridCase[]>()
  for (const gridCase of cases) {
    if (gridCase.point.rpe === null) continue
    const key = rpeKey(gridCase.point)
    groups.set(key, [...(groups.get(key) ?? []), gridCase])
  }
  return [...groups.values()]
}

function rpeOrderFailure(easier: GridCase, harder: GridCase): string[] {
  const harderWeight = harder.plan.sets[0]?.weightKg ?? 0
  const easierWeight = easier.plan.sets[0]?.weightKg ?? 0
  if (harderWeight <= easierWeight + TOLERANCE) return []
  return [failure(harder, `rpe ${harder.point.rpe} set-1 ${harderWeight} > rpe ${easier.point.rpe} set-1 ${easierWeight}`)]
}

function rpeOrderFailures(cases: GridCase[], isIncluded: CasePair): string[] {
  return groupByAllButRpe(cases).flatMap(group => group.flatMap(easier => group.flatMap(harder => {
    if ((harder.point.rpe ?? 0) <= (easier.point.rpe ?? 0)) return []
    if (harder.plan.explanation.rule !== easier.plan.explanation.rule) return []
    return isIncluded(easier, harder) ? rpeOrderFailure(easier, harder) : []
  })))
}

/**
 * KNOWN GAP (Task 6 report, awaiting a ruling): a raised top set's back-offs
 * (roundDown(top × 0.9)) can land on the reference weight at top reps + 1,
 * below what the reference did there, e.g. 25×5,5,5 → 30×3, 25×4, 25×4.
 * A raised top set is always heavier than the reference, so only back-offs are affected.
 */
function isKnownBackoffGap(gridCase: GridCase): boolean {
  return gridCase.plan.explanation.rule === 'top-set-up'
}

/**
 * KNOWN GAP (Task 6 report, awaiting a ruling): both are 'calibration', but the
 * easier reference has no e1RM within 12 reps to failure, so it takes the
 * reference + increment fallback, while the harder one is calibrated from its
 * e1RM, e.g. 100×12 @10 → 120 kg but @6 → 102.5 kg in a Strength week.
 */
function isKnownCalibrationFallbackPair(easier: GridCase, harder: GridCase): boolean {
  return easier.plan.explanation.rule === 'calibration'
    && conversionE1rm(easier.history) === null && conversionE1rm(harder.history) !== null
}

function withPriorDeload(history: PastSession[], step: number): PastSession[] {
  const [reference] = history
  const deload: PastSession = {
    ...reference, workoutId: 'deload', startedAt: weeksAgo(0.5), isDeload: true,
    sets: reference.sets.map(set => ({ ...set, weightKg: Math.max(step, Math.floor((set.weightKg * 0.87) / step) * step) })),
  }
  return [deload, ...history]
}

function priorDeloadFailures(gridCase: GridCase): string[] {
  if (gridCase.point.scenario !== 'deload-week') return []
  const replanned = planExercise(withPriorDeload(gridCase.history, gridCase.point.step), gridCase.ctx, NOW)
  return JSON.stringify(replanned) === JSON.stringify(gridCase.plan)
    ? []
    : [failure(gridCase, 'plan changed after a prior deload session')]
}

function determinismFailures(gridCase: GridCase): string[] {
  const replanned = planExercise(gridCase.history, gridCase.ctx, NOW)
  return JSON.stringify(replanned) === JSON.stringify(gridCase.plan)
    ? []
    : [failure(gridCase, 'second run differs')]
}

const CASES: GridCase[] = Array.from(gridPoints(), planCase)

describe('planExercise invariants over the grid', { timeout: 60_000 }, () => {
  it('exercises every rule', () => {
    const rulesFired = new Set(CASES.map(gridCase => gridCase.plan.explanation.rule))
    expect([...rulesFired].sort()).toEqual([
      'calibration', 'come-down', 'deload', 'hold-add-reps', 'hold-match', 'reps-only',
      'stall-reset', 'top-set-hold', 'top-set-up', 'weight-up', 'weight-up-forced',
    ])
  })

  it('every weight is a positive step multiple, or 0 for bodyweight', () => {
    expect(CASES.flatMap(weightOnGridFailures)).toEqual([])
  })

  it('outside calibration, no weight exceeds reference set 1 + one increment', () => {
    expect(CASES.flatMap(weightCapFailures)).toEqual([])
  })

  it('at the same weight, reps never drop below min(reference reps, range max)', () => {
    expect(CASES.filter(gridCase => !isKnownBackoffGap(gridCase)).flatMap(sameWeightRepsFailures)).toEqual([])
  })

  it.fails('KNOWN GAP: raised top-set back-offs can drop reps at the reference weight', () => {
    expect(CASES.filter(isKnownBackoffGap).flatMap(sameWeightRepsFailures)).toEqual([])
  })

  it('straight-set reps never exceed the range max', () => {
    expect(CASES.flatMap(repsCapFailures)).toEqual([])
  })

  it('within one rule, a harder reference never yields a heavier set 1', () => {
    const isIncluded: CasePair = (easier, harder) => !isKnownCalibrationFallbackPair(easier, harder)
    expect(rpeOrderFailures(CASES, isIncluded)).toEqual([])
  })

  it.fails('KNOWN GAP: calibration fallback is lighter than an e1RM calibration from a harder reference', () => {
    expect(rpeOrderFailures(CASES, isKnownCalibrationFallbackPair)).toEqual([])
  })

  it('a prior deload session does not change a deload plan', () => {
    expect(CASES.flatMap(priorDeloadFailures)).toEqual([])
  })

  it('is deterministic', () => {
    expect(CASES.flatMap(determinismFailures)).toEqual([])
  })
})
