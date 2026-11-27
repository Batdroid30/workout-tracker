import { formatAddedWeight } from '@/lib/load'
import type { EffortSource, LoggedSet, PlanExplanation, PlanModifier, WeekKind } from './types'

/** How the lifter's logged weight is read: plain kg, reps only, added to bodyweight, or assistance. */
export type LoadMode = 'load' | 'bodyweight' | 'weighted' | 'assisted'

const WEEK_LABELS: Record<WeekKind, string> = {
  strength: 'Strength', hypertrophy: 'Hypertrophy', volume: 'Volume',
}

const EFFORT_LABELS: Record<EffortSource, string> = {
  entered: 'Entered', inferred: 'From your rep drop-off', assumed: 'Assumed',
}

const CONFIDENCE_LABELS: Record<PlanExplanation['confidence'], string> = {
  high: 'Based on your logged effort',
  medium: 'Based on your reps',
  low: 'First estimate — it will sharpen after this session',
}

const MODIFIER_LABELS: Record<PlanModifier, string> = {
  cut: 'Cut', 'low-readiness': 'Low readiness', 'stall-reset': 'Stall reset',
}

export function effortLabel(source: EffortSource): string {
  return EFFORT_LABELS[source]
}

export function confidenceLabel(confidence: PlanExplanation['confidence']): string {
  return CONFIDENCE_LABELS[confidence]
}

export function modifierLabel(modifier: PlanModifier): string {
  return MODIFIER_LABELS[modifier]
}

const SET_FORMATTERS: Record<LoadMode, (set: LoggedSet, bodyweightKg: number) => string> = {
  load: set => `${set.weightKg}×${set.reps}`,
  bodyweight: set => `BW×${set.reps}`,
  weighted: (set, bodyweightKg) => `${formatAddedWeight(set.weightKg, bodyweightKg)}×${set.reps}`,
  assisted: set => `${set.weightKg} kg assist ×${set.reps}`,
}

export function formatReferenceSet(set: LoggedSet, mode: LoadMode, bodyweightKg: number): string {
  return SET_FORMATTERS[mode](set, bodyweightKg)
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** "Last Hypertrophy week · 19 Nov · 30×10, 30×9, 30×7"; null when there was no reference session. */
export function formatReferenceLine(
  explanation: Pick<PlanExplanation, 'referenceDate' | 'referenceWeekKind' | 'referenceSets'>,
  mode: LoadMode, bodyweightKg: number,
): string | null {
  const { referenceDate, referenceWeekKind, referenceSets } = explanation
  if (!referenceDate) return null
  const lead = referenceWeekKind ? `Last ${WEEK_LABELS[referenceWeekKind]} week` : 'Last session'
  const sets = referenceSets.map(set => formatReferenceSet(set, mode, bodyweightKg)).join(', ')
  return [lead, formatShortDate(referenceDate), sets].filter(part => part !== '').join(' · ')
}
