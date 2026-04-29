'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { suggestNextSet, type OverloadSuggestion } from '@/lib/algorithms'

export interface OverloadInfo {
  suggestion: OverloadSuggestion | null
  lastWeight: number | null
  lastReps:   number | null
}

/**
 * Fetches the last session's final working set for an exercise and returns
 * a progressive overload suggestion using the double-progression algorithm.
 *
 * Returns null until data is loaded — callers should treat null as "no history".
 */
export function useOverloadSuggestion(exerciseId: string): OverloadInfo {
  const [info, setInfo] = useState<OverloadInfo>({
    suggestion: null,
    lastWeight: null,
    lastReps:   null,
  })

  useEffect(() => {
    if (!exerciseId) return

    let cancelled = false

    async function fetchLastSession() {
      const supabase = getSupabaseClient()

      // Get recent non-warmup working sets for this exercise, newest first
      const { data } = await supabase
        .from('sets')
        .select(`
          weight_kg,
          reps,
          set_number,
          is_warmup,
          completed_at,
          workout_exercises!inner ( exercise_id )
        `)
        .eq('workout_exercises.exercise_id', exerciseId)
        .eq('is_warmup', false)
        .gt('weight_kg', 0)
        .gt('reps', 0)
        .order('completed_at', { ascending: false })
        .limit(20)

      if (cancelled || !data || data.length === 0) return

      // completed_at can be null on draft sets — skip them when picking the
      // most recent calendar day. Working sets always have it set.
      const firstCompleted = data[0].completed_at
      if (!firstCompleted) return
      const mostRecentDay = firstCompleted.split('T')[0]
      const lastWorkoutSets = data
        .filter((s: any) => s.completed_at && s.completed_at.split('T')[0] === mostRecentDay)
        .sort((a: any, b: any) => b.set_number - a.set_number)

      const lastSet = lastWorkoutSets[0]
      if (!lastSet) return

      const w = Number(lastSet.weight_kg)
      const r = Number(lastSet.reps)

      if (!cancelled) {
        setInfo({ lastWeight: w, lastReps: r, suggestion: suggestNextSet({ lastWeight: w, lastReps: r }) })
      }
    }

    fetchLastSession()
    return () => { cancelled = true }
  }, [exerciseId])

  return info
}
