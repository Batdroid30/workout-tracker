import { cache } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

export interface TrackedLift {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
}

export interface TrackedLiftRow {
  exercise_id: string
  position: number
  exercise: { name: string; muscle_group: string } | null
}

export function toTrackedLifts(rows: TrackedLiftRow[]): TrackedLift[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .flatMap(row => (row.exercise
      ? [{ exerciseId: row.exercise_id, exerciseName: row.exercise.name, muscleGroup: row.exercise.muscle_group }]
      : []))
}

export const getTrackedLifts = cache(async (userId: string): Promise<TrackedLift[]> => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('tracked_lifts')
    .select('exercise_id, position, exercise:exercises ( name, muscle_group )')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) throw new DatabaseError(`Failed to fetch tracked lifts: ${error.message}`, error)
  return toTrackedLifts(data ?? [])
})
