import { WUP_CYCLE } from '@/lib/workout-intelligence'
import { planConversion } from './conversion'
import { planDeload } from './deload'
import { sessionEfforts } from './effort'
import { isLowReadiness } from './readiness'
import { pickReference, type ReferencePick } from './reference'
import { planStraightSets } from './straight-sets'
import { planStrengthSets } from './strength-sets'
import type {
  ExercisePlan, LoggedSet, PastSession, PlanContext, PlanExplanation, PlanModifier, PlanRule, SetSuggestion, WeekKind,
} from './types'

const STRENGTH_ISOLATION_SCHEME: Pick<PlanContext, 'repRange' | 'rpeTarget'> = {
  repRange: { min: 6, max: 10 }, rpeTarget: 8.5,
}
const LOW_CONFIDENCE_RULES: PlanRule[] = ['calibration', 'reps-only']

interface RoutedPlan { sets: SetSuggestion[]; rule: PlanRule; modifiers: PlanModifier[] }

/** Assisted lifts are explained in assistance kg, where less is progress. */
export type LoadStyle = 'load' | 'assistance'

/** How the reason reads its numbers: the load style, and the range max that held reps are capped at. */
export interface ReasonOptions { style: LoadStyle; rangeMax: number }

function formatLoad(weightKg: number, style: LoadStyle = 'load'): string {
  if (style === 'assistance') return weightKg === 0 ? 'no assistance' : `${weightKg} kg assistance`
  return weightKg === 0 ? 'bodyweight' : `${weightKg} kg`
}

function formatReps(set: SetSuggestion): string {
  return set.repsMax === null ? `${set.reps}` : `${set.reps}–${set.repsMax}`
}

function formatRepList(plan: SetSuggestion[]): string {
  return plan.map(formatReps).join(', ')
}

function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/** "1–2" for RPE 8.5, "about 3" for RPE 7: half-point targets span two whole RIR values. */
export function formatRepsLeft(rpeTarget: number): string {
  const repsInReserve = 10 - rpeTarget
  const fewest = Math.floor(repsInReserve)
  const most = Math.ceil(repsInReserve)
  return fewest === most ? `about ${fewest}` : `${fewest}–${most}`
}

interface RepChange { setNumber: number; from: number; to: number }

function isSameWeightAsReference(set: SetSuggestion, referenceSet: LoggedSet | undefined): referenceSet is LoggedSet {
  return referenceSet !== undefined && referenceSet.weightKg === set.weightKg
}

/** Rep changes at the reference's own weight; sets whose weight moved are described by weightMoves. */
function repChanges(plan: SetSuggestion[], referenceSets: LoggedSet[]): RepChange[] {
  return plan.flatMap((set, index): RepChange[] => {
    const referenceSet = referenceSets[index]
    if (!isSameWeightAsReference(set, referenceSet) || referenceSet.reps === set.reps) return []
    return [{ setNumber: index + 1, from: referenceSet.reps, to: set.reps }]
  })
}

function sameWeightSetCount(plan: SetSuggestion[], referenceSets: LoggedSet[]): number {
  return plan.filter((set, index) => isSameWeightAsReference(set, referenceSets[index])).length
}

interface WeightMove { setNumbers: number[]; reps: number[]; weightKg: number; isUp: boolean }

/** Sets planned at a different weight than the reference used there, grouped by direction and weight. */
function weightMoves(plan: SetSuggestion[], referenceSets: LoggedSet[]): WeightMove[] {
  const moves: WeightMove[] = []
  plan.forEach((set, index) => {
    const referenceSet = referenceSets[index]
    if (!referenceSet || referenceSet.weightKg === set.weightKg) return
    const isUp = set.weightKg > referenceSet.weightKg
    const group = moves.find(move => move.isUp === isUp && move.weightKg === set.weightKg)
    if (group) { group.setNumbers.push(index + 1); group.reps.push(set.reps); return }
    moves.push({ setNumbers: [index + 1], reps: [set.reps], weightKg: set.weightKg, isUp })
  })
  return moves
}

const MOVE_VERBS = {
  up: { one: 'moves up to', many: 'move up to' },
  down: { one: 'drops to', many: 'drop to' },
} as const

