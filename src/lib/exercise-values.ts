// Shared by server actions and the coach: a 'use server' file can only export
// async functions, so the value lists live here instead of in actions.ts.
export const MUSCLE_GROUP_VALUES = [
  'chest', 'back', 'lats', 'shoulders', 'traps',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves',
  'core',
] as const

export const MOVEMENT_PATTERN_VALUES = ['push', 'pull', 'hinge', 'squat', 'carry', 'isolation'] as const
