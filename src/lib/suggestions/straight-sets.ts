import { calculateWeightFrom1RM } from '@/lib/algorithms'
import { currentE1rm, predictReps, sessionFatigue } from './capacity'
import { sessionEfforts } from './effort'
import { isStalled, sameTypeExposures, topOfRangeStreak } from './reference'
import { progressionIncrement, roundDownToStep } from './steps'
import type { PastSession, PlanContext, PlanModifier, PlanRule, SetSuggestion } from './types'

const LOW_READINESS_MAX_AVERAGE = 2
const LOW_READINESS_RPE_DROP = 0.5
const DEFAULT_STRAIGHT_SET_FATIGUE = 1.0
const STALL_EXPOSURES = 3
const FORCED_UP_EXPOSURES = 2
// Set 1 ground out this far past the target RIR, below range min, means the weight was too heavy.
const COME_DOWN_RIR_MARGIN = 1.5

export interface StraightSetPlan { sets: SetSuggestion[]; rule: PlanRule; modifiers: PlanModifier[] }

interface PlanInputs {
  ctx: PlanContext
  referenceWeightKg: number
  referenceSetOneReps: number
  referenceReps: number[]
  refRir1: number
  targetRir: number
  effectiveRpe: number
  e1rm: number | null
  fatigue: number
  increment: number
  isLowReadiness: boolean
}

interface WeightChange { weightKg: number; rule: PlanRule }
interface RepsPlan { reps: number[]; rule: PlanRule; modifiers: PlanModifier[] }
type Budget = 'every-set' | 'one-rep' | 'none'

function buildInputs(history: PastSession[], reference: PastSession, ctx: PlanContext): PlanInputs {
  const [firstSet] = reference.sets
  if (!firstSet) throw new Error(`Reference session ${reference.workoutId} has no working sets`)
  const isLowReadiness = ctx.readinessAverage !== null && ctx.readinessAverage <= LOW_READINESS_MAX_AVERAGE
  const effectiveRpe = ctx.rpeTarget - (isLowReadiness ? LOW_READINESS_RPE_DROP : 0)
  return {
    ctx,
    referenceWeightKg: ctx.isBodyweightOnly ? 0 : firstSet.weightKg,
    referenceSetOneReps: firstSet.reps,
    referenceReps: reference.sets.slice(0, ctx.plannedSets).map(set => set.reps),
    refRir1: sessionEfforts(reference.sets)[0].rir,
    targetRir: 10 - effectiveRpe,
    effectiveRpe,
    // Bodyweight rows mix 0 and the lifter's bodyweight, so no capacity model applies.
    e1rm: ctx.isBodyweightOnly ? null : currentE1rm(history),
    fatigue: sessionFatigue(history, DEFAULT_STRAIGHT_SET_FATIGUE),
    increment: progressionIncrement(ctx),
    isLowReadiness,
  }
}

function weightUp(weightKg: number, increment: number, step: number): number {
  const raised = roundDownToStep(weightKg + increment, step)
  return raised > weightKg ? raised : roundDownToStep(weightKg, step) + step
}

function capacityAllows(inputs: PlanInputs, e1rm: number, weightKg: number): boolean {
  const { repRange, plannedSets } = inputs.ctx
  const firstSetReps = predictReps(e1rm, weightKg, inputs.targetRir, 0, inputs.fatigue)
  const lastSetReps = predictReps(e1rm, weightKg, inputs.targetRir, plannedSets - 1, inputs.fatigue)
  return firstSetReps >= repRange.min && lastSetReps >= repRange.min - 1
}

function chooseWeightAtTopOfRange(history: PastSession[], inputs: PlanInputs): WeightChange | null {
  // Low readiness means no progression today, including load.
  if (inputs.isLowReadiness) return null
  const { ctx, e1rm } = inputs
  const raisedWeight = weightUp(inputs.referenceWeightKg, inputs.increment, ctx.weightStepKg)
  if (e1rm === null) return { weightKg: raisedWeight, rule: 'reps-only' }
  if (capacityAllows(inputs, e1rm, raisedWeight)) return { weightKg: raisedWeight, rule: 'weight-up' }
  const exposures = sameTypeExposures(history, ctx.weekKind, FORCED_UP_EXPOSURES)
  // The capacity check errs light; two exposures at the top of the range override it.
  if (topOfRangeStreak(exposures, ctx.repRange.max) >= FORCED_UP_EXPOSURES) {
    return { weightKg: raisedWeight, rule: 'weight-up-forced' }
  }
  return null
}

function chooseComeDown(inputs: PlanInputs): WeightChange | null {
  const { ctx, e1rm } = inputs
  if (e1rm === null) return null
  if (inputs.referenceSetOneReps >= ctx.repRange.min) return null
  if (inputs.refRir1 >= inputs.targetRir - COME_DOWN_RIR_MARGIN) return null
  const weightForMinReps = calculateWeightFrom1RM(e1rm, ctx.repRange.min + inputs.targetRir)
  const weightKg = roundDownToStep(weightForMinReps, ctx.weightStepKg)
  // A stronger older e1RM can put this at or above the reference; that is not a come-down.
  if (weightKg >= inputs.referenceWeightKg) return null
  return { weightKg, rule: 'come-down' }
}

