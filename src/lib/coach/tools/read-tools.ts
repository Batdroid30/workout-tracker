import { z } from 'zod'
import { getExercises } from '@/lib/data/exercises'
import { getRoutines } from '@/lib/data/routines'
import { getSplits, type SplitWithItems } from '@/lib/data/splits'
import type { RoutineWithExercises } from '@/lib/coach/proposals'
import type { Exercise } from '@/types/database'

const DEFAULT_SEARCH_LIMIT = 20

export interface ExerciseQuery {
  query?: string
  muscle_group?: string
  equipment?: string
}

export interface ExerciseSearchResult {
  id: string
  name: string
  muscle_group: string
  secondary_muscles: string[] | null
  equipment: string | null
}

export interface RoutineDescription {
  routines: {
    id: string
    title: string
    exercises: { position: number; exercise_id: string; name: string; target_sets: number; target_reps: number }[]
  }[]
  active_split: { name: string; days: string[] } | null
}

const FindExercisesInputSchema = z.object({
  query: z.string().optional(),
  muscle_group: z.string().optional(),
  equipment: z.string().optional(),
})

// Lower rank sorts first: exact, then starts-with, then contains.
function rankNameMatch(name: string, query: string): number {
  if (name === query) return 0
  if (name.startsWith(query)) return 1
  return 2
}

function equalsIgnoringCase(value: string | null, expected: string): boolean {
  return value?.toLowerCase() === expected.toLowerCase()
}

function toSearchResult(exercise: Exercise): ExerciseSearchResult {
  return {
    id: exercise.id,
    name: exercise.name,
    muscle_group: exercise.muscle_group,
    secondary_muscles: exercise.secondary_muscles,
    equipment: exercise.equipment,
  }
}

export function searchExercises(
  library: Exercise[],
  { query, muscle_group, equipment }: ExerciseQuery,
  limit = DEFAULT_SEARCH_LIMIT,
): ExerciseSearchResult[] {
  const needle = query?.trim().toLowerCase() ?? ''

  return library
    .filter(exercise => !muscle_group || equalsIgnoringCase(exercise.muscle_group, muscle_group))
    .filter(exercise => !equipment || equalsIgnoringCase(exercise.equipment, equipment))
    .filter(exercise => !needle || exercise.name.toLowerCase().includes(needle))
    .map(exercise => ({ exercise, rank: needle ? rankNameMatch(exercise.name.toLowerCase(), needle) : 0 }))
    .sort((a, b) => a.rank - b.rank || a.exercise.name.localeCompare(b.exercise.name))
    .slice(0, limit)
    .map(({ exercise }) => toSearchResult(exercise))
}

export function describeRoutines(
  routines: RoutineWithExercises[],
  activeSplit: SplitWithItems | null,
): RoutineDescription {
  return {
    routines: routines.map(routine => ({
      id: routine.id,
      title: routine.title,
      exercises: [...routine.exercises]
        .sort((a, b) => a.order_index - b.order_index)
        .map((exercise, index) => ({
          position: index + 1,
          exercise_id: exercise.exercise_id,
          name: exercise.name,
          target_sets: exercise.target_sets,
          target_reps: exercise.target_reps,
        })),
    })),
    active_split: activeSplit
      ? {
          name: activeSplit.name,
          days: [...activeSplit.items]
            .sort((a, b) => a.position - b.position)
            .map(item => item.routineTitle ?? 'Rest'),
        }
      : null,
  }
}

// Other users' custom exercises can appear in the library query; the coach
// must never offer them, since the lifter cannot use them in a routine.
function isUsableBy(exercise: Exercise, userId: string): boolean {
  return !exercise.is_custom || exercise.created_by === userId
}

// The generated Supabase types lag the routines select, so the rows are
// validated at runtime instead of trusting their static type.
const RoutineRowsSchema = z.array(z.object({
  id: z.string(),
  title: z.string(),
  routine_exercises: z.array(z.object({
    order_index: z.number(),
    target_sets: z.number(),
    target_reps: z.number(),
    exercise: z.object({ id: z.string(), name: z.string() }).nullable(),
  })),
}))

async function loadRoutinesForCoach(userId: string): Promise<RoutineWithExercises[]> {
  const rows = RoutineRowsSchema.parse(await getRoutines(userId))
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    exercises: row.routine_exercises.flatMap(({ exercise, ...targets }) =>
      exercise ? [{ exercise_id: exercise.id, name: exercise.name, ...targets }] : [],
    ),
  }))
}

export async function runReadTool(
  name: 'find_exercises' | 'get_routines',
  input: unknown,
  userId: string,
): Promise<string> {
  try {
    if (name === 'find_exercises') {
      const parsed = FindExercisesInputSchema.safeParse(input)
      if (!parsed.success) return JSON.stringify({ error: 'Invalid input for find_exercises' })
      const library = (await getExercises()).filter(exercise => isUsableBy(exercise, userId))
      return JSON.stringify({ exercises: searchExercises(library, parsed.data) })
    }

    const [routines, splits] = await Promise.all([loadRoutinesForCoach(userId), getSplits(userId)])
    const activeSplit = splits.find(split => split.isActive) ?? null
    return JSON.stringify(describeRoutines(routines, activeSplit))
  } catch (error: unknown) {
    console.error(`Coach read tool ${name} failed:`, error)
    return JSON.stringify({ error: `Could not run ${name}` })
  }
}
