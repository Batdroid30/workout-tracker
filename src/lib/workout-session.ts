// Decisions about the workout in progress: how exercises group into
// draggable blocks, how far along the session is, and how a saved session
// from an older version of the app is brought up to date.

import { z } from 'zod'
import type { ActiveExercise, ActiveWorkout } from '@/types/database'

// ─── Ids ─────────────────────────────────────────────────────────────────────

let fallbackCounter = 0

// crypto.randomUUID is missing on plain-http LAN origins, which is how the app
// is often opened on a phone during development.
export function newClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  fallbackCounter += 1
  return `client-${Date.now().toString(36)}-${fallbackCounter}`
}

// Fills in what only the phone tracks for a brand-new session.
export function newSession(workout: Omit<ActiveWorkout, 'openExerciseId' | 'rest'>): ActiveWorkout {
  return { ...workout, openExerciseId: firstOpenExerciseId(workout.exercises), rest: null }
}

// ─── Blocks (what a drag moves) ──────────────────────────────────────────────

export interface ExerciseBlock {
  id: string
  clientIds: string[]
  label: string
}

export function exerciseBlocks(exercises: ActiveExercise[]): ExerciseBlock[] {
  const blocks: ExerciseBlock[] = []
  for (const entry of exercises) {
    const group = entry.superset_group
    const last = blocks.at(-1)
    if (group && last?.id === group) {
      last.clientIds.push(entry.clientId)
      continue
    }
    blocks.push({ id: group ?? entry.clientId, clientIds: [entry.clientId], label: entry.exercise.name })
  }
  return blocks.map(block => block.clientIds.length > 1
    ? { ...block, label: `Superset · ${block.clientIds.map(id => nameOf(exercises, id)).join(' + ')}` }
    : block)
}

function nameOf(exercises: ActiveExercise[], clientId: string): string {
  return exercises.find(entry => entry.clientId === clientId)?.exercise.name ?? ''
}

// Moves a whole block to where another block sits, keeping superset members
// together and in order, then renumbers order_index.
export function moveBlock(exercises: ActiveExercise[], fromBlockId: string, toBlockId: string): ActiveExercise[] {
  const blocks = exerciseBlocks(exercises)
  const from = blocks.findIndex(block => block.id === fromBlockId)
  const to = blocks.findIndex(block => block.id === toBlockId)
  if (from === -1 || to === -1 || from === to) return exercises

  const reordered = [...blocks]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(to, 0, moved)

  const byId = new Map(exercises.map(entry => [entry.clientId, entry]))
  return reordered
    .flatMap(block => block.clientIds.flatMap(id => byId.get(id) ?? []))
    .map((entry, index) => ({ ...entry, order_index: index }))
}

// ─── Progress ────────────────────────────────────────────────────────────────

export function exerciseTally(exercise: ActiveExercise): { done: number; total: number; complete: boolean } {
  const working = exercise.sets.filter(set => !set.is_warmup)
  const done = working.filter(set => set.completed).length
  return { done, total: working.length, complete: working.length > 0 && done === working.length }
}

export function workoutProgress(workout: ActiveWorkout): { done: number; total: number } {
  return {
    done: workout.exercises.filter(entry => exerciseTally(entry).complete).length,
    total: workout.exercises.length,
  }
}

export function firstOpenExerciseId(exercises: ActiveExercise[]): string | null {
  const withWorkLeft = exercises.find(entry => !exerciseTally(entry).complete)
  return (withWorkLeft ?? exercises[0])?.clientId ?? null
}

// What the rest bar says comes next: the following exercise with work left,
// but only once the current exercise is finished.
export function restLabelAfter(exercises: ActiveExercise[], exerciseIndex: number): string | null {
  const current = exercises[exerciseIndex]
  if (!current || !exerciseTally(current).complete) return null
  const next = exercises.slice(exerciseIndex + 1).find(entry => !exerciseTally(entry).complete)
  return next?.exercise.name ?? null
}

// ─── Finishing ───────────────────────────────────────────────────────────────

export type FinishSituation = { kind: 'empty' } | { kind: 'ready' } | { kind: 'unticked'; count: number }

// A set "has data" once the lifter typed a weight or reps; only those count.
export function finishSituation(workout: ActiveWorkout): FinishSituation {
  const sets = workout.exercises.flatMap(entry => entry.sets)
  const count = sets.filter(set => !set.completed && (set.weight_kg > 0 || set.reps > 0)).length
  // Nothing ticked and nothing typed: finishing would save an empty workout.
  if (count === 0 && !sets.some(set => set.completed)) return { kind: 'empty' }
  return count > 0 ? { kind: 'unticked', count } : { kind: 'ready' }
}

