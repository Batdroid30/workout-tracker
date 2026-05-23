/**
 * Muscle group categorisation used in both server-side snapshot aggregation
 * and client-side chart rendering. Kept in a dependency-free module so client
 * components can import without pulling in server-only APIs.
 */

export const PUSH_MUSCLES = new Set(['chest', 'shoulders', 'triceps'])
export const PULL_MUSCLES = new Set(['back', 'lats', 'traps', 'biceps', 'forearms'])
export const LEG_MUSCLES  = new Set(['quads', 'hamstrings', 'glutes', 'calves'])
