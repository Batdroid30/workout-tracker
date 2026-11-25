import { z } from 'zod'
import { MOVEMENT_PATTERN_VALUES, MUSCLE_GROUP_VALUES } from '@/lib/exercise-values'

export type MuscleGroup = (typeof MUSCLE_GROUP_VALUES)[number]
export type MovementPattern = (typeof MOVEMENT_PATTERN_VALUES)[number]

// ── Schemas (single source of truth; types are inferred) ─────────────────────

const NewExerciseSchema = z.object({
  name:              z.string(),
  muscle_group:      z.enum(MUSCLE_GROUP_VALUES),
  secondary_muscles: z.array(z.enum(MUSCLE_GROUP_VALUES)),
  equipment:         z.string().nullable(),
  movement_pattern:  z.enum(MOVEMENT_PATTERN_VALUES),
})

const RoutineStampSchema = z.array(z.object({
  exercise_id: z.string(),
  target_sets: z.number(),
  target_reps: z.number(),
}))

const ExerciseEntrySchema = z.union([
  z.object({ exercise_id: z.string(), target_sets: z.number(), target_reps: z.number() }),
  z.object({ new_exercise: NewExerciseSchema, target_sets: z.number(), target_reps: z.number() }),
])

const NamedExerciseEntrySchema = z.union([
  z.object({ name: z.string(), exercise_id: z.string(), target_sets: z.number(), target_reps: z.number() }),
  z.object({ name: z.string(), new_exercise: NewExerciseSchema, target_sets: z.number(), target_reps: z.number() }),
])

const proposalBase = {
  id:     z.string(),
  status: z.enum(['pending', 'applied', 'dismissed']),
  label:  z.string(),
}

const SwapProposalSchema = z.object({
  ...proposalBase,
  kind:            z.literal('swap'),
  routine_id:      z.string(),
  routine_title:   z.string(),
  position:        z.number(),
  old_exercise_id: z.string(),
  old_name:        z.string(),
  new_exercise_id: z.string(),
  new_name:        z.string(),
  target_sets:     z.number(),
  target_reps:     z.number(),
  reason:          z.string(),
  stamp:           RoutineStampSchema,
})

const ReorderProposalSchema = z.object({
  ...proposalBase,
  kind:                   z.literal('reorder'),
  routine_id:             z.string(),
  routine_title:          z.string(),
  before:                 z.array(z.string()),
  after:                  z.array(z.string()),
  new_order_exercise_ids: z.array(z.string()),
  reason:                 z.string(),
  stamp:                  RoutineStampSchema,
})

const NewExerciseProposalSchema = z.object({
  ...proposalBase,
  kind:     z.literal('new_exercise'),
  exercise: NewExerciseSchema,
  add_to:   z.object({
    routine_id:    z.string(),
    routine_title: z.string(),
    target_sets:   z.number(),
    target_reps:   z.number(),
    stamp:         RoutineStampSchema,
  }).nullable(),
})

const RoutineProposalSchema = z.object({
  ...proposalBase,
  kind:      z.literal('routine'),
  title:     z.string(),
  notes:     z.string().nullable(),
  exercises: z.array(NamedExerciseEntrySchema),
})

const SplitDaySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('routine'), routine_id: z.string(), title: z.string() }),
  z.object({ kind: z.literal('new_routine'), title: z.string(), exercises: z.array(NamedExerciseEntrySchema) }),
  z.object({ kind: z.literal('rest') }),
])

const SplitProposalSchema = z.object({
  ...proposalBase,
  kind: z.literal('split'),
  name: z.string(),
  days: z.array(SplitDaySchema),
})

export const CoachProposalSchema = z.discriminatedUnion('kind', [
  SwapProposalSchema,
  ReorderProposalSchema,
  NewExerciseProposalSchema,
  RoutineProposalSchema,
  SplitProposalSchema,
])

// ── Types ─────────────────────────────────────────────────────────────────────

export type NewExercise   = z.infer<typeof NewExerciseSchema>
export type ExerciseEntry = z.infer<typeof ExerciseEntrySchema>
export type RoutineStamp  = z.infer<typeof RoutineStampSchema>
export type CoachProposal = z.infer<typeof CoachProposalSchema>

export type RoutineWithExercises = {
  id: string
  title: string
  exercises: {
    exercise_id: string
    name: string
    target_sets: number
    target_reps: number
    order_index: number
  }[]
}

// ── Name matching ─────────────────────────────────────────────────────────────

// Alphanumerics only so "Push-down (Cable)" and "pushdown cable" count as the
// same exercise — the model and the lifter rarely agree on punctuation.
export function normaliseExerciseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function findDuplicateExercise(
  name: string,
  library: { id: string; name: string }[],
): { id: string; name: string } | null {
  const wanted = normaliseExerciseName(name)
  return library.find(exercise => normaliseExerciseName(exercise.name) === wanted) ?? null
}

// ── Stamps ────────────────────────────────────────────────────────────────────

export function routineStamp(
  rows: { exercise_id: string; target_sets: number; target_reps: number; order_index: number }[],
): RoutineStamp {
  return [...rows]
    .sort((a, b) => a.order_index - b.order_index)
    .map(({ exercise_id, target_sets, target_reps }) => ({ exercise_id, target_sets, target_reps }))
}

// A proposal is only safe to apply to the routine it was drafted against.
export function isStale(stamp: RoutineStamp, current: RoutineStamp): boolean {
  if (stamp.length !== current.length) return true
  return stamp.some((entry, index) => {
    const other = current[index]
    return entry.exercise_id !== other.exercise_id
      || entry.target_sets !== other.target_sets
      || entry.target_reps !== other.target_reps
  })
}

// ── History lines ─────────────────────────────────────────────────────────────

type ProposalKind = CoachProposal['kind']

const PROPOSAL_SUMMARIES: { [K in ProposalKind]: (p: Extract<CoachProposal, { kind: K }>) => string } = {
  swap:         p => `swap in ${p.routine_title}, ${p.old_name} → ${p.new_name}`,
  reorder:      p => `reorder in ${p.routine_title}`,
  new_exercise: p => `new exercise ${p.exercise.name}`,
  routine:      p => `routine ${p.title}`,
  split:        p => `split ${p.name}`,
}

// Fed back to the model on later turns so it knows what it already proposed.
export function proposalHistoryLine(proposal: CoachProposal): string {
  const summarise = PROPOSAL_SUMMARIES[proposal.kind] as (p: CoachProposal) => string
  return `[Proposed: ${summarise(proposal)} · ${proposal.status}]`
}
