'use client'

import useSWR from 'swr'
import { getTrainingCycleAction } from '@/app/(app)/account/training-actions'
import type { TrainingCycle } from '@/lib/training-cycle'

interface TrainingCycleResult {
  /** Null both while loading and when the user has no cycle; check error to tell a failure apart. */
  cycle: TrainingCycle | null
  isLoading: boolean
  error: Error | null
}

function toError(error: unknown): Error | null {
  if (error === null || error === undefined) return null
  return error instanceof Error ? error : new Error(String(error))
}

// Client components read the same training-week cycle the server uses.
// One shared SWR entry, however many components ask.
export function useTrainingCycle(): TrainingCycleResult {
  const { data, error, isLoading } = useSWR(
    'training-cycle',
    () => getTrainingCycleAction(),
    { revalidateOnFocus: false },
  )
  return { cycle: data ?? null, isLoading, error: toError(error) }
}
