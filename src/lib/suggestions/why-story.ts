import { formatAddedWeight } from '@/lib/load'
import { trustedRpe } from './effort'
import { formatReferenceSet, formatShortDate, type LoadMode } from './explanation-labels'
import { formatRepsLeft } from './plan-exercise'
import type { EffortSource, ExercisePlan, LoggedSet, PlanExplanation, PlanRule, SetSuggestion, WeekKind } from './types'

// The "Why this weight" sheet tells the plan as a short story — last time, this
// week, today — in words a lifter who has never heard of RPE can follow.

export interface WhyStory {
  lastTime: { heading: string; sets: string; total: string } | null
  thisWeek: { title: string; note: string }
  today: string
  target: { sets: string; total: string | null; effort: string }
  effort: { label: string; value: string }[]
  confidence: { text: string; isConfident: boolean }
  closing: string
}

const WEEK_NAMES: Record<WeekKind, string> = {
  strength: 'Heavy week', hypertrophy: 'Muscle-building week', volume: 'High-rep week',
}

const UP_RULES: PlanRule[] = ['weight-up', 'weight-up-forced', 'reps-only', 'top-set-up']

function weekName(weekKind: WeekKind): string {
  return WEEK_NAMES[weekKind].toLowerCase()
}

function formatLoad(weightKg: number, mode: LoadMode, bodyweightKg: number): string {
  if (mode === 'bodyweight') return 'Bodyweight'
  if (mode === 'weighted') return formatAddedWeight(weightKg, bodyweightKg)
  if (mode === 'assisted') return `${weightKg} kg assistance`
  return `${weightKg} kg`
}

/** Mid-sentence form: "at bodyweight", not "at Bodyweight". */
function formatLoadInline(weightKg: number, mode: LoadMode, bodyweightKg: number): string {
  return mode === 'bodyweight' ? 'bodyweight' : formatLoad(weightKg, mode, bodyweightKg)
}

function totalReps(sets: { reps: number }[]): number {
  return sets.reduce((sum, set) => sum + set.reps, 0)
}

function lastTimeHeading(explanation: PlanExplanation, date: string): string {
  const { isReferenceNewest, referenceWeekKind } = explanation
  if (isReferenceNewest || referenceWeekKind === null) return `Last time · ${date}`
  return `Your last ${weekName(referenceWeekKind)} · ${date}`
}

function buildLastTime(explanation: PlanExplanation, mode: LoadMode, bodyweightKg: number): WhyStory['lastTime'] {
  const { referenceDate, referenceSets } = explanation
  if (referenceDate === null || referenceSets.length === 0) return null
  return {
    heading: lastTimeHeading(explanation, formatShortDate(referenceDate)),
    sets: referenceSets.map(set => formatReferenceSet(set, mode, bodyweightKg)).join(', '),
    total: `${totalReps(referenceSets)} reps in total`,
  }
}

function weekTitle(explanation: PlanExplanation): string {
  if (explanation.isDeloadWeek) return 'Deload week: lighter work so you recover'
  const { min, max } = explanation.repRange
  return `${WEEK_NAMES[explanation.weekKind]}: ${min} to ${max} reps per set`
}

function holdMatchNote(explanation: PlanExplanation): string {
  if (explanation.modifiers.includes('cut')) return 'On a cut, holding your numbers is a win.'
  if (explanation.modifiers.includes('low-readiness')) return 'Low readiness today — match last time, no extra push.'
  return 'Same weight — match last time and make it feel smoother.'
}

function weekNote(explanation: PlanExplanation, mode: LoadMode, bodyweightKg: number): string {
  const [first] = explanation.referenceSets
  const { rule } = explanation
  if (rule === 'deload') return 'Easier work this week so you come back stronger.'
  if (rule === 'calibration') {
    return `Your first ${weekName(explanation.weekKind)} on this lift — we start a touch light to find your level.`
  }
  if (rule === 'hold-match') return holdMatchNote(explanation)
  if (rule === 'hold-add-reps') return 'Same weight as last time — beat it with extra reps.'
  if (rule === 'stall-reset') return 'Same numbers three sessions running — a small step back builds momentum.'
  if (rule === 'top-set-hold') return 'Same top set weight — aim for the reps below.'
  if (!first) return ''
  if (rule === 'come-down') {
    return `${formatLoad(first.weightKg, mode, bodyweightKg)} only got you ${first.reps} reps — too heavy for that.`
  }
  return `You got ${first.reps} reps at ${formatLoadInline(first.weightKg, mode, bodyweightKg)} — you're ready for more.`
}

function formatRepTarget(set: SetSuggestion): string {
  return set.repsMax === null ? `${set.reps}` : `${set.reps}–${set.repsMax}`
}

/** "57.5 kg × 14 · 12 · 12", or "102.5 kg × 4, then 90 kg × 5 · 5" when the weight changes between sets. */
function formatTargetSets(sets: SetSuggestion[], mode: LoadMode, bodyweightKg: number): string {
  const groups: SetSuggestion[][] = []
  for (const set of sets) {
    const group = groups.at(-1)
    if (group && group[0].weightKg === set.weightKg) group.push(set)
    else groups.push([set])
  }
  return groups
    .map(group => `${formatLoad(group[0].weightKg, mode, bodyweightKg)} × ${group.map(formatRepTarget).join(' · ')}`)
    .join(', then ')
}

function formatTargetTotal(explanation: PlanExplanation, sets: SetSuggestion[]): string | null {
  if (sets.some(set => set.repsMax !== null)) return null
  const total = totalReps(sets)
  const [reference] = explanation.referenceSets
  const isSameWeight = !explanation.isDeloadWeek && reference !== undefined && reference.weightKg === sets[0]?.weightKg
  if (!isSameWeight) return `${total} reps in total`
  const gained = total - totalReps(explanation.referenceSets)
  if (gained > 0) return `${total} reps — ${gained} more than last time`
  if (gained === 0) return `${total} reps — same as last time`
  return `${total} reps in total`
}

