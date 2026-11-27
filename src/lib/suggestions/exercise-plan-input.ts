import { suggestNextSet } from '@/lib/algorithms'
import { assistanceFor, isAssisted, isWeightedBodyweight } from '@/lib/load'
import type { TrainingCycle } from '@/lib/training-cycle'
import type {
  ActiveExercise, ActiveSet, Exercise, ExperienceLevel, TrainingGoal, TrainingPhase,
} from '@/types/database'
import { sessionEfforts } from './effort'
import { hitRate, type HitRate } from './hit-rate'
import { adjustRemainingSets } from './live'
import { noCycleContext, planExercise } from './plan-exercise'
import { defaultWeightStep, toEquipmentKind } from './steps'
import type { ExercisePlan, LoggedSet, PastSession, PlanContext, SetSuggestion } from './types'

/** How an exercise's stored weight_kg maps to load lifted. */
type LoadKind = 'assisted' | 'bodyweight-only' | 'load'

export interface SuggestionProfile {
  training_goal: TrainingGoal | null
  experience_level: ExperienceLevel | null
  training_phase: TrainingPhase | null
}

export interface ExercisePlanData {
  plan: ExercisePlan | null
  previous: PastSession | null
  hitRate: HitRate | null
}

export interface ExercisePlanResult extends ExercisePlanData {
  isLoading: boolean
  error: Error | null
}

interface PlanContextArgs {
  exercise: ActiveExercise
  cycle: TrainingCycle | null
  profile: SuggestionProfile
  weightStep: number | null
  readinessAverage: number | null
}

interface ResolvePlanArgs {
  history: PastSession[]
  ctx: PlanContext
  exercise: ActiveExercise
  todayBodyweightKg: number
  now: Date
}

function loadKindFor(exercise: Exercise): LoadKind {
  if (isAssisted(exercise.name)) return 'assisted'
  const isBodyweight = exercise.equipment?.toLowerCase() === 'bodyweight'
  if (isBodyweight && !isWeightedBodyweight(exercise.name, exercise.equipment)) return 'bodyweight-only'
  return 'load'
}

export function historyOptions(exercise: Exercise): { isAssisted: boolean; isBodyweightOnly: boolean } {
  const kind = loadKindFor(exercise)
  return { isAssisted: kind === 'assisted', isBodyweightOnly: kind === 'bodyweight-only' }
}

function workingSets(exercise: ActiveExercise): ActiveSet[] {
  return exercise.sets.filter(set => !set.is_warmup)
}

function weekScheme(cycle: TrainingCycle | null, goal: TrainingGoal | null) {
  if (!cycle) return noCycleContext(goal)
  const { kind, repRange, rpeTarget } = cycle.scheme
  return { weekKind: kind, repRange: { ...repRange }, rpeTarget }
}

export function buildPlanContext(
  { exercise, cycle, profile, weightStep, readinessAverage }: PlanContextArgs,
): PlanContext {
  const equipment = toEquipmentKind(exercise.exercise.equipment)
  return {
    ...weekScheme(cycle, profile.training_goal),
    isDeloadWeek: cycle?.isDeloadWeek ?? false,
    phase: profile.training_phase,
    experience: profile.experience_level,
    movement: exercise.exercise.movement_pattern === 'isolation' ? 'isolation' : 'compound',
    equipment,
    weightStepKg: weightStep ?? defaultWeightStep(equipment),
    isBodyweightOnly: historyOptions(exercise.exercise).isBodyweightOnly,
    plannedSets: Math.max(workingSets(exercise).length, 1),
    readinessAverage,
  }
}

// Holding assistance constant across a bodyweight change means the load moves with bodyweight,
// so past assisted loads are restated at today's bodyweight before planning.
function rebaseToToday(history: PastSession[], todayBodyweightKg: number): PastSession[] {
  return history.map(session => {
    const shift = todayBodyweightKg - session.bodyweightKg
    const sets = session.sets.map(set => ({ ...set, weightKg: Math.max(0, set.weightKg + shift) }))
    return { ...session, sets }
  })
}

function toLoadKg(weightKg: number, kind: LoadKind, bodyweightKg: number): number {
  if (kind === 'assisted') return Math.max(0, bodyweightKg - weightKg)
  return kind === 'bodyweight-only' ? 0 : weightKg
}

function fromLoadKg(loadKg: number, kind: LoadKind, bodyweightKg: number): number {
  return kind === 'assisted' ? assistanceFor(loadKg, bodyweightKg) : loadKg
}

