import { cache } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { getRoutines } from '@/lib/data/routines'
import { deriveNextWorkoutSuggestion, getNeglectedMuscles } from '@/lib/data/insights'
import { getNextSplitItem, type NextSplitItem, type SplitItem, type SplitWorkout } from '@/lib/split-rotation'
import { pickFallbackSuggestion, type FallbackSuggestion } from '@/lib/split-fallback'
import { SplitInputSchema, type SplitInput } from '@/app/(app)/routines/split-schemas'

export interface SplitWithItems {
  id: string
  name: string
  isActive: boolean
  skip: { position: number; setAt: string } | null
  items: (SplitItem & { routineTitle: string | null })[]
}

export interface LastSplitWorkout {
  routineId: string
  title: string
  startedAt: string
  durationSeconds: number | null
}

interface RecentSplitWorkoutRow {
  routine_id: string | null
  title: string | null
  started_at: string
  duration_seconds: number | null
}

export function toLastSplitWorkout(rowsNewestFirst: RecentSplitWorkoutRow[]): LastSplitWorkout | null {
  const newest = rowsNewestFirst.find(row => row.routine_id)
  if (!newest?.routine_id) return null
  return {
    routineId: newest.routine_id,
    title: newest.title ?? 'Workout',
    startedAt: newest.started_at,
    durationSeconds: newest.duration_seconds,
  }
}

export type SessionSuggestion =
  | {
      kind: 'split'
      split: { id: string; name: string }
      next: NextSplitItem
      routineTitle: string | null
      exerciseCount: number
      setCount: number
      // Saved position of the day after next, for "Skip to next".
      skipToPosition: number
      // Newest finished workout from the split, so Today can say it's done.
      lastSplitWorkout: LastSplitWorkout | null
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
async function getRecentSplitWorkouts(userId: string, routineIds: string[], limit: number): Promise<RecentSplitWorkoutRow[]> {
  if (routineIds.length === 0) return []
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('workouts')
    .select('routine_id, title, started_at, duration_seconds')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .in('routine_id', routineIds)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw new DatabaseError(`Failed to fetch split workouts: ${error.message}`, error)
  return data ?? []
}

function toSplitWorkouts(rows: RecentSplitWorkoutRow[]): SplitWorkout[] {
  return rows.flatMap(row => (row.routine_id ? [{ routineId: row.routine_id, startedAt: row.started_at }] : []))
}

export const getSessionSuggestion = cache(async (userId: string): Promise<SessionSuggestion | null> => {
  const [splits, routines] = await Promise.all([getSplits(userId), getRoutines(userId)])
  const active = splits.find(split => split.isActive)

  if (active) {
    const routineIds = [...new Set(active.items.flatMap(item => (item.routineId ? [item.routineId] : [])))]
    const recent = await getRecentSplitWorkouts(userId, routineIds, active.items.length)
    const next = getNextSplitItem({
      items: active.items,
      recentSplitWorkouts: toSplitWorkouts(recent),
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
        skipToPosition: active.items[(next.index + 1) % active.items.length].position,
        lastSplitWorkout: toLastSplitWorkout(recent),
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

// ── Write functions (never cached) ───────────────────────────────────────────

export async function insertSplit(userId: string, name: string): Promise<string> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('training_splits')
    .insert({ user_id: userId, name })
    .select('id')
    .single()
  if (error) throw new DatabaseError(`Failed to create split: ${error.message}`, error)
  return data.id
}

export async function insertSplitItems(splitId: string, items: SplitInput['items']): Promise<void> {
  const supabase = await getSupabaseServer()
  const { error } = await supabase
    .from('training_split_items')
    .insert(items.map((item, position) => ({ split_id: splitId, position, routine_id: item.routineId })))
  if (error) throw new DatabaseError(`Failed to save split days: ${error.message}`, error)
}

export async function deleteSplit(splitId: string, userId: string): Promise<void> {
  const supabase = await getSupabaseServer()
  const { error } = await supabase.from('training_splits').delete().eq('id', splitId).eq('user_id', userId)
  if (error) throw new DatabaseError(`Failed to delete split: ${error.message}`, error)
}

// Deactivate first: a unique index allows only one active split per user.
export async function activateSplit(splitId: string, userId: string): Promise<void> {
  const supabase = await getSupabaseServer()
  const { error: offError } = await supabase.from('training_splits').update({ is_active: false }).eq('user_id', userId).neq('id', splitId)
  if (offError) throw new DatabaseError(`Failed to switch splits: ${offError.message}`, offError)
  const { error: onError } = await supabase.from('training_splits').update({ is_active: true }).eq('id', splitId).eq('user_id', userId)
  if (onError) throw new DatabaseError(`Failed to switch splits: ${onError.message}`, onError)
}

// All-or-nothing: a split whose days fail to save is removed, not left empty.
export async function createSplit(userId: string, input: SplitInput): Promise<string> {
  const parsed = SplitInputSchema.parse(input)
  const splitId = await insertSplit(userId, parsed.name)
  try {
    await insertSplitItems(splitId, parsed.items)
    return splitId
  } catch (error: unknown) {
    await deleteSplit(splitId, userId).catch((cleanupError: unknown) =>
      console.error(`Failed to remove split ${splitId} after its days failed to save:`, cleanupError))
    throw error
  }
}