function buildTarget(plan: ExercisePlan, mode: LoadMode, bodyweightKg: number): WhyStory['target'] {
  const [first] = plan.sets
  const effort = plan.explanation.isDeloadWeek || !first
    ? 'Keep it easy — stop well before it gets hard.'
    : `Stop each set when you could still do ${formatRepsLeft(first.rpeTarget)} more.`
  return {
    sets: formatTargetSets(plan.sets, mode, bodyweightKg),
    total: formatTargetTotal(plan.explanation, plan.sets),
    effort,
  }
}

const GUESSED_EFFORT: Record<EffortSource, string> = {
  entered: 'Worked out from the effort you logged',
  inferred: 'Guessed from how your reps dropped',
  assumed: 'Estimated — rate your last set to sharpen this',
}

function repsLeftWords(rpe: number): string {
  const repsLeft = Math.max(0, Math.floor(10 - rpe))
  if (repsLeft === 0) return 'no reps'
  if (repsLeft >= 3) return '3 or more reps'
  return repsLeft === 1 ? 'about 1 rep' : `about ${repsLeft} reps`
}

function effortValue(set: LoggedSet | undefined, source: EffortSource): string {
  const rpe = set ? trustedRpe(set) : null
  if (set === undefined || rpe === null) return GUESSED_EFFORT[source]
  if (set.rpeSource === 'prompt') return `You said ${repsLeftWords(rpe)} left`
  return `You rated it ${rpe} out of 10`
}

function setsLabel(setNumbers: number[]): string {
  if (setNumbers.length === 1) return `Set ${setNumbers[0]}`
  if (setNumbers.length === 2) return `Sets ${setNumbers[0]} and ${setNumbers[1]}`
  return `Sets ${setNumbers[0]}–${setNumbers[setNumbers.length - 1]}`
}

/** One row per run of sets that share the same explanation. */
function buildEffortRows(explanation: PlanExplanation): WhyStory['effort'] {
  const runs: { setNumbers: number[]; value: string }[] = []
  explanation.effortSources.forEach((source, index) => {
    const value = effortValue(explanation.referenceSets[index], source)
    const run = runs.at(-1)
    if (run && run.value === value) run.setNumbers.push(index + 1)
    else runs.push({ setNumbers: [index + 1], value })
  })
  return runs.map(run => ({ label: setsLabel(run.setNumbers), value: run.value }))
}

const CONFIDENCE: Record<PlanExplanation['confidence'], WhyStory['confidence']> = {
  high: { text: 'Confident', isConfident: true },
  medium: { text: 'Fairly sure', isConfident: false },
  low: { text: 'First estimate — it sharpens after today', isConfident: false },
}

function closingLine(explanation: PlanExplanation): string {
  const { rule, modifiers } = explanation
  if (rule === 'deload') return 'Recover this week, push next week.'
  if (rule === 'calibration') return 'Rate how hard it felt so next time is spot on.'
  if (UP_RULES.includes(rule)) return 'New weight. Own it, then we go again.'
  if (rule === 'hold-match' && modifiers.includes('cut')) return 'Hold the line.'
  return 'Beat it and the weight goes up next time.'
}

export function buildWhyStory(plan: ExercisePlan, mode: LoadMode, bodyweightKg: number): WhyStory {
  const { explanation } = plan
  return {
    lastTime: buildLastTime(explanation, mode, bodyweightKg),
    thisWeek: { title: weekTitle(explanation), note: weekNote(explanation, mode, bodyweightKg) },
    today: explanation.reason,
    target: buildTarget(plan, mode, bodyweightKg),
    effort: buildEffortRows(explanation),
    confidence: CONFIDENCE[explanation.confidence],
    closing: closingLine(explanation),
  }
}

function lastPhrase(explanation: PlanExplanation): string {
  const { isReferenceNewest, referenceWeekKind } = explanation
  if (isReferenceNewest || referenceWeekKind === null) return 'last time'
  return `your last ${weekName(referenceWeekKind)}`
}

const TEASERS: Record<PlanRule, (last: string) => string> = {
  'weight-up': last => `Heavier than ${last}`,
  'weight-up-forced': last => `Heavier than ${last}`,
  'reps-only': last => `Heavier than ${last}`,
  'top-set-up': last => `Heavier top set than ${last}`,
  'come-down': last => `Lighter than ${last}`,
  'hold-add-reps': last => `Same weight, more reps than ${last}`,
  'hold-match': last => `Match ${last}`,
  'stall-reset': () => 'A small step back',
  calibration: () => 'First go at this rep range',
  'top-set-hold': last => `Same top set as ${last}`,
  deload: () => 'Recovery week',
}

// More load lifted means less assistance, so the direction words flip.
const ASSISTED_TEASERS: Partial<Record<PlanRule, (last: string) => string>> = {
  'weight-up': last => `Less assistance than ${last}`,
  'weight-up-forced': last => `Less assistance than ${last}`,
  'reps-only': last => `Less assistance than ${last}`,
  'top-set-up': last => `Less assistance than ${last}`,
  'come-down': () => 'A little more assistance',
  'stall-reset': () => 'A little more assistance',
}

/** A few words for the suggestion chip; the sheet tells the full story. */
export function chipTeaser(explanation: PlanExplanation, mode: LoadMode): string {
  const teaser = (mode === 'assisted' ? ASSISTED_TEASERS[explanation.rule] : undefined) ?? TEASERS[explanation.rule]
  return teaser(lastPhrase(explanation))
}
