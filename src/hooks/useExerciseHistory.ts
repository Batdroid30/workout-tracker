'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Set } from '@/types/database'

export function useExerciseHistory(exerciseId: string) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      if (!exerciseId) return
      
      const supabase = getSupabaseClient()
      
      // Get the most recent workout where this exercise was performed
      const { data, error } = await supabase
        .from('sets')
        .select(`
          weight_kg,
          reps,
          workout_exercises!inner(
            exercise_id,
            workouts(started_at)
          )
        `)
        .eq('workout_exercises.exercise_id', exerciseId)
        .order('completed_at', { ascending: false, foreignTable: 'workout_exercises.workouts' })
        .limit(10)

      if (!error && data) {
        setHistory(data)
      }
      setLoading(false)
    }

    fetchHistory()
  }, [exerciseId])

  return { history, loading }
}