function describeWeightMove(move: WeightMove, style: LoadStyle): string {
  const isOneSet = move.setNumbers.length === 1
  const sets = isOneSet ? `set ${move.setNumbers[0]}` : `sets ${joinWithAnd(move.setNumbers.map(String))}`
  const verb = MOVE_VERBS[move.isUp ? 'up' : 'down'][isOneSet ? 'one' : 'many']
  return `${sets} ${verb} ${formatLoad(move.weightKg, style)} (${move.reps.join(', ')} reps)`
}

function describeAddedReps(added: RepChange[], comparedSets: number): string {
  const isOneRepEverySet = added.length === comparedSets && added.every(change => change.to - change.from === 1)
  if (isOneRepEverySet && comparedSets > 1) return 'add a rep to every set'
  const isSingleRep = added.length === 1 && added[0].to - added[0].from === 1
  const sets = joinWithAnd(added.map(change => `set ${change.setNumber} (${change.from} → ${change.to})`))
  return isSingleRep ? `add a rep on ${sets}` : `add reps on ${sets}`
}

/** Held weight: names each rep change against the reference, so the copy always matches the numbers. */
function isCappedAtRangeMax(change: RepChange, rangeMax: number): boolean {
  return change.from > rangeMax && change.to === rangeMax
}

/** Held reps fall below the reference when it was above the range max, or when today's sets felt harder. */
function describeRepDrops(changes: RepChange[], rangeMax: number): string[] {
  const dropped = changes.filter(change => change.to < change.from)
  const capped = dropped.filter(change => isCappedAtRangeMax(change, rangeMax))
  const eased = dropped.filter(change => !isCappedAtRangeMax(change, rangeMax))
  const parts: string[] = []
  if (capped.length > 0) parts.push(`capped at the top of the range (${capped[0].to})`)
  if (eased.length > 0) {
    parts.push(`fewer reps on ${joinWithAnd(eased.map(change => `set ${change.setNumber} (${change.from} → ${change.to})`))}`)
  }
  return parts
}

function describeHold(
  first: SetSuggestion, plan: SetSuggestion[], referenceSets: LoggedSet[], { style, rangeMax }: ReasonOptions,
): string {
  const changes = repChanges(plan, referenceSets)
  const added = changes.filter(change => change.to > change.from)
  const parts: string[] = []
  if (added.length > 0) parts.push(describeAddedReps(added, sameWeightSetCount(plan, referenceSets)))
  parts.push(...describeRepDrops(changes, rangeMax))
  const moves = weightMoves(plan, referenceSets)
  if (parts.length === 0 && moves.length === 0) parts.push(`match last time (${formatRepList(plan)})`)
  parts.push(...moves.map(move => describeWeightMove(move, style)))
  const lead = first.weightKg === 0 ? 'Bodyweight' : `Same ${formatLoad(first.weightKg, style)}`
  return `${lead} — ${parts.join('; ')}.`
}

function optionalNote(plan: SetSuggestion[]): string {
  const optionalCount = plan.filter(set => set.optional).length
  if (optionalCount === 0) return ''
  return optionalCount === 1 ? ' The last set is optional.' : ` The last ${optionalCount} sets are optional.`
}

/** Callers pass plan and reference sets in the same weight space, so the kept-weight check is like for like. */
function describeDeload(
  first: SetSuggestion, plan: SetSuggestion[], referenceSets: LoggedSet[], { style }: ReasonOptions,
): string {
  const isWeightKept = first.weightKg === referenceSets[0]?.weightKg
  const isAnySetOptional = plan.some(set => set.optional)
  if (isWeightKept && isAnySetOptional) return `Deload week — same weight, fewer sets.${optionalNote(plan)}`
  if (isWeightKept) return 'Deload week — same weight, easy effort.'
  return `Deload week — ease off to ${formatLoad(first.weightKg, style)} for ${formatRepList(plan)} reps.${optionalNote(plan)}`
}

type ReasonBuilder = (
  first: SetSuggestion, plan: SetSuggestion[], referenceSets: LoggedSet[], options: ReasonOptions,
) => string

