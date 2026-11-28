'use client'

import { useCallback } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { upsertWeightStep } from '@/lib/data/exercise-preferences'
import { fetchWeightStep } from '@/lib/data/suggestion-history'
import { useToast } from '@/providers/ToastProvider'

export function weightStepKey(exerciseId: string): string {
  return `weight-step-${exerciseId}`
}

/** The lifter's saved weight step for one exercise; data is null when none is saved. */
export function useWeightStep(exerciseId: string) {
  return useSWR(weightStepKey(exerciseId), () => fetchWeightStep(exerciseId), { revalidateOnFocus: false })
}

/** Saves a step, then refreshes the plan that reads it. Resolves true when saved. */
export function useSaveWeightStep(exerciseId: string): (stepKg: number) => Promise<boolean> {
  const { mutate } = useSWRConfig()
  const toast = useToast()
  return useCallback(async (stepKg: number) => {
    try {
      await upsertWeightStep(exerciseId, stepKg)
    } catch (error: unknown) {
      console.error('Failed to save weight step', error)
      toast.error("Couldn't save weight step")
      return false
    }
    await mutate(weightStepKey(exerciseId))
    return true
  }, [exerciseId, mutate, toast])
}
