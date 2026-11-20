'use client'

import useSWR from 'swr'
import { getTrainingCycleAction } from '@/app/(app)/account/training-actions'
import type { TrainingCycle } from '@/lib/training-cycle'

// Client components read the same training-week cycle the server uses.
// Pass `at` to ask what the cycle was at a past moment (e.g. last workout).
export function useTrainingCycle(at?: string | null): { cycle: TrainingCycle | null; isLoading: boolean } {
  const { data, isLoading } = useSWR(
    at === null ? null : ['training-cycle', at ?? 'now'],
    () => getTrainingCycleAction(at ? { at } : undefined),
    { revalidateOnFocus: false },
  )
  return { cycle: data ?? null, isLoading }
}