function chooseStallReset(history: PastSession[], inputs: PlanInputs): WeightChange | null {
  const { ctx } = inputs
  // Reps are capped at the top of the range, so a flat e1RM there is not a stall.
  if (inputs.referenceSetOneReps >= ctx.repRange.max) return null
  if (!isStalled(sameTypeExposures(history, ctx.weekKind, STALL_EXPOSURES), ctx.phase)) return null
  const reset = roundDownToStep(inputs.referenceWeightKg - inputs.increment, ctx.weightStepKg)
  const weightKg = Math.max(ctx.weightStepKg, reset)
  if (weightKg >= inputs.referenceWeightKg) return null
  return { weightKg, rule: 'stall-reset' }
}

function chooseWeight(history: PastSession[], inputs: PlanInputs): WeightChange | null {
  const { ctx } = inputs
  if (ctx.isBodyweightOnly) return null
  const stallReset = chooseStallReset(history, inputs)
  if (stallReset) return stallReset
  if (inputs.referenceSetOneReps >= ctx.repRange.max) return chooseWeightAtTopOfRange(history, inputs)
  return chooseComeDown(inputs)
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

function repsForNewWeight(inputs: PlanInputs, weightKg: number): number[] {
  const { repRange, plannedSets } = inputs.ctx
  const { e1rm } = inputs
  return Array.from({ length: plannedSets }, (_, setIndex) => {
    if (e1rm === null) return repRange.min
    const predicted = predictReps(e1rm, weightKg, inputs.targetRir, setIndex, inputs.fatigue)
    const floor = setIndex === 0 ? repRange.min : repRange.min - 1
    return clamp(predicted, floor, repRange.max)
  })
}

function repsCap(ctx: PlanContext): number {
  return ctx.isBodyweightOnly ? Infinity : ctx.repRange.max
}

function heldStartingReps(inputs: PlanInputs): number[] {
  const { ctx } = inputs
  const reps = inputs.referenceReps.map(count => Math.min(count, repsCap(ctx)))
  while (reps.length < ctx.plannedSets) {
    const previous = reps[reps.length - 1]
    reps.push(Math.max(1, Math.floor(previous - inputs.fatigue)))
  }
  return reps
}

function chooseBudget(inputs: PlanInputs): Budget {
  const isCutting = inputs.ctx.phase === 'cutting'
  if (inputs.ctx.isBodyweightOnly) return isCutting ? 'none' : 'one-rep'
  const room = inputs.refRir1 - inputs.targetRir
  if (room >= 1) return 'every-set'
  if (room > -1) return 'one-rep'
  return isCutting ? 'none' : 'one-rep'
}

/** +1 total: the lowest set below min, else set 1, else the next set below max; else dropped. */
function placeOneRep(reps: number[], min: number, max: number): number[] {
  const belowMin = reps.findIndex(count => count < min)
  const target = belowMin !== -1 ? belowMin : reps.findIndex(count => count < max)
  if (target === -1) return reps
  return reps.map((count, index) => (index === target ? count + 1 : count))
}

function addRepToEverySet(inputs: PlanInputs, reps: number[], weightKg: number): number[] {
  const { e1rm, ctx } = inputs
  return reps.map((count, setIndex) => {
    // The ceiling keeps reps beyond the minimum push within one rep of the target effort.
    const ceiling = e1rm === null
      ? Infinity
      : predictReps(e1rm, weightKg, inputs.targetRir - 1, setIndex, inputs.fatigue)
    const cap = Math.min(repsCap(ctx), ceiling)
    return Math.max(count, Math.min(count + 1, cap))
  })
}

function repsWithBudget(inputs: PlanInputs, weightKg: number): RepsPlan {
  const startingReps = heldStartingReps(inputs)
  if (inputs.isLowReadiness) return { reps: startingReps, rule: 'hold-match', modifiers: [] }
  const budget = chooseBudget(inputs)
  if (budget === 'none') return { reps: startingReps, rule: 'hold-match', modifiers: ['cut'] }
  const reps = budget === 'every-set'
    ? addRepToEverySet(inputs, startingReps, weightKg)
    : placeOneRep(startingReps, inputs.ctx.repRange.min, repsCap(inputs.ctx))
  const isAnyRepAdded = reps.some((count, index) => count > startingReps[index])
  return { reps, rule: isAnyRepAdded ? 'hold-add-reps' : 'hold-match', modifiers: [] }
}

function planReps(history: PastSession[], inputs: PlanInputs): RepsPlan & { weightKg: number } {
  const change = chooseWeight(history, inputs)
  if (change === null) {
    return { weightKg: inputs.referenceWeightKg, ...repsWithBudget(inputs, inputs.referenceWeightKg) }
  }
  const modifiers: PlanModifier[] = change.rule === 'stall-reset' ? ['stall-reset'] : []
  return { ...change, reps: repsForNewWeight(inputs, change.weightKg), modifiers }
}

/** History is newest first. */
export function planStraightSets(
  history: PastSession[], reference: PastSession, ctx: PlanContext, now: Date,
): StraightSetPlan {
  const inputs = buildInputs(history, reference, ctx)
  const plan = planReps(history, inputs)
  const modifiers: PlanModifier[] = inputs.isLowReadiness ? [...plan.modifiers, 'low-readiness'] : plan.modifiers
  const sets = plan.reps.map((reps): SetSuggestion => ({
    weightKg: plan.weightKg, reps, repsMax: null,
    rpeTarget: inputs.effectiveRpe, role: 'straight', optional: false,
  }))
  return { sets, rule: plan.rule, modifiers }
}
