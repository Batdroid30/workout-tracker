import type { EquipmentKind, PlanContext } from './types'

const EQUIPMENT_KINDS: readonly EquipmentKind[] = [
  'barbell', 'ez-bar', 'dumbbell', 'cable', 'machine', 'bodyweight', 'other',
]

const DEFAULT_WEIGHT_STEP_KG: Record<EquipmentKind, number> = {
  barbell: 2.5,
  'ez-bar': 2.5,
  dumbbell: 2.5,
  cable: 2.5,
  machine: 5,
  bodyweight: 2.5,
  other: 2.5,
}

// Absorbs floating-point error so 30 / 2.5 never floors to 11.
const ROUNDING_EPSILON = 1e-9

export function toEquipmentKind(equipment: string | null): EquipmentKind {
  const normalised = equipment?.trim().toLowerCase()
  return EQUIPMENT_KINDS.find(kind => kind === normalised) ?? 'other'
}

export function defaultWeightStep(kind: EquipmentKind): number {
  return DEFAULT_WEIGHT_STEP_KG[kind]
}

export function progressionIncrement(
  ctx: Pick<PlanContext, 'weightStepKg' | 'experience' | 'movement' | 'equipment'>,
): number {
  const isBeginnerBarbellCompound =
    ctx.experience === 'beginner' && ctx.movement === 'compound' && ctx.equipment === 'barbell'
  return isBeginnerBarbellCompound ? ctx.weightStepKg * 2 : ctx.weightStepKg
}

export function roundDownToStep(kg: number, step: number): number {
  const steps = Math.floor(kg / step + ROUNDING_EPSILON)
  return Math.max(steps, 1) * step
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

export function roundToStep(kg: number, step: number): number {
  const steps = Math.round(kg / step)
  return Math.max(steps, 1) * step
}
