import { z } from 'zod'
import { MAX_SPLIT_ITEMS } from '@/app/(app)/routines/split-schemas'
import { MOVEMENT_PATTERN_VALUES, MUSCLE_GROUP_VALUES } from '@/lib/exercise-values'
import { isUsableBy } from '@/lib/coach/tools/read-tools'
import {
  findDuplicateExercise,
  routineStamp,
  type CoachProposal,
  type NewExercise,
  type RoutineWithExercises,
} from '@/lib/coach/proposals'
import type { Exercise } from '@/types/database'

export type ProposeToolName =
  | 'propose_swap'
  | 'propose_reorder'
  | 'propose_new_exercise'
  | 'propose_routine'
  | 'propose_split'

export interface ProposeWorld {
  library: Exercise[]
  userId: string
  routines: RoutineWithExercises[]
}

export type BuildProposalResult = { proposal: CoachProposal } | { error: string }

// Thrown by the validators and turned into `{ error }` at the buildProposal
// boundary, so each validator can return its happy path directly.
class ProposalInputError extends Error {}

// ── Input schemas ────────────────────────────────────────────────────────────

const TargetSetsSchema = z.number().int().min(1).max(100)
const TargetRepsSchema = z.number().int().min(1).max(100)

// Mirrors createExerciseAction's CreateExerciseSchema limits.
const NewExerciseInputSchema = z.object({
  name:              z.string().trim().min(1).max(100),
  muscle_group:      z.enum(MUSCLE_GROUP_VALUES),
  secondary_muscles: z.array(z.enum(MUSCLE_GROUP_VALUES)).default([]),
  equipment:         z.string().max(100).nullable().default(null),
  movement_pattern:  z.enum(MOVEMENT_PATTERN_VALUES),
})

const ExerciseEntryInputSchema = z.union([
  z.object({ exercise_id: z.string(), target_sets: TargetSetsSchema, target_reps: TargetRepsSchema }),
  z.object({ new_exercise: NewExerciseInputSchema, target_sets: TargetSetsSchema, target_reps: TargetRepsSchema }),
])

type ExerciseEntryInput = z.infer<typeof ExerciseEntryInputSchema>

const SwapInputSchema = z.object({
  routine_id:      z.string(),
  position:        z.number().int().min(1),
  exercise_id:     z.string(),
  new_exercise_id: z.string(),
  target_sets:     TargetSetsSchema.optional(),
  target_reps:     TargetRepsSchema.optional(),
  reason:          z.string(),
})

const ReorderInputSchema = z.object({
  routine_id:           z.string(),
  ordered_exercise_ids: z.array(z.string()),
  reason:               z.string(),
})

const NewExerciseToolInputSchema = NewExerciseInputSchema.extend({
  add_to: z.object({
    routine_id:  z.string(),
    target_sets: TargetSetsSchema,
    target_reps: TargetRepsSchema,
  }).optional(),
})

const RoutineInputSchema = z.object({
  title:     z.string().trim().min(1).max(100),
  notes:     z.string().nullish(),
  exercises: z.array(ExerciseEntryInputSchema).min(1),
})

const SplitDayInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('routine'), routine_id: z.string() }),
  z.object({
    kind:      z.literal('new_routine'),
    title:     z.string().trim().min(1).max(100),
    exercises: z.array(ExerciseEntryInputSchema).min(1),
  }),
  z.object({ kind: z.literal('rest') }),
])

const SplitInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  days: z.array(SplitDayInputSchema),
})

// ── Lookups ──────────────────────────────────────────────────────────────────

function sortedExercises(routine: RoutineWithExercises) {
  return [...routine.exercises].sort((a, b) => a.order_index - b.order_index)
}

function findRoutine(routines: RoutineWithExercises[], routineId: string): RoutineWithExercises {
  const routine = routines.find(candidate => candidate.id === routineId)
  if (!routine) {
    throw new ProposalInputError(
      `No routine with id "${routineId}" among the lifter's routines. Call get_routines and use one of its ids.`,
    )
  }
  return routine
}

