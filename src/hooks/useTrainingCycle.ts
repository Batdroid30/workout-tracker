'use client'

import useSWR from 'swr'
import { getTrainingCycleAction } from '@/app/(app)/account/training-actions'
import type { TrainingCycle } from '@/lib/training-cycle'

// Client components read the same training-week cycle the server uses.
// One shared SWR entry, however many components ask.
export function useTrainingCycle(): { cycle: TrainingCycle | null; isLoading: boolean } {
  const { data, isLoading } = useSWR(
    'training-cycle',
    () => getTrainingCycleAction(),
    { revalidateOnFocus: false },
  )
  return { cycle: data ?? null, isLoading }
}
