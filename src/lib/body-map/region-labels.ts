import type { BodyRegion } from './muscle-regions'

// Screen readers announce these instead of the raw region slugs.
export const REGION_LABELS: Record<BodyRegion, string> = {
  chest: 'Chest',
  'front-deltoids': 'Front delts',
  'back-deltoids': 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearm: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  quadriceps: 'Quads',
  adductor: 'Adductors',
  hamstring: 'Hamstrings',
  gluteal: 'Glutes',
  abductors: 'Abductors',
  calves: 'Calves',
  trapezius: 'Traps',
  'upper-back': 'Upper back',
  'lower-back': 'Lower back',
}
