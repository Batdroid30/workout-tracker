'use client'

import useSWR from 'swr'
import { getSupabaseClient } from '@/lib/supabase/client'
import { suggestNextSet, type OverloadSuggestion } from '@/lib/algorithms'
import { getCurrentDUPScheme, isCurrentWeekDeload } from '@/lib/workout-intelligence'
import type { TrainingGoal, ExperienceLevel, TrainingPhase } from '@/types/database'

export interface LastWorkoutSetInfo {
  weight_kg: number
  reps:      number
  /** RPE logged on this set last session — fed into the overload suggestion. */
  rpe?:      number
  /** Progressive-overload suggestion for this set position. */
  suggestion: OverloadSuggestion
}

interface FetchParams {
  exerciseId:       string
  exerciseType:     'compound' | 'isolation'
  progressionModel: 'double' | 'rep_sum' | null
  repSumTarget:     number | null
}

interface UserProfile {
  training_goal:    TrainingGoal    | null
  experience_level: ExperienceLevel | null
  training_phase:   TrainingPhase   | null
  phase_started_at: string          | null
}

async function fetchProfile(): Promise<UserProfile> {
  const supabase = getSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { training_goal: null, experience_level: null, training_phase: null, phase_started_at: null }

  const { data } = await supabase
    .from('profiles')
    .select('training_goal, experience_level, training_phase, phase_started_at')
    .eq('id', user.id)
    .single()

  return {
    training_goal:    (data?.training_goal    as TrainingGoal    | null) ?? null,
    experience_level: (data?.experience_level as ExperienceLevel | null) ?? null,
    training_phase:   (data?.training_phase   as TrainingPhase   | null) ?? null,
    phase_started_at: data?.phase_started_at ?? null,
  }
}

async function fetchLastWorkoutSets(
  { exerciseId, exerciseType, progressionModel, repSumTarget }: FetchParams,
  profile: UserProfile,
): Promise<LastWorkoutSetInfo[]> {
  const supabase = getSupabaseClient()

  // Fetch the 30 most recent completed working sets for this exercise.
  // We over-fetch so we can isolate the most recent workout's sets even if
  // that workout had many sets.
  const { data, error } = await supabase
    .from('sets')
    .select(`
      weight_kg,
      reps,
      rpe,
      set_number,
      is_warmup,
      completed_at,
      workout_exercises!inner (
        exercise_id,
        workouts!inner ( id, started_at )
      )
    `)
    .eq('workout_exercises.exercise_id', exerciseId)
    .eq('is_warmup', false)
    .gt('weight_kg', 0)
    .gt('reps', 0)
    .order('completed_at', { ascending: false })
    .limit(30)

  if (error || !data || data.length === 0) return []

  // Resolve the workout id from the nested join (Supabase can return either
  // an array or an object depending on the relationship cardinality).
  const resolveWorkoutId = (set: any): string => {
    const we = Array.isArray(set.workout_exercises) ? set.workout_exercises[0] : set.workout_exercises
    const w  = Array.isArray(we?.workouts) ? we.workouts[0] : we?.workouts
    return w?.id ?? ''
  }

  // The first row is the most recent completed set — its workout is the one we want.
  const latestWorkoutId = resolveWorkoutId(data[0])
  if (!latestWorkoutId) return []

  const dupScheme    = getCurrentDUPScheme()
  const isDeloadWeek = isCurrentWeekDeload(profile)

  const lastSets = (data as any[])
    .filter((set: any) => resolveWorkoutId(set) === latestWorkoutId)
    .sort((a: any, b: any) => (a.set_number ?? 0) - (b.set_number ?? 0))

  // For rep-sum mode, compute the total reps from the previous session so
  // suggestNextSet can decide whether to bump the weight.
  // undefined (not 0) when there's no history — prevents "Rep bank: 0/25" on first session.
  const prevTotalReps: number | undefined =
    progressionModel === 'rep_sum' && lastSets.length > 0
      ? lastSets.reduce((sum: number, s: any) => sum + Number(s.reps), 0)
      : undefined

  return lastSets.map((set: any) => {
    const w   = Number(set.weight_kg)
    const r   = Number(set.reps)
    const rpe = set.rpe != null ? Number(set.rpe) : undefined
    return {
      weight_kg: w,
      reps:      r,
      rpe,
      suggestion: suggestNextSet({
        lastWeight:      w,
        lastReps:        r,
        lastRPE:         rpe,
        exerciseType,
        trainingGoal:    profile.training_goal,
        experienceLevel: profile.experience_level,
        dupRepRange:     dupScheme.repRange,
        dupRpeTarget:    dupScheme.rpeTarget,
        isDeloadWeek,
        progressionModel,
        repSumTarget,
        prevTotalReps,
      }),
    }
  })
}

/**
 * Returns the previous workout's sets for a given exercise, indexed by
 * set position (0 = first working set, 1 = second, …).
 *
 * Each entry includes the weight/reps logged last time at that position
 * AND a progressive-overload suggestion for this session.
 *
 * Replaces both `useExerciseHistory` and `useOverloadSuggestion`.
 */
export function useLastWorkoutSets(
  exerciseId:       string,
  exerciseType:     'compound' | 'isolation' = 'compound',
  progressionModel: 'double' | 'rep_sum' | null = null,
  repSumTarget:     number | null               = null,
) {
  // Profile is fetched once and shared across all hook instances via SWR's
  // deduplication — the 'user-profile-for-suggestions' key ensures only one
  // in-flight request no matter how many exercises are on screen.
  const { data: profile } = useSWR<UserProfile>(
    'user-profile-for-suggestions',
    fetchProfile,
    { revalidateOnFocus: false },
  )

  // Normalise the model key — null and 'double' both fetch identical data,
  // so they must share a cache entry to prevent duplicate network requests.
  const modelKey = progressionModel === 'rep_sum' ? 'rep_sum' : 'double'
  const { data, isLoading } = useSWR(
    // Wait for profile to load before fetching sets, so suggestions are always
    // calibrated to the user's goal and experience level.
    exerciseId && profile
      ? `last-workout-sets-${exerciseId}-${exerciseType}-${modelKey}-${repSumTarget ?? 0}`
      : null,
    () => fetchLastWorkoutSets(
      { exerciseId, exerciseType, progressionModel, repSumTarget },
      profile!,
    ),
    { revalidateOnFocus: false },
  )

  return { sets: data ?? [], isLoading }
}