const REASONS: Record<PlanRule, ReasonBuilder> = {
  'weight-up': (first, plan) =>
    `You hit the top of the range — move up to ${formatLoad(first.weightKg)} for ${formatRepList(plan)} reps.`,
  'weight-up-forced': (first, plan) =>
    `Top of the range two sessions running — move up to ${formatLoad(first.weightKg)} for ${formatRepList(plan)} reps.`,
  'hold-add-reps': describeHold,
  'hold-match': describeHold,
  'come-down': (first, plan) =>
    `Last time was too heavy to reach this rep range — drop to ${formatLoad(first.weightKg)} for ${formatRepList(plan)} reps.`,
  'stall-reset': (first, plan) =>
    `Stalled for three sessions — reset to ${formatLoad(first.weightKg)} for ${formatRepList(plan)} reps and build back up.`,
  'reps-only': (first, plan) =>
    `Top of the range last time — move up to ${formatLoad(first.weightKg)} and aim for ${formatRepList(plan)} reps.`,
  calibration: (first, _plan, _reference, { style }) =>
    `First week in this rep range for this lift — start at ${formatLoad(first.weightKg, style)} × ${formatReps(first)} and stop with ${formatRepsLeft(first.rpeTarget)} reps left.`,
  'top-set-up': first => `Top set moves up to ${formatLoad(first.weightKg)} × ${first.reps}.`,
  'top-set-hold': (first, _plan, _reference, { style }) => `Hold the top set at ${formatLoad(first.weightKg, style)} and aim for ${first.reps} reps.`,
  deload: describeDeload,
}

// Rules that change the load read backwards in assistance: more load lifted means less assistance.
const ASSISTED_REASONS: Partial<Record<PlanRule, ReasonBuilder>> = {
  'weight-up': (first, plan) =>
    `You hit the top of the range — drop assistance to ${first.weightKg} kg for ${formatRepList(plan)} reps.`,
  'weight-up-forced': (first, plan) =>
    `Top of the range two sessions running — drop assistance to ${first.weightKg} kg for ${formatRepList(plan)} reps.`,
  'come-down': (first, plan) =>
    `Last time was too hard to reach this rep range — add a little assistance (${first.weightKg} kg) for ${formatRepList(plan)} reps.`,
  'stall-reset': (first, plan) =>
    `Stalled for three sessions — add a little assistance (${first.weightKg} kg) for ${formatRepList(plan)} reps and build back up.`,
  'reps-only': (first, plan) =>
    `Top of the range last time — drop assistance to ${first.weightKg} kg and aim for ${formatRepList(plan)} reps.`,
  'top-set-up': first => `Top set: drop assistance to ${first.weightKg} kg × ${first.reps}.`,
}

function reasonBuilderFor(rule: PlanRule, style: LoadStyle): ReasonBuilder {
  return (style === 'assistance' ? ASSISTED_REASONS[rule] : undefined) ?? REASONS[rule]
}

const MODIFIER_NOTES: Record<PlanModifier, string> = {
  cut: ' On a cut, matching last time is a win.',
  'low-readiness': ' Low readiness today — no progression, aim a touch easier.',
  // The stall-reset rule's own sentence already says why the weight dropped.
  'stall-reset': '',
}

function modifierNote(rule: PlanRule, modifier: PlanModifier): string {
  // A deload's RPE is fixed at 7, so readiness changes nothing there.
  if (rule === 'deload' && modifier === 'low-readiness') return ''
  return MODIFIER_NOTES[modifier]
}

const DEFAULT_REASON_OPTIONS: ReasonOptions = { style: 'load', rangeMax: Infinity }

export function buildReason(
  rule: PlanRule, modifiers: PlanModifier[], plan: SetSuggestion[], referenceSets: LoggedSet[],
  options: Partial<ReasonOptions> = {},
): string {
  const [first] = plan
  if (!first) return 'No working sets planned.'
  const resolved: ReasonOptions = { ...DEFAULT_REASON_OPTIONS, ...options }
  const notes = modifiers.map(modifier => modifierNote(rule, modifier)).join('')
  return `${reasonBuilderFor(rule, resolved.style)(first, plan, referenceSets, resolved)}${notes}`
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

export function withWeekOverrides(ctx: PlanContext): PlanContext {
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
  const [setOneEffort] = sessionEfforts(pick.session.sets)
  return setOneEffort?.source === 'entered' ? 'high' : 'medium'
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
      referenceWeekKind: pick.session.weekKind,
      referenceSets: pick.session.sets,
      effortSources: sessionEfforts(pick.session.sets).map(effort => effort.source),
      modifiers,
      confidence: confidenceFor(routed.rule, pick),
      reason: buildReason(routed.rule, modifiers, routed.sets, pick.session.sets, { rangeMax: plannedCtx.repRange.max }),
      weekKind: plannedCtx.weekKind,
      repRange: plannedCtx.repRange,
      isDeloadWeek: plannedCtx.isDeloadWeek,
      isReferenceNewest: pick.session.startedAt === history[0]?.startedAt,
    },
  }
}
