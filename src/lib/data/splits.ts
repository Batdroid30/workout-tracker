import { cache } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { getRoutines } from '@/lib/data/routines'
import { deriveNextWorkoutSuggestion, getNeglectedMuscles } from '@/lib/data/insights'
import { getNextSplitItem, type NextSplitItem, type SplitItem, type SplitWorkout } from '@/lib/split-rotation'
import { pickFallbackSuggestion, type FallbackSuggestion } from '@/lib/split-fallback'

export interface SplitWithItems {
  id: string
  name: string
  isActive: boolean
  skip: { position: number; setAt: string } | null
  items: (SplitItem & { routineTitle: string | null })[]
}

export type SessionSuggestion =
  | {
      kind: 'split'
      split: { id: string; name: string }
      next: NextSplitItem
      routineTitle: string | null
      exerciseCount: number
      setCount: number
    }
  | FallbackSuggestion

export interface SplitRow {
  id: string
  name: string
  is_active: boolean
  skip_to_position: number | null
  skip_set_at: string | null
  training_split_items: { id: string; position: number; routine_id: string | null; routine: { title: string } | null }[]
}

export function toSplitWithItems(row: SplitRow): SplitWithItems {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    skip: row.skip_to_position !== null && row.skip_set_at !== null
      ? { position: row.skip_to_position, setAt: row.skip_set_at }
      : null,
    items: [...row.training_split_items]
      .sort((a, b) => a.position - b.position)
      .map(item => ({
        id: item.id,
        position: item.position,
        routineId: item.routine_id,
        routineTitle: item.routine?.title ?? null,
      })),
  }
}

export const getSplits = cache(async (userId: string): Promise<SplitWithItems[]> => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('training_splits')
    .select('id, name, is_active, skip_to_position, skip_set_at, training_split_items ( id, position, routine_id, routine:routines ( title ) )')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw new DatabaseError(`Failed to fetch splits: ${error.message}`, error)
  return (data ?? []).map(toSplitWithItems)
})

// The generated types for routine_exercises are out of date, so read the two
// facts the suggestion needs without trusting the inferred row shape.
function routineExerciseFacts(exercise: unknown): { sets: number; muscleGroup: string | null } {
  if (typeof exercise !== 'object' || exercise === null) return { sets: 0, muscleGroup: null }
  const sets = 'target_sets' in exercise && typeof exercise.target_sets === 'number' ? exercise.target_sets : 0
  const nested = 'exercise' in exercise ? exercise.exercise : null
  const muscleGroup = typeof nested === 'object' && nested !== null && 'muscle_group' in nested
    && typeof nested.muscle_group === 'string' ? nested.muscle_group : null
  return { sets, muscleGroup }
}

// One workout per day in the split is enough to place a repeated routine.
async function getRecentSplitWorkouts(userId: string, routineIds: string[], limit: number): Promise<SplitWorkout[]> {
  if (routineIds.length === 0) return []
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('workouts')
    .select('routine_id, started_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .in('routine_id', routineIds)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw new DatabaseError(`Failed to fetch split workouts: ${error.message}`, error)
  return (data ?? []).flatMap(row => (row.routine_id ? [{ routineId: row.routine_id, startedAt: row.started_at }] : []))
}

export const getSessionSuggestion = cache(async (userId: string): Promise<SessionSuggestion | null> => {
  const [splits, routines] = await Promise.all([getSplits(userId), getRoutines(userId)])
  const active = splits.find(split => split.isActive)

  if (active) {
    const routineIds = [...new Set(active.items.flatMap(item => (item.routineId ? [item.routineId] : [])))]
    const next = getNextSplitItem({
      items: active.items,
      recentSplitWorkouts: await getRecentSplitWorkouts(userId, routineIds, active.items.length),
      skip: active.skip,
      now: new Date(),
    })
    if (next) {
      const routine = routines.find(r => r.id === next.item.routineId)
      const exercises: unknown[] = routine?.routine_exercises ?? []
      return {
        kind: 'split',
        split: { id: active.id, name: active.name },
        next,
        routineTitle: routine?.title ?? null,
        exerciseCount: exercises.length,
        setCount: exercises.reduce<number>((sum, exercise) => sum + routineExerciseFacts(exercise).sets, 0),
      }
    }
  }

  const neglected = await getNeglectedMuscles(userId)
  return pickFallbackSuggestion(
    routines.map(routine => ({
      id: routine.id,
      title: routine.title,
      createdAt: routine.created_at,
      muscleGroups: (routine.routine_exercises ?? []).flatMap((exercise: unknown) => {
        const { muscleGroup } = routineExerciseFacts(exercise)
        return muscleGroup ? [muscleGroup] : []
      }),
    })),
    neglected,
    deriveNextWorkoutSuggestion(neglected),
  )
})
