/**
 * How a logged set's weight_kg translates into load lifted, per exercise kind.
 *
 * weight_kg keeps its existing meaning everywhere:
 *   normal   → weight on the bar/machine
 *   weighted → bodyweight + added weight (bodyweight exercises named "Weighted")
 *   assisted → assistance from the machine/band (exercises named "Assisted")
 */

export const FALLBACK_BODYWEIGHT_KG = 75

export function isAssisted(exerciseName: string): boolean {
  return /assisted/i.test(exerciseName)
}

/** Kilograms actually moved. Assisted sets lift bodyweight minus assistance, never below zero. */
export function effectiveLoad(weightKg: number, exerciseName: string, bodyweightKg: number): number {
  if (isAssisted(exerciseName)) return Math.max(0, bodyweightKg - weightKg)
  return weightKg
}

export function setVolume(weightKg: number, reps: number, exerciseName: string, bodyweightKg: number): number {
  return effectiveLoad(weightKg, exerciseName, bodyweightKg) * reps
}

/** Whole kilograms below 1000, one decimal with a "k" suffix above. */
export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`
  return String(Math.round(kg))
}
