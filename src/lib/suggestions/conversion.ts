import { calculateWeightFrom1RM } from '@/lib/algorithms'
import { conversionE1rm } from './capacity'
import { effectiveRpe } from './readiness'
import { progressionIncrement, roundDownToStep } from './steps'
import { planStraightSets } from './straight-sets'
import { withBackoffs } from './strength-sets'
import type { PastSession, PlanContext, SetSuggestion } from './types'

// One rep more in reserve than the target: a first exposure starts a touch light.
const CALIBRATION_EXTRA_RIR = 1

export interface ConversionPlan { sets: SetSuggestion[]; rule: 'calibration' }

function calibratedWeight(e1rm: number, ctx: PlanContext): number {
  const targetRir = 10 - effectiveRpe(ctx)
  const repsToFailure = ctx.repRange.min + targetRir + CALIBRATION_EXTRA_RIR
  return roundDownToStep(calculateWeightFrom1RM(e1rm, repsToFailure), ctx.weightStepKg)
}

function rangeSetsAt(weightKg: number, ctx: PlanContext): SetSuggestion[] {
  const rangeSet = (role: SetSuggestion['role']): SetSuggestion => ({
    weightKg, reps: ctx.repRange.min, repsMax: ctx.repRange.max,
    rpeTarget: effectiveRpe(ctx), role, optional: false,
  })
  const isStrengthCompound = ctx.weekKind === 'strength' && ctx.movement === 'compound'
  if (isStrengthCompound) return withBackoffs(rangeSet('top'), ctx)
  return Array.from({ length: ctx.plannedSets }, () => rangeSet('straight'))
}

/**
 * First exposure to a week type. Exempt from the one-increment cap: a 3-rep
 * weight is legitimately heavier than a 10-rep one. History is newest first.
 */
export function planConversion(
  history: PastSession[], reference: PastSession, ctx: PlanContext, now: Date,
): ConversionPlan {
  const e1rm = conversionE1rm(history)
  if (e1rm !== null) return { sets: rangeSetsAt(calibratedWeight(e1rm, ctx), ctx), rule: 'calibration' }
  if (ctx.weekKind !== 'strength') {
    return { sets: planStraightSets(history, reference, ctx, now).sets, rule: 'calibration' }
  }
  const [firstSet] = reference.sets
  if (!firstSet) throw new Error(`Reference session ${reference.workoutId} has no working sets`)
  const weightKg = roundDownToStep(firstSet.weightKg + progressionIncrement(ctx), ctx.weightStepKg)
  return { sets: rangeSetsAt(weightKg, ctx), rule: 'calibration' }
}
