import type { BetaTool } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { MOVEMENT_PATTERN_VALUES, MUSCLE_GROUP_VALUES } from '@/lib/exercise-values'

// These schemas mirror the Zod input schemas in tools/read-tools.ts and
// tools/propose-tools.ts, which stay the source of truth: strict mode rejects
// numeric and length limits, so those limits are enforced there and only
// described here. Only the small tools are strict: the API refuses strict
// tools whose combined grammar is too large, and the nested proposal schemas
// (routines, splits, new exercises) are well past that. Zod checks them all.

const muscleGroup = { type: 'string', enum: [...MUSCLE_GROUP_VALUES] }
const movementPattern = { type: 'string', enum: [...MOVEMENT_PATTERN_VALUES] }
const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] }
const targetSets = { type: 'integer', description: 'Working sets, 1 to 100.' }
const targetReps = { type: 'integer', description: 'Reps per set, 1 to 100.' }
const reason = { type: 'string', description: 'One short sentence for the lifter on why.' }

const newExerciseProperties = {
  name: { type: 'string', description: 'Exercise name, up to 100 characters.' },
  muscle_group: muscleGroup,
  secondary_muscles: { type: 'array', items: muscleGroup },
  equipment: { ...nullableString, description: 'Equipment, e.g. "barbell", or null for bodyweight.' },
  movement_pattern: movementPattern,
}
const newExerciseRequired = ['name', 'muscle_group', 'equipment', 'movement_pattern']

const newExercise = {
  type: 'object',
  properties: newExerciseProperties,
  required: newExerciseRequired,
  additionalProperties: false,
}

const exerciseEntry = {
  anyOf: [
    {
      type: 'object',
      description: 'An exercise already in the library (id from find_exercises).',
      properties: { exercise_id: { type: 'string' }, target_sets: targetSets, target_reps: targetReps },
      required: ['exercise_id', 'target_sets', 'target_reps'],
      additionalProperties: false,
    },
    {
      type: 'object',
      description: 'An exercise not in the library; it is created when the lifter confirms.',
      properties: { new_exercise: newExercise, target_sets: targetSets, target_reps: targetReps },
      required: ['new_exercise', 'target_sets', 'target_reps'],
      additionalProperties: false,
    },
  ],
}

const exerciseEntries = { type: 'array', items: exerciseEntry, description: 'At least one exercise, in order.' }

const FIND_EXERCISES: BetaTool = {
  name: 'find_exercises',
  description: 'Search the exercise library the lifter can use. Returns up to 20 matches with their ids. Call this before proposing any exercise.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Part of the exercise name.' },
      muscle_group: muscleGroup,
      equipment: { type: 'string', description: 'Equipment, e.g. "dumbbell".' },
    },
    required: [],
    additionalProperties: false,
  },
}

const GET_ROUTINES: BetaTool = {
  name: 'get_routines',
  description: "Read the lifter's routines (ids, exercises with 1-based positions, sets and reps) and their active split. Call this before proposing changes to a routine or split.",
  strict: true,
  input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
}

const PROPOSE_SWAP: BetaTool = {
  name: 'propose_swap',
  description: 'Propose replacing one exercise in a routine. Nothing changes until the lifter confirms.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      routine_id: { type: 'string' },
      position: { type: 'integer', description: '1-based position of the exercise being replaced, as in get_routines.' },
      exercise_id: { type: 'string', description: 'The id of the exercise at that position now.' },
      new_exercise_id: { type: 'string', description: 'Library id of the replacement.' },
      target_sets: { ...targetSets, description: 'Optional; keeps the current sets if left out.' },
      target_reps: { ...targetReps, description: 'Optional; keeps the current reps if left out.' },
      reason,
    },
    required: ['routine_id', 'position', 'exercise_id', 'new_exercise_id', 'reason'],
    additionalProperties: false,
  },
}

const PROPOSE_REORDER: BetaTool = {
  name: 'propose_reorder',
  description: 'Propose a new exercise order for a routine. Nothing changes until the lifter confirms.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      routine_id: { type: 'string' },
      ordered_exercise_ids: {
        type: 'array',
        items: { type: 'string' },
        description: "Every exercise id in the routine, each exactly once, in the new order.",
      },
      reason,
    },
    required: ['routine_id', 'ordered_exercise_ids', 'reason'],
    additionalProperties: false,
  },
}

const PROPOSE_NEW_EXERCISE: BetaTool = {
  name: 'propose_new_exercise',
  description: 'Propose adding an exercise that is not in the library, optionally appended to one routine. Refused if the library already has it.',
  input_schema: {
    type: 'object',
    properties: {
      ...newExerciseProperties,
      add_to: {
        type: 'object',
        description: 'Optional routine to append it to.',
        properties: { routine_id: { type: 'string' }, target_sets: targetSets, target_reps: targetReps },
        required: ['routine_id', 'target_sets', 'target_reps'],
        additionalProperties: false,
      },
    },
    required: newExerciseRequired,
    additionalProperties: false,
  },
}

const PROPOSE_ROUTINE: BetaTool = {
  name: 'propose_routine',
  description: 'Propose a new routine. Nothing is saved until the lifter confirms.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Up to 100 characters.' },
      notes: { ...nullableString, description: 'Optional notes on intent, rest or warm-up.' },
      exercises: exerciseEntries,
    },
    required: ['title', 'exercises'],
    additionalProperties: false,
  },
}

const PROPOSE_SPLIT: BetaTool = {
  name: 'propose_split',
  description: 'Propose a training split (a repeating cycle of days). Reuse existing routines by id where they fit. It becomes the active split when the lifter confirms.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Up to 60 characters.' },
      days: {
        type: 'array',
        description: 'The days in order; at least one must be a routine day.',
        items: {
          anyOf: [
            {
              type: 'object',
              description: 'An existing routine, reused as is.',
              properties: { kind: { type: 'string', const: 'routine' }, routine_id: { type: 'string' } },
              required: ['kind', 'routine_id'],
              additionalProperties: false,
            },
            {
              type: 'object',
              description: 'A new routine created for this split.',
              properties: { kind: { type: 'string', const: 'new_routine' }, title: { type: 'string' }, exercises: exerciseEntries },
              required: ['kind', 'title', 'exercises'],
              additionalProperties: false,
            },
            {
              type: 'object',
              description: 'A rest day.',
              properties: { kind: { type: 'string', const: 'rest' } },
              required: ['kind'],
              additionalProperties: false,
            },
          ],
        },
      },
    },
    required: ['name', 'days'],
    additionalProperties: false,
  },
}

// Fixed order: the tool list is part of the cached prompt prefix.
export const COACH_TOOLS: BetaTool[] = [
  FIND_EXERCISES,
  GET_ROUTINES,
  PROPOSE_SWAP,
  PROPOSE_REORDER,
  PROPOSE_NEW_EXERCISE,
  PROPOSE_ROUTINE,
  PROPOSE_SPLIT,
]
