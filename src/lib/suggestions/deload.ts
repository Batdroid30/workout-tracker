import { roundDownToStep } from './steps'
import type { PastSession, PlanContext, SetSuggestion } from './types'

const DELOAD_LOAD_RATIO = 0.87
const DELOAD_RPE_TARGET = 7
// Above this, one step down is too big a cut for a light load; only sets are cut.
const MAX_STEP_SHARE_OF_WEIGHT = 0.25

export interface DeloadPlan { sets: SetSuggestion[]; rule: 'deload' }

function deloadWeight(referenceKg: number, step: number): number {
  if (step > MAX_STEP_SHARE_OF_WEIGHT * referenceKg) return referenceKg
  const reduced = roundDownToStep(referenceKg * DELOAD_LOAD_RATIO, step)
  return Math.min(reduced, roundDownToStep(referenceKg - step, step))
}

/** Same reps as the reference at a lighter load; the back half of the sets is optional. */
export function planDeload(reference: PastSession, ctx: PlanContext): DeloadPlan {
  const lastSet = reference.sets[reference.sets.length - 1]
  if (!lastSet) throw new Error(`Reference session ${reference.workoutId} has no working sets`)
  const firstOptionalIndex = Math.ceil(ctx.plannedSets / 2)
  const sets = Array.from({ length: ctx.plannedSets }, (_, index): SetSuggestion => {
    const referenceSet = reference.sets[index] ?? lastSet
    return {
      weightKg: deloadWeight(referenceSet.weightKg, ctx.weightStepKg),
      reps: referenceSet.reps, repsMax: null,
      rpeTarget: DELOAD_RPE_TARGET, role: 'straight', optional: index >= firstOptionalIndex,
    }
  })
  return { sets, rule: 'deload' }
}
