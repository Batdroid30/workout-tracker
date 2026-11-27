'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { z } from 'zod'
import { useTrainingCycle } from '@/hooks/useTrainingCycle'
import { useWeightStep } from '@/hooks/useWeightStep'
import { DatabaseError } from '@/lib/errors'
import { FALLBACK_BODYWEIGHT_KG } from '@/lib/load'
import { getCurrentUserId, getSupabaseClient } from '@/lib/supabase/client'
import {
  fetchSuggestionHistory, fetchTodayReadinessAverage,
} from '@/lib/data/suggestion-history'
import {
  buildPlanContext, buildPlanData, historyOptions, toHookResult,
  type ExercisePlanResult, type SuggestionProfile,
} from '@/lib/suggestions/exercise-plan-input'
import { useWorkoutStore } from '@/store/workout.store'
import type { ActiveExercise } from '@/types/database'

const SWR_OPTIONS = { revalidateOnFocus: false }

const ProfileSchema = z.object({
  training_goal: z.enum(['strength', 'muscle', 'both']).nullable(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).nullable(),
  training_phase: z.enum(['bulking', 'cutting', 'maingaining']).nullable(),
})

const EMPTY_PROFILE: SuggestionProfile = { training_goal: null, experience_level: null, training_phase: null }

async function fetchProfile(): Promise<SuggestionProfile> {
  const userId = await getCurrentUserId()
  if (!userId) return EMPTY_PROFILE

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('training_goal, experience_level, training_phase')
    .eq('id', userId)
    .single()

  if (error) throw new DatabaseError(`Failed to fetch profile: ${error.message}`, error)
  return ProfileSchema.parse(data)
}

/** Today's planned sets for one exercise, live-adjusted for completed sets, in display (storage) space. */
export function useExercisePlan(exercise: ActiveExercise): ExercisePlanResult {
  const exerciseId = exercise.exercise.id
  const options = historyOptions(exercise.exercise)
  const todayBodyweightKg = useWorkoutStore(s => s.userBodyweight) ?? FALLBACK_BODYWEIGHT_KG
  const { cycle, isLoading: isCycleLoading, error: cycleError } = useTrainingCycle()

  const profile = useSWR('user-profile-for-suggestions', fetchProfile, SWR_OPTIONS)
  const readiness = useSWR('readiness-today', fetchTodayReadinessAverage, SWR_OPTIONS)
  const step = useWeightStep(exerciseId)
  const history = useSWR(
    `suggestion-history-${exerciseId}-${options.isAssisted ? 'assisted' : 'load'}-${options.isBodyweightOnly ? 'bw' : 'kg'}`,
    () => fetchSuggestionHistory(exerciseId, options),
    SWR_OPTIONS,
  )

  const isReady = history.data !== undefined && profile.data !== undefined
    && readiness.data !== undefined && step.data !== undefined && !isCycleLoading

  const data = useMemo(() => {
    if (!isReady || !history.data || !profile.data) return null
    const ctx = buildPlanContext({
      exercise, cycle, profile: profile.data,
      weightStep: step.data ?? null, readinessAverage: readiness.data ?? null,
    })
    return buildPlanData({ history: history.data, ctx, exercise, todayBodyweightKg, now: new Date() })
  }, [isReady, history.data, cycle, profile.data, readiness.data, step.data, exercise, todayBodyweightKg])

  // A failed cycle fetch must not fall back to the no-cycle week; that fallback is for users without a cycle.
  const error = history.error ?? profile.error ?? readiness.error ?? step.error ?? cycleError
  return toHookResult(data, error, !isReady && !error)
}
