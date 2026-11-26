import { WUP_CYCLE } from '@/lib/workout-intelligence'
import { planConversion } from './conversion'
import { planDeload } from './deload'
import { sessionEfforts, trustedRpe } from './effort'
import { isLowReadiness } from './readiness'
import { pickReference, type ReferencePick } from './reference'
import { planStraightSets } from './straight-sets'
import { planStrengthSets } from './strength-sets'
import type {
  ExercisePlan, PastSession, PlanContext, PlanExplanation, PlanModifier, PlanRule, SetSuggestion, WeekKind,
} from './types'

const STRENGTH_ISOLATION_SCHEME: Pick<PlanContext, 'repRange' | 'rpeTarget'> = {
  repRange: { min: 6, max: 10 }, rpeTarget: 8.5,
}
const LOW_CONFIDENCE_RULES: PlanRule[] = ['calibration', 'reps-only']

interface RoutedPlan { sets: SetSuggestion[]; rule: PlanRule; modifiers: PlanModifier[] }

function formatLoad(weightKg: number): string {
  return weightKg === 0 ? 'bodyweight' : `${weightKg} kg`
}

function formatReps(set: SetSuggestion): string {
  return set.repsMax === null ? `${set.reps}` : `${set.reps}–${set.repsMax}`
}

function formatRepList(plan: SetSuggestion[]): string {
  return plan.map(formatReps).join(', ')
}

function optionalNote(plan: SetSuggestion[]): string {
  const optionalCount = plan.filter(set => set.optional).length
  if (optionalCount === 0) return ''
  return optionalCount === 1 ? ' The last set is optional.' : ` The last ${optionalCount} sets are optional.`
}

type ReasonBuilder = (first: SetSuggestion, plan: SetSuggestion[]) => string

const REASONS: Record<PlanRule, ReasonBuilder> = {
  'weight-up': (first, plan) =>
    `You hit the top of the range — move up to ${formatLoad(first.weightKg)} for ${formatRepList(plan)} reps.`,
  'weight-up-forced': (first, plan) =>
    `Top of the range two sessions running — move up to ${formatLoad(first.weightKg)} for ${formatRepList(plan)} reps.`,
  'hold-add-reps': (first, plan) =>
    `Stay at ${formatLoad(first.weightKg)} and beat last time: ${formatRepList(plan)} reps.`,
  'hold-match': (first, plan) =>
    `Stay at ${formatLoad(first.weightKg)} and match last time: ${formatRepList(plan)} reps.`,
  'come-down': (first, plan) =>
    `Last time was a grind below the range — drop to ${formatLoad(first.weightKg)} for ${formatRepList(plan)} reps.`,
  'stall-reset': (first, plan) =>
    `Stalled for three sessions — reset to ${formatLoad(first.weightKg)} for ${formatRepList(plan)} reps and build back up.`,
  'reps-only': (first, plan) =>
    `Top of the range last time — move up to ${formatLoad(first.weightKg)} and aim for ${formatRepList(plan)} reps.`,
  calibration: first =>
    `First week in this rep range for this lift — start at ${formatLoad(first.weightKg)} × ${formatReps(first)} and stop with 1–2 reps left.`,
  'top-set-up': first => `Top set moves up to ${formatLoad(first.weightKg)} × ${first.reps}.`,
  'top-set-hold': first => `Hold the top set at ${formatLoad(first.weightKg)} and aim for ${first.reps} reps.`,
  deload: (first, plan) =>
    `Deload week — ease off to ${formatLoad(first.weightKg)} for ${formatRepList(plan)} reps.${optionalNote(plan)}`,
}

const MODIFIER_NOTES: Record<PlanModifier, string> = {
  cut: ' On a cut, matching last time is a win.',
  'low-readiness': ' Low readiness today — keep one more rep in reserve.',
  // The stall-reset rule's own sentence already says why the weight dropped.
  'stall-reset': '',
}