function findUsableExercise({ library, userId }: ProposeWorld, exerciseId: string): Exercise {
  const exercise = library.find(candidate => candidate.id === exerciseId)
  if (!exercise) {
    throw new ProposalInputError(
      `No exercise with id "${exerciseId}" in the library. Call find_exercises and use an id it returns.`,
    )
  }
  if (!isUsableBy(exercise, userId)) {
    throw new ProposalInputError(
      `"${exercise.name}" (id "${exerciseId}") is another lifter's custom exercise and can't be used. Call find_exercises to pick another.`,
    )
  }
  return exercise
}

function assertNotInLibrary(newExercise: NewExercise, { library, userId }: ProposeWorld): void {
  const usable = library.filter(exercise => isUsableBy(exercise, userId))
  const duplicate = findDuplicateExercise(newExercise.name, usable)
  if (duplicate) {
    throw new ProposalInputError(
      `"${newExercise.name}" already exists in the library as "${duplicate.name}" (id "${duplicate.id}"). Use that exercise_id instead of creating a new one.`,
    )
  }
}

// ── Entries ──────────────────────────────────────────────────────────────────

function resolveEntry(entry: ExerciseEntryInput, world: ProposeWorld) {
  if ('exercise_id' in entry) {
    const exercise = findUsableExercise(world, entry.exercise_id)
    return { name: exercise.name, exercise_id: entry.exercise_id, target_sets: entry.target_sets, target_reps: entry.target_reps }
  }
  assertNotInLibrary(entry.new_exercise, world)
  return { name: entry.new_exercise.name, new_exercise: entry.new_exercise, target_sets: entry.target_sets, target_reps: entry.target_reps }
}

// ── Builders ─────────────────────────────────────────────────────────────────

type ProposalBody<K extends CoachProposal['kind']> = Omit<Extract<CoachProposal, { kind: K }>, 'id' | 'status'>

function buildSwap(input: z.infer<typeof SwapInputSchema>, world: ProposeWorld): ProposalBody<'swap'> {
  const routine = findRoutine(world.routines, input.routine_id)
  const rows = sortedExercises(routine)
  const oldRow = rows[input.position - 1]
  if (!oldRow) {
    throw new ProposalInputError(
      `"${routine.title}" has ${rows.length} exercises; there is no position ${input.position}. Positions are 1-based, as in get_routines.`,
    )
  }
  if (oldRow.exercise_id !== input.exercise_id) {
    throw new ProposalInputError(
      `Position ${input.position} in "${routine.title}" is "${oldRow.name}" (id "${oldRow.exercise_id}"), not "${input.exercise_id}". Positions are 1-based, as in get_routines.`,
    )
  }
  const replacement = findUsableExercise(world, input.new_exercise_id)
  return {
    kind: 'swap',
    label: `Swap in ${routine.title}`,
    routine_id: routine.id,
    routine_title: routine.title,
    position: input.position,
    old_exercise_id: oldRow.exercise_id,
    old_name: oldRow.name,
    new_exercise_id: replacement.id,
    new_name: replacement.name,
    target_sets: input.target_sets ?? oldRow.target_sets,
    target_reps: input.target_reps ?? oldRow.target_reps,
    reason: input.reason,
    stamp: routineStamp(routine.exercises),
  }
}

function isPermutation(candidate: string[], expected: string[]): boolean {
  return [...candidate].sort().join('\n') === [...expected].sort().join('\n')
}

function buildReorder(input: z.infer<typeof ReorderInputSchema>, world: ProposeWorld): ProposalBody<'reorder'> {
  const routine = findRoutine(world.routines, input.routine_id)
  const rows = sortedExercises(routine)
  if (!isPermutation(input.ordered_exercise_ids, rows.map(row => row.exercise_id))) {
    throw new ProposalInputError(
      `ordered_exercise_ids must list every exercise in "${routine.title}" exactly once (${rows.length} ids: ${rows.map(row => row.exercise_id).join(', ')}). Nothing missing, extra or repeated.`,
    )
  }
  const nameById = new Map(rows.map(row => [row.exercise_id, row.name]))
  return {
    kind: 'reorder',
    label: `Reorder ${routine.title}`,
    routine_id: routine.id,
    routine_title: routine.title,
    before: rows.map(row => row.name),
    after: input.ordered_exercise_ids.map(id => nameById.get(id) ?? id),
    new_order_exercise_ids: input.ordered_exercise_ids,
    reason: input.reason,
    stamp: routineStamp(routine.exercises),
  }
}