function completedLoggedSets(exercise: ActiveExercise, kind: LoadKind, bodyweightKg: number): LoggedSet[] {
  return workingSets(exercise)
    .filter(set => set.completed)
    .map(set => ({
      weightKg: toLoadKg(set.weight_kg, kind, bodyweightKg),
      reps: set.reps,
      rpe: set.rpe,
      rpeSource: set.rpe_source ?? null,
      suggestedWeightKg: set.suggested_weight_kg ?? null,
      suggestedReps: set.suggested_reps ?? null,
    }))
}

function isRepSum(exercise: ActiveExercise): boolean {
  return exercise.progression_model === 'rep_sum' && exercise.rep_sum_target != null
}

function planRepSum(history: PastSession[], ctx: PlanContext, repSumTarget: number): ExercisePlan | null {
  // Spec 6.12: a deload session's reduced work would wrongly reset the rep bank.
  const reference = history.find(session => !session.isDeload)
  const lastSet = reference?.sets.at(-1)
  if (!reference || !lastSet) return null
  const prevTotalReps = reference.sets.reduce((sum, set) => sum + set.reps, 0)
  const suggestions = Array.from({ length: ctx.plannedSets }, (_, position) => {
    const last = reference.sets[position] ?? lastSet
    return suggestNextSet({
      lastWeight: last.weightKg, lastReps: last.reps, exerciseType: ctx.movement,
      experienceLevel: ctx.experience, dupRpeTarget: ctx.rpeTarget,
      progressionModel: 'rep_sum', repSumTarget, prevTotalReps,
    })
  })
  return {
    sets: suggestions.map((suggestion): SetSuggestion => ({
      weightKg: suggestion.weight_kg, reps: suggestion.target_reps, repsMax: null,
      rpeTarget: suggestion.rpe_target, role: 'straight', optional: false,
    })),
    explanation: {
      rule: prevTotalReps >= repSumTarget ? 'weight-up' : 'hold-match',
      referenceDate: reference.startedAt,
      referenceSets: reference.sets,
      effortSources: sessionEfforts(reference.sets).map(effort => effort.source),
      modifiers: [],
      confidence: 'medium',
      reason: suggestions[0].reason,
    },
  }
}

interface LoadSpaceArgs {
  history: PastSession[]
  ctx: PlanContext
  exercise: ActiveExercise
  completed: LoggedSet[]
  now: Date
}

function planInLoadSpace({ history, ctx, exercise, completed, now }: LoadSpaceArgs): ExercisePlan | null {
  // A deload week still deloads rep_sum exercises, as the old suggestion engine did.
  if (isRepSum(exercise) && !ctx.isDeloadWeek) {
    return planRepSum(history, ctx, exercise.rep_sum_target ?? 0)
  }
  const plan = planExercise(history, ctx, now)
  if (!plan) return null
  return { ...plan, sets: adjustRemainingSets(plan, completed, ctx) }
}

/** The plan for today in storage space (assistance for assisted lifts), adjusted for completed sets. */
export function resolveExercisePlan(
  { history, ctx, exercise, todayBodyweightKg, now }: ResolvePlanArgs,
): ExercisePlan | null {
  const kind = loadKindFor(exercise.exercise)
  const plannedHistory = kind === 'assisted' ? rebaseToToday(history, todayBodyweightKg) : history
  const completed = completedLoggedSets(exercise, kind, todayBodyweightKg)
  const plan = planInLoadSpace({ history: plannedHistory, ctx, exercise, completed, now })
  if (!plan) return null
  const sets = plan.sets.map(set => ({ ...set, weightKg: fromLoadKg(set.weightKg, kind, todayBodyweightKg) }))
  return { ...plan, sets }
}

/** Newest session back in storage space with its own bodyweight, so it reads as it was logged. */
export function toPreviousSession(history: PastSession[], exercise: Exercise): PastSession | null {
  const [newest] = history
  if (!newest) return null
  const kind = loadKindFor(exercise)
  const sets = newest.sets.map(set => ({ ...set, weightKg: fromLoadKg(set.weightKg, kind, newest.bodyweightKg) }))
  return { ...newest, sets }
}

function toError(error: unknown): Error | null {
  if (error === null || error === undefined) return null
  return error instanceof Error ? error : new Error(String(error))
}

export function toHookResult(data: ExercisePlanData | null, error: unknown, isLoading: boolean): ExercisePlanResult {
  const failure = toError(error)
  if (failure || !data) return { plan: null, previous: null, hitRate: null, isLoading, error: failure }
  const hasSuggestedSets = data.hitRate !== null && data.hitRate.total > 0
  return { ...data, hitRate: hasSuggestedSets ? data.hitRate : null, isLoading, error: null }
}

export function buildPlanData(args: ResolvePlanArgs): ExercisePlanData {
  return {
    plan: resolveExercisePlan(args),
    previous: toPreviousSession(args.history, args.exercise.exercise),
    hitRate: hitRate(args.history),
  }
}
