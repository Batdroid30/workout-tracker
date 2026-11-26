import type { PlanContext } from './types'

export const LOW_READINESS_MAX_AVERAGE = 2
export const LOW_READINESS_RPE_DROP = 0.5

export function isLowReadiness(readinessAverage: number | null): boolean {
  return readinessAverage !== null && readinessAverage <= LOW_READINESS_MAX_AVERAGE
}

/** Low readiness keeps one more half-rep in reserve. */
export function effectiveRpe(ctx: Pick<PlanContext, 'rpeTarget' | 'readinessAverage'>): number {
  return ctx.rpeTarget - (isLowReadiness(ctx.readinessAverage) ? LOW_READINESS_RPE_DROP : 0)
}
