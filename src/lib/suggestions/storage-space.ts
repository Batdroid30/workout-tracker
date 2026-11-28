import { assistanceFor } from '@/lib/load'
import type { LoggedSet, SetSuggestion } from './types'

/** How an exercise's stored weight_kg maps to load lifted. */
export type LoadKind = 'assisted' | 'weighted' | 'bodyweight-only' | 'load'

export interface StorageArgs {
  kind: LoadKind
  todayBodyweightKg: number
  stepKg: number
  /** The plan's reference sets in load space, restated at today's bodyweight. */
  referenceSets: LoggedSet[]
}

// Absorbs floating-point error when comparing loads restated at today's bodyweight.
const LOAD_EPSILON = 1e-9

/** Nearest step multiple, allowing zero: no assistance, or nothing added. */
function roundToGrid(kg: number, step: number): number {
  return Math.max(0, Math.round(kg / step) * step)
}

function roundToHundredth(kg: number): number {
  return Math.round(kg * 100) / 100
}

/** Weighted lifts store bodyweight + added; the added weight is what goes on the belt, so it sits on the grid. */
function weightedTotal(loadKg: number, { todayBodyweightKg, stepKg }: StorageArgs): number {
  return roundToHundredth(todayBodyweightKg + roundToGrid(loadKg - todayBodyweightKg, stepKg))
}

function referenceLoadAt(referenceSets: LoggedSet[], index: number): number | null {
  return (referenceSets[index] ?? referenceSets.at(-1))?.weightKg ?? null
}

/** Assistance moves opposite to load: more load than last time always means less assistance, and the reverse. */
function directedAssistance(loadKg: number, index: number, args: StorageArgs): number {
  const { todayBodyweightKg, stepKg } = args
  const assistance = roundToGrid(todayBodyweightKg - loadKg, stepKg)
  const referenceLoad = referenceLoadAt(args.referenceSets, index)
  if (referenceLoad === null) return assistance
  const referenceAssistance = assistanceFor(referenceLoad, todayBodyweightKg)
  if (loadKg > referenceLoad + LOAD_EPSILON) {
    return assistance < referenceAssistance ? assistance : Math.max(0, referenceAssistance - stepKg)
  }
  if (loadKg < referenceLoad - LOAD_EPSILON) {
    return assistance > referenceAssistance ? assistance : referenceAssistance + stepKg
  }
  return referenceAssistance
}

/** A back-off is lighter than its top set, so it never gets less assistance. */
function withBackoffAssistance(sets: SetSuggestion[]): SetSuggestion[] {
  const [top] = sets
  if (!top || top.role !== 'top') return sets
  return sets.map(set => (set.role === 'backoff' ? { ...set, weightKg: Math.max(set.weightKg, top.weightKg) } : set))
}

/** Planned sets from load space back to what the lifter enters: assistance, bodyweight + added, or plain kg. */
export function toStorageSets(sets: SetSuggestion[], args: StorageArgs): SetSuggestion[] {
  if (args.kind === 'weighted') return sets.map(set => ({ ...set, weightKg: weightedTotal(set.weightKg, args) }))
  if (args.kind !== 'assisted') return sets
  const assisted = sets.map((set, index) => ({ ...set, weightKg: directedAssistance(set.weightKg, index, args) }))
  return withBackoffAssistance(assisted)
}
