/**
 * How a logged set's weight_kg translates into load lifted, per exercise kind.
 *
 * weight_kg keeps its existing meaning everywhere:
 *   normal   → weight on the bar/machine
 *   weighted → bodyweight + added weight (bodyweight exercises named "Weighted")
 *   assisted → assistance from the machine/band (exercises named "Assisted")
 */

import { calculate1RM } from '@/lib/algorithms'
import type { PRType } from '@/types/database'

export const FALLBACK_BODYWEIGHT_KG = 75

export function isAssisted(exerciseName: string): boolean {
  return /assisted/i.test(exerciseName)
}

/** Bodyweight exercises with added load (belt, vest). Matches SetLogger's detection. */
export function isWeightedBodyweight(exerciseName: string, equipment: string | null | undefined): boolean {
  return equipment?.toLowerCase() === 'bodyweight' && /weighted/i.test(exerciseName)
}

/** Bodyweight a stored workout was logged against; older rows without one use the fallback. */
export function workoutBodyweight(stored: number | string | null | undefined): number {
  return stored != null ? Number(stored) : FALLBACK_BODYWEIGHT_KG
}

/** Kilograms actually moved. Assisted sets lift bodyweight minus assistance, never below zero. */
export function effectiveLoad(weightKg: number, exerciseName: string, bodyweightKg: number): number {
  if (isAssisted(exerciseName)) return Math.max(0, bodyweightKg - weightKg)
  return weightKg
}

/** Inverse of effectiveLoad for assisted lifts: the assistance that leaves `loadKg` to lift, to the nearest 0.5 kg. */
export function assistanceFor(loadKg: number, bodyweightKg: number): number {
  return Math.max(0, Math.round((bodyweightKg - loadKg) * 2) / 2)
}

export function setVolume(weightKg: number, reps: number, exerciseName: string, bodyweightKg: number): number {
  return effectiveLoad(weightKg, exerciseName, bodyweightKg) * reps
}

/** Whole kilograms below 1000, one decimal with a "k" suffix above. */
export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`
  return String(Math.round(kg))
}

export interface PRCandidate {
  type:  PRType
  value: number
}

/** Values a set competes on. Assisted lifts only track least assistance — 1RM and volume of assistance are meaningless. */
export function prCandidates(weightKg: number, reps: number, exerciseName: string): PRCandidate[] {
  if (isAssisted(exerciseName)) return [{ type: 'best_weight', value: weightKg }]
  return [
    { type: 'best_weight', value: weightKg },
    { type: 'best_volume', value: weightKg * reps },
    { type: 'best_1rm',    value: calculate1RM(weightKg, reps) },
  ]
}

/** Less assistance is better for assisted lifts; everything else, more is better. */
export function beatsPR(value: number, current: number | undefined, prType: PRType, exerciseName: string): boolean {
  if (isAssisted(exerciseName) && prType === 'best_weight') return current === undefined || value < current
  return value > (current ?? 0)
}

const roundTenth = (kg: number) => Math.round(kg * 10) / 10

/** Added load on top of bodyweight for a weighted set: "+20kg", or "BW" when nothing was added. */
export function formatAddedWeight(totalKg: number, bodyweightKg: number): string {
  const added = roundTenth(totalKg - bodyweightKg)
  if (Math.abs(added) < 0.1) return 'BW'
  return `${added > 0 ? '+' : ''}${added}kg`
}

/** Added load and total moved for a weighted set: "+20kg · 95kg". */
export function formatWeightedSet(totalKg: number, bodyweightKg: number): string {
  return `${formatAddedWeight(totalKg, bodyweightKg)} · ${roundTenth(totalKg)}kg`
}

/** Weight-PR text for a weighted lift: "+25kg (100kg total)". */
export function formatWeightedPR(totalKg: number, bodyweightKg: number): string {
  return `${formatAddedWeight(totalKg, bodyweightKg)} (${roundTenth(totalKg)}kg total)`
}