export function buildReason(rule: PlanRule, modifiers: PlanModifier[], plan: SetSuggestion[]): string {
  const [first] = plan
  if (!first) return 'No working sets planned.'
  const notes = modifiers.map(modifier => MODIFIER_NOTES[modifier]).join('')
  return `${REASONS[rule](first, plan)}${notes}`
}

/** Used when the training cycle can't be loaded (spec 6.13). */
export function noCycleContext(
  goal: 'strength' | 'muscle' | 'both' | null,
): Pick<PlanContext, 'weekKind' | 'repRange' | 'rpeTarget'> {
  const weekKind: WeekKind = goal === 'strength' ? 'strength' : 'hypertrophy'
  const scheme = WUP_CYCLE.find(candidate => candidate.kind === weekKind)
  if (!scheme) throw new Error(`No week scheme for ${weekKind}`)
  return { weekKind, repRange: { ...scheme.repRange }, rpeTarget: scheme.rpeTarget }
}

function withWeekOverrides(ctx: PlanContext): PlanContext {
  const isStrengthIsolation = ctx.weekKind === 'strength' && ctx.movement === 'isolation'
  return isStrengthIsolation ? { ...ctx, ...STRENGTH_ISOLATION_SCHEME } : ctx
}

/** Bodyweight rows mix 0 and the lifter's bodyweight, so logged weight is ignored. */
function withoutWeight(session: PastSession): PastSession {
  return { ...session, sets: session.sets.map(set => ({ ...set, weightKg: 0 })) }
}

function routePlan(history: PastSession[], pick: ReferencePick, ctx: PlanContext, now: Date): RoutedPlan {
  const reference = pick.session
  if (ctx.isDeloadWeek) return { ...planDeload(reference, ctx), modifiers: [] }
  // The strength and calibration planners assume a load; bodyweight progresses by reps only.
  if (ctx.isBodyweightOnly) return planStraightSets(history, reference, ctx, now)
  if (!pick.sameType) return { ...planConversion(history, reference, ctx, now), modifiers: [] }
  if (ctx.weekKind === 'strength' && ctx.movement === 'compound') {
    return { ...planStrengthSets(history, reference, ctx), modifiers: [] }
  }
  return planStraightSets(history, reference, ctx, now)
}

function withReadinessModifier(modifiers: PlanModifier[], ctx: PlanContext): PlanModifier[] {
  const isMissing = isLowReadiness(ctx.readinessAverage) && !modifiers.includes('low-readiness')
  return isMissing ? [...modifiers, 'low-readiness'] : modifiers
}

function confidenceFor(rule: PlanRule, pick: ReferencePick): PlanExplanation['confidence'] {
  if (rule === 'deload') return 'medium'
  if (LOW_CONFIDENCE_RULES.includes(rule) || !pick.sameType) return 'low'
  return pick.session.sets.some(set => trustedRpe(set) !== null) ? 'high' : 'medium'
}

/** History is newest first. Null when there is no non-deload session to plan from. */
export function planExercise(history: PastSession[], ctx: PlanContext, now: Date): ExercisePlan | null {
  const plannedCtx = withWeekOverrides(ctx)
  const plannedHistory = ctx.isBodyweightOnly ? history.map(withoutWeight) : history
  const pick = pickReference(plannedHistory, plannedCtx.weekKind, now)
  if (!pick) return null
  const routed = routePlan(plannedHistory, pick, plannedCtx, now)
  const modifiers = withReadinessModifier(routed.modifiers, plannedCtx)
  return {
    sets: routed.sets,
    explanation: {
      rule: routed.rule,
      referenceDate: pick.session.startedAt,
      referenceSets: pick.session.sets,
      effortSources: sessionEfforts(pick.session.sets).map(effort => effort.source),
      modifiers,
      confidence: confidenceFor(routed.rule, pick),
      reason: buildReason(routed.rule, modifiers, routed.sets),
    },
  }
}
