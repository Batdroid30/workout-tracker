import { currentE1rm, predictReps } from './capacity'
import { sessionEfforts } from './effort'
import { sameTypeExposures, topOfRangeStreak } from './reference'
import { progressionIncrement, roundDownToStep } from './steps'
import type { LoggedSet, PastSession, PlanContext, PlanRule, SetSuggestion } from './types'

const LOW_READINESS_MAX_AVERAGE = 2
const LOW_READINESS_RPE_DROP = 0.5
const BACKOFF_LOAD_RATIO = 0.9
// The top set may go up when it reached the top of the range this close to the target effort.
const WEIGHT_UP_RIR_MARGIN = 0.5
// Without a reported effort, the top of the range must be hit on this many exposures first.
const ASSUMED_EFFORT_EXPOSURES = 2

export interface StrengthSetPlan { sets: SetSuggestion[]; rule: PlanRule }

interface TopSet { weightKg: number; reps: number; rule: PlanRule }

export function isLowReadiness(ctx: PlanContext): boolean {
  return ctx.readinessAverage !== null && ctx.readinessAverage <= LOW_READINESS_MAX_AVERAGE
}

export function effectiveRpe(ctx: PlanContext): number {
  return ctx.rpeTarget - (isLowReadiness(ctx) ? LOW_READINESS_RPE_DROP : 0)
}

/** Index 0 is the given top set; the rest are back-offs regenerated from it. */
export function withBackoffs(top: SetSuggestion, ctx: PlanContext): SetSuggestion[] {
  const backoff: SetSuggestion = {
    weightKg: roundDownToStep(top.weightKg * BACKOFF_LOAD_RATIO, ctx.weightStepKg),
    reps: Math.min(top.reps + 1, ctx.repRange.max),
    repsMax: null, rpeTarget: top.rpeTarget, role: 'backoff', optional: false,
  }
  return Array.from({ length: ctx.plannedSets }, (_, index) => (index === 0 ? top : { ...backoff }))
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

function isWeightUpEarned(history: PastSession[], topSet: LoggedSet, reference: PastSession, ctx: PlanContext): boolean {
  if (isLowReadiness(ctx)) return false
  const targetRir = 10 - effectiveRpe(ctx)
  const [effort] = sessionEfforts(reference.sets)
  if (topSet.reps < ctx.repRange.max || effort.rir < targetRir - WEIGHT_UP_RIR_MARGIN) return false
  if (effort.source !== 'assumed') return true
  const exposures = sameTypeExposures(history, 'strength', ASSUMED_EFFORT_EXPOSURES)
  return topOfRangeStreak(exposures, ctx.repRange.max) >= ASSUMED_EFFORT_EXPOSURES
}

function raisedTopSet(topSet: LoggedSet, e1rm: number | null, ctx: PlanContext): TopSet {
  const weightKg = roundDownToStep(topSet.weightKg + progressionIncrement(ctx), ctx.weightStepKg)
  const { min, max } = ctx.repRange
  const reps = e1rm === null ? min : clamp(predictReps(e1rm, weightKg, 10 - effectiveRpe(ctx), 0, 0), min, max)
  return { weightKg, reps, rule: 'top-set-up' }
}

function heldTopSet(topSet: LoggedSet, e1rm: number | null, ctx: PlanContext): TopSet {
  const { weightKg } = topSet
  const matchedReps = Math.min(topSet.reps, ctx.repRange.max)
  if (isLowReadiness(ctx)) return { weightKg, reps: matchedReps, rule: 'top-set-hold' }
  // The ceiling keeps the extra rep within one rep of the target effort.
  const ceiling = e1rm === null ? Infinity : predictReps(e1rm, weightKg, 10 - effectiveRpe(ctx) - 1, 0, 0)
  const reps = topSet.reps + 1 <= ceiling ? Math.min(topSet.reps + 1, ctx.repRange.max) : matchedReps
  return { weightKg, reps, rule: 'top-set-hold' }
}

/** Compound lifts in Strength weeks. History is newest first. */
export function planStrengthSets(
  history: PastSession[], reference: PastSession, ctx: PlanContext,
): StrengthSetPlan {
  const [topSet] = reference.sets
  if (!topSet) throw new Error(`Reference session ${reference.workoutId} has no working sets`)
  const e1rm = currentE1rm(history)
  const chosen = isWeightUpEarned(history, topSet, reference, ctx)
    ? raisedTopSet(topSet, e1rm, ctx)
    : heldTopSet(topSet, e1rm, ctx)
  const top: SetSuggestion = {
    weightKg: chosen.weightKg, reps: chosen.reps, repsMax: null,
    rpeTarget: effectiveRpe(ctx), role: 'top', optional: false,
  }
  return { sets: withBackoffs(top, ctx), rule: chosen.rule }
}
