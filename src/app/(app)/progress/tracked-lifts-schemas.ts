import { z } from 'zod'

export const MAX_TRACKED_LIFTS = 6

export const TrackedLiftIdsSchema = z
  .array(z.string().uuid())
  .max(MAX_TRACKED_LIFTS, `Pick up to ${MAX_TRACKED_LIFTS} lifts`)
  .refine(ids => new Set(ids).size === ids.length, 'Each lift can only be picked once')
