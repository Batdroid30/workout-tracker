import { calculate1RM } from '@/lib/algorithms'
import { predictReps, sessionFatigue } from './capacity'
import { trustedRpe } from './effort'
import { withWeekOverrides } from './plan-exercise'
import { clamp, roundDownToStep } from './steps'
import type { ExercisePlan, LoggedSet, PastSession, PlanContext, SetSuggestion } from './types'

const FATIGUE_FALLBACK = 1.0
const BACK_OFF_WEIGHT_RATIO = 0.9
// A set this far under the range minimum means the weight is too heavy today.
const STEP_DOWN_REP_SHORTFALL = 2

interface LiveState {
  e1rm: number
  fatigue: number
  lastCompletedIndex: number
  shouldStepDown: boolean
}

function isLeftAlone(suggestion: SetSuggestion): boolean {
  return suggestion.repsMax !== null
}

function todaySession(completed: LoggedSet[]): PastSession {
  // Week kind and deload flag are irrelevant to fatigue; only the sets are read.
  return { workoutId: 'today', startedAt: '', weekKind: null, isDeload: false, sets: completed }
}

/** Reps in reserve on the last set: the logged RPE if trustworthy, else the planned target. */
function lastSetRir(lastSet: LoggedSet, planned: SetSuggestion): number {
  const rpe = trustedRpe(lastSet) ?? planned.rpeTarget
  return 10 - rpe
}

function buildLiveState(plan: ExercisePlan, completed: LoggedSet[], minReps: number): LiveState {
  const lastCompletedIndex = completed.length - 1
  const lastSet = completed[lastCompletedIndex]
  const rir = lastSetRir(lastSet, plan.sets[lastCompletedIndex])
  const hasMissedRange = completed.some((set, index) =>
    plan.sets[index]?.role === 'straight' && set.reps <= minReps - STEP_DOWN_REP_SHORTFALL)
  return {
    e1rm: calculate1RM(lastSet.weightKg, lastSet.reps + rir),
    fatigue: sessionFatigue([todaySession(completed)], FATIGUE_FALLBACK),
    lastCompletedIndex,
    shouldStepDown: hasMissedRange,
  }
}

function adjustStraightSet(
  planned: SetSuggestion, position: number, state: LiveState, ctx: PlanContext,
): SetSuggestion {
  const { min, max } = ctx.repRange
  const weightKg = state.shouldStepDown
    ? roundDownToStep(planned.weightKg - ctx.weightStepKg, ctx.weightStepKg)
    : planned.weightKg
  const targetRir = 10 - planned.rpeTarget
  const setsAhead = position - state.lastCompletedIndex
  const predicted = predictReps(state.e1rm, weightKg, targetRir, setsAhead, state.fatigue)
  const reps = clamp(predicted, min - 1, Math.min(max, planned.reps + 1))
  return { ...planned, weightKg, reps }
}

function adjustBackOff(planned: SetSuggestion, topSet: LoggedSet, ctx: PlanContext): SetSuggestion {
  return {
    ...planned,
    weightKg: roundDownToStep(topSet.weightKg * BACK_OFF_WEIGHT_RATIO, ctx.weightStepKg),
    reps: Math.min(topSet.reps + 1, ctx.repRange.max),
  }
}

function isUntouchable(plan: ExercisePlan, completed: LoggedSet[], ctx: PlanContext): boolean {
  return completed.length === 0 || completed.length >= plan.sets.length
    || plan.explanation.rule === 'deload' || ctx.isBodyweightOnly
}

/** Re-plans the sets still to do from what today's completed sets showed. Completed positions are returned as planned. */
export function adjustRemainingSets(
  plan: ExercisePlan, completed: LoggedSet[], ctx: PlanContext,
): SetSuggestion[] {
  if (isUntouchable(plan, completed, ctx)) return plan.sets
  const effectiveCtx = withWeekOverrides(ctx)
  const state = buildLiveState(plan, completed, effectiveCtx.repRange.min)
  return plan.sets.map((planned, position) => {
    if (position < completed.length || isLeftAlone(planned)) return planned
    if (planned.role === 'backoff') return adjustBackOff(planned, completed[0], effectiveCtx)
    if (planned.role === 'straight') return adjustStraightSet(planned, position, state, effectiveCtx)
    return planned
  })
}