export type FinishPayload = Omit<ActiveWorkout, 'openExerciseId' | 'rest' | 'exercises'> & {
  exercises: Omit<ActiveExercise, 'clientId'>[]
}

// clientId, the open card and the rest timer only exist on the phone.
export function toFinishPayload(workout: ActiveWorkout): FinishPayload {
  const { openExerciseId: _open, rest: _rest, exercises, ...rest } = workout
  return { ...rest, exercises: exercises.map(({ clientId: _id, ...entry }) => entry) }
}

// ─── Upgrading a saved session ───────────────────────────────────────────────

const SetSchema = z.object({
  id: z.string(),
  set_number: z.number(),
  weight_kg: z.number(),
  reps: z.number(),
  rpe: z.number().nullable().catch(null),
  is_warmup: z.boolean().catch(false),
  completed: z.boolean().catch(false),
  saved: z.boolean().catch(false),
  rpe_source: z.enum(['entered', 'prompt']).nullable().optional().catch(null),
  suggested_weight_kg: z.number().nullable().optional().catch(null),
  suggested_reps: z.number().int().nullable().optional().catch(null),
})

const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  muscle_group: z.string().catch(''),
  secondary_muscles: z.array(z.string()).nullable().catch(null),
  equipment: z.string().nullable().catch(null),
  movement_pattern: z.string().catch(''),
  is_custom: z.boolean().nullable().catch(null),
  created_by: z.string().nullable().catch(null),
  created_at: z.string().nullable().catch(null),
  youtube_video_id: z.string().nullable().catch(null),
})

const ActiveExerciseSchema = z.object({
  clientId: z.string().optional(),
  workout_exercise_id: z.string().nullable().catch(null),
  exercise: ExerciseSchema,
  sets: z.array(SetSchema),
  order_index: z.number(),
  rest_seconds: z.number().optional(),
  superset_group: z.string().optional(),
  progression_model: z.enum(['double', 'rep_sum']).optional(),
  rep_sum_target: z.number().nullable().optional(),
})

const ActiveWorkoutSchema = z.object({
  id: z.string().nullable().catch(null),
  title: z.string(),
  started_at: z.union([z.string(), z.date()]).transform(value => new Date(value)),
  exercises: z.array(ActiveExerciseSchema),
  routine_id: z.string().optional(),
  has_routine_been_modified: z.boolean().optional(),
  bodyweight_kg: z.number().nullable().optional(),
})

// The server action receives this over the wire, so it is checked like any
// other external input. Fields only the phone tracks (clientId) are dropped.
export function parseFinishPayload(input: unknown): FinishPayload | null {
  const workout = ActiveWorkoutSchema.safeParse(input)
  if (!workout.success || Number.isNaN(workout.data.started_at.getTime())) return null
  const exercises = workout.data.exercises.map(({ clientId: _id, ...entry }) => entry)
  return { ...workout.data, exercises }
}

const PersistedSchema = z.object({
  activeWorkout: z.unknown(),
  userBodyweight: z.number().nullable().catch(null),
  bodyweightLogged: z.boolean().nullable().catch(null),
})

export interface PersistedSession {
  activeWorkout: ActiveWorkout | null
  userBodyweight: number | null
  bodyweightLogged: boolean | null
}

// Version 0 had no clientId, open card or rest timer, and stored started_at
// as a string. A saved session that can't be read is dropped, never thrown.
export function migrateActiveWorkout(persisted: unknown, _fromVersion: number): PersistedSession {
  const root = PersistedSchema.safeParse(persisted)
  if (!root.success) return { activeWorkout: null, userBodyweight: null, bodyweightLogged: null }

  const workout = ActiveWorkoutSchema.safeParse(root.data.activeWorkout)
  const base = { userBodyweight: root.data.userBodyweight, bodyweightLogged: root.data.bodyweightLogged }
  if (!workout.success || Number.isNaN(workout.data.started_at.getTime())) return { ...base, activeWorkout: null }

  const exercises: ActiveExercise[] = workout.data.exercises.map(entry => ({ ...entry, clientId: entry.clientId ?? newClientId() }))
  return {
    ...base,
    activeWorkout: { ...workout.data, exercises, openExerciseId: firstOpenExerciseId(exercises), rest: null },
  }
}