function buildNewExercise(input: z.infer<typeof NewExerciseToolInputSchema>, world: ProposeWorld): ProposalBody<'new_exercise'> {
  const { add_to, ...exercise } = input
  assertNotInLibrary(exercise, world)
  if (!add_to) return { kind: 'new_exercise', label: 'New exercise', exercise, add_to: null }

  const routine = findRoutine(world.routines, add_to.routine_id)
  return {
    kind: 'new_exercise',
    label: `New exercise · add to ${routine.title}`,
    exercise,
    add_to: {
      routine_id: routine.id,
      routine_title: routine.title,
      target_sets: add_to.target_sets,
      target_reps: add_to.target_reps,
      stamp: routineStamp(routine.exercises),
    },
  }
}

function buildRoutine(input: z.infer<typeof RoutineInputSchema>, world: ProposeWorld): ProposalBody<'routine'> {
  return {
    kind: 'routine',
    label: 'New routine',
    title: input.title,
    notes: input.notes ?? null,
    exercises: input.exercises.map(entry => resolveEntry(entry, world)),
  }
}

function buildSplitDay(day: z.infer<typeof SplitDayInputSchema>, world: ProposeWorld) {
  if (day.kind === 'rest') return { kind: 'rest' as const }
  if (day.kind === 'routine') {
    const routine = findRoutine(world.routines, day.routine_id)
    return { kind: 'routine' as const, routine_id: routine.id, title: routine.title }
  }
  return {
    kind: 'new_routine' as const,
    title: day.title,
    exercises: day.exercises.map(entry => resolveEntry(entry, world)),
  }
}

function buildSplit(input: z.infer<typeof SplitInputSchema>, world: ProposeWorld): ProposalBody<'split'> {
  const routineDays = input.days.filter(day => day.kind !== 'rest').length
  if (routineDays < 1) {
    throw new ProposalInputError('A split needs at least one routine day; rest days alone are not a split.')
  }
  if (input.days.length > MAX_SPLIT_ITEMS) {
    throw new ProposalInputError(`A split can have at most ${MAX_SPLIT_ITEMS} days; this one has ${input.days.length}.`)
  }
  return { kind: 'split', label: 'New split', name: input.name, days: input.days.map(day => buildSplitDay(day, world)) }
}

// ── Entry point ──────────────────────────────────────────────────────────────

const PROPOSE_BUILDERS: { [N in ProposeToolName]: { schema: z.ZodType; build: (input: never, world: ProposeWorld) => Omit<CoachProposal, 'id' | 'status'> } } = {
  propose_swap:         { schema: SwapInputSchema,            build: buildSwap },
  propose_reorder:      { schema: ReorderInputSchema,         build: buildReorder },
  propose_new_exercise: { schema: NewExerciseToolInputSchema, build: buildNewExercise },
  propose_routine:      { schema: RoutineInputSchema,         build: buildRoutine },
  propose_split:        { schema: SplitInputSchema,           build: buildSplit },
}

function describeSchemaIssues(name: ProposeToolName, error: z.ZodError): string {
  const issues = error.issues.map(issue => `${issue.path.join('.') || 'input'}: ${issue.message}`)
  return `Invalid input for ${name}: ${issues.join('; ')}`
}

// Validates only; nothing is written. The lifter confirms in the UI before
// anything changes.
export function buildProposal(name: ProposeToolName, input: unknown, world: ProposeWorld): BuildProposalResult {
  const { schema, build } = PROPOSE_BUILDERS[name]
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: describeSchemaIssues(name, parsed.error) }

  try {
    const body = (build as (input: unknown, world: ProposeWorld) => Omit<CoachProposal, 'id' | 'status'>)(parsed.data, world)
    return { proposal: { ...body, id: crypto.randomUUID(), status: 'pending' } as CoachProposal }
  } catch (error: unknown) {
    if (error instanceof ProposalInputError) return { error: error.message }
    throw error
  }
}
