import { findDuplicateExercise, isStale, routineStamp, type CoachProposal, type NewExercise, type RoutineStamp } from '@/lib/coach/proposals'
import { isUsableBy } from '@/lib/coach/tools/read-tools'
import type { CreateRoutineInput } from '@/lib/data/routines'
import type { SplitInput } from '@/app/(app)/routines/split-schemas'
import type { Exercise } from '@/types/database'

export interface RoutineRow {
  exercise_id: string
  target_sets: number
  target_reps: number
  order_index: number
  progression_model: 'double' | 'rep_sum'
  rep_sum_target: number | null
}

export interface CurrentRoutine { title: string; notes: string | null; rows: RoutineRow[] }

// Every read and write applyProposal needs, injected so the apply rules are
// tested with fakes. Each dep is scoped to `userId` by its implementation;
// getRoutine returns null for a routine the caller doesn't own.
export interface ApplyDeps {
  userId: string
  getRoutine(routineId: string): Promise<CurrentRoutine | null>
  getLibrary(): Promise<Exercise[]>
  updateRoutine(routineId: string, input: CreateRoutineInput): Promise<void>
  createRoutine(input: CreateRoutineInput): Promise<{ id: string }>
  deleteRoutine(routineId: string): Promise<void>
  createExercise(exercise: NewExercise): Promise<{ id: string }>
  deleteExercise(exerciseId: string): Promise<void>
  saveSplit(input: SplitInput): Promise<{ id: string }>
  deleteSplit(splitId: string): Promise<void>
  setActiveSplit(splitId: string): Promise<void>
}

export type ApplyResult =
  | { status: 'applied'; href: string }
  | { status: 'stale'; message: string }
  | { status: 'already_applied' }
  | { status: 'failed'; message: string }

type ProposalOf<K extends CoachProposal['kind']> = Extract<CoachProposal, { kind: K }>
type NamedEntry = ProposalOf<'routine'>['exercises'][number]
type RoutineExerciseInput = CreateRoutineInput['exercises'][number]

// Thrown by the checks that run before any write, so each applier reads as its
// happy path. Caught at the applyProposal boundary.
class ApplyRefusal extends Error {
  constructor(public readonly result: Extract<ApplyResult, { status: 'stale' | 'failed' }>) {
    super(result.message)
  }
}

function stale(routineTitle: string): ApplyRefusal {
  return new ApplyRefusal({ status: 'stale', message: `${routineTitle} changed since; ask again.` })
}

function refuse(message: string): ApplyRefusal {
  return new ApplyRefusal({ status: 'failed', message })
}

const routineHref = (routineId: string) => `/routines/${routineId}/edit`

// ── Checks (no writes) ───────────────────────────────────────────────────────

function sortedRows(routine: CurrentRoutine): RoutineRow[] {
  return [...routine.rows].sort((a, b) => a.order_index - b.order_index)
}

// The stamp is the routine as the coach saw it; any edit since, including an
// earlier proposal being confirmed, means this one no longer fits.
async function loadUnchangedRoutine(
  deps: ApplyDeps,
  target: { routine_id: string; routine_title: string; stamp: RoutineStamp },
): Promise<CurrentRoutine> {
  const routine = await deps.getRoutine(target.routine_id)
  if (!routine || isStale(target.stamp, routineStamp(routine.rows))) throw stale(target.routine_title)
  return routine
}

async function loadOwnedRoutine(deps: ApplyDeps, routineId: string, title: string): Promise<CurrentRoutine> {
  const routine = await deps.getRoutine(routineId)
  if (!routine) throw stale(title)
  return routine
}

function assertUsable(library: Exercise[], userId: string, exerciseId: string, name: string): void {
  const exercise = library.find(candidate => candidate.id === exerciseId)
  if (!exercise || !isUsableBy(exercise, userId)) {
    throw refuse(`${name} isn't in your library any more; ask again.`)
  }
}

// The library may have changed since the proposal, so duplicates are checked
// again right before creating anything.
function assertNameFree(library: Exercise[], userId: string, exercise: NewExercise): void {
  const usable = library.filter(candidate => isUsableBy(candidate, userId))
  const duplicate = findDuplicateExercise(exercise.name, usable)
  if (duplicate) {
    throw refuse(`${duplicate.name} is already in your library, so ${exercise.name} wasn't created; ask again.`)
  }
}

async function checkEntries(deps: ApplyDeps, entries: NamedEntry[]): Promise<void> {
  const library = await deps.getLibrary()
  for (const entry of entries) {
    if ('exercise_id' in entry) assertUsable(library, deps.userId, entry.exercise_id, entry.name)
    else assertNameFree(library, deps.userId, entry.new_exercise)
  }
}

// ── Rollback ─────────────────────────────────────────────────────────────────

interface CreatedRecords { exerciseIds: string[]; routineIds: string[]; splitIds: string[] }

async function deleteQuietly(kind: string, id: string, remove: (id: string) => Promise<void>): Promise<void> {
  try {
    await remove(id)
  } catch (error: unknown) {
    console.error(`Coach apply rollback: could not delete ${kind} ${id}`, error)
  }
}

// Splits first, then routines, then exercises: each references the next.
async function rollback(created: CreatedRecords, deps: ApplyDeps): Promise<void> {
  for (const id of created.splitIds) await deleteQuietly('split', id, deps.deleteSplit)
  for (const id of created.routineIds) await deleteQuietly('routine', id, deps.deleteRoutine)
  for (const id of created.exerciseIds) await deleteQuietly('exercise', id, deps.deleteExercise)
}

// Multi-step changes are all-or-nothing: on any failure, everything this
// confirm created is deleted before the error moves on.
async function withRollback(deps: ApplyDeps, work: (created: CreatedRecords) => Promise<ApplyResult>): Promise<ApplyResult> {
  const created: CreatedRecords = { exerciseIds: [], routineIds: [], splitIds: [] }
  try {
    return await work(created)
  } catch (error: unknown) {
    await rollback(created, deps)
    throw error
  }
}

// ── Writes ───────────────────────────────────────────────────────────────────

function keepRow({ exercise_id, target_sets, target_reps, progression_model, rep_sum_target }: RoutineRow): RoutineExerciseInput {
  return { exercise_id, target_sets, target_reps, progression_model, rep_sum_target }
}

async function createExercise(deps: ApplyDeps, exercise: NewExercise, created: CreatedRecords): Promise<string> {
  const { id } = await deps.createExercise(exercise)
  created.exerciseIds.push(id)
  return id
}

async function createRoutine(deps: ApplyDeps, input: CreateRoutineInput, created: CreatedRecords): Promise<string> {
  const { id } = await deps.createRoutine(input)
  created.routineIds.push(id)
  return id
}

async function resolveEntries(deps: ApplyDeps, entries: NamedEntry[], created: CreatedRecords): Promise<RoutineExerciseInput[]> {
  const resolved: RoutineExerciseInput[] = []
  for (const entry of entries) {
    const exerciseId = 'exercise_id' in entry ? entry.exercise_id : await createExercise(deps, entry.new_exercise, created)
    resolved.push({ exercise_id: exerciseId, target_sets: entry.target_sets, target_reps: entry.target_reps })
  }
  return resolved
}

function routineUpdate(routine: CurrentRoutine, exercises: RoutineExerciseInput[]): CreateRoutineInput {
  return { title: routine.title, notes: routine.notes ?? undefined, exercises }
}

// ── Appliers, one per kind ───────────────────────────────────────────────────

async function applySwap(proposal: ProposalOf<'swap'>, deps: ApplyDeps): Promise<ApplyResult> {
  const routine = await loadUnchangedRoutine(deps, proposal)
  const rows = sortedRows(routine)
  // Rows are re-created on every save, so position + exercise is the only
  // stable way to name the row being swapped.
  const index = proposal.position - 1
  if (rows[index]?.exercise_id !== proposal.old_exercise_id) throw stale(proposal.routine_title)
  assertUsable(await deps.getLibrary(), deps.userId, proposal.new_exercise_id, proposal.new_name)

  const exercises = rows.map((row, rowIndex) => rowIndex === index
    ? { exercise_id: proposal.new_exercise_id, target_sets: proposal.target_sets, target_reps: proposal.target_reps }
    : keepRow(row))
  await deps.updateRoutine(proposal.routine_id, routineUpdate(routine, exercises))
  return { status: 'applied', href: routineHref(proposal.routine_id) }
}

async function applyReorder(proposal: ProposalOf<'reorder'>, deps: ApplyDeps): Promise<ApplyResult> {
  const routine = await loadUnchangedRoutine(deps, proposal)
  const rowById = new Map(routine.rows.map(row => [row.exercise_id, row]))
  const order = proposal.new_order_exercise_ids
  const isPermutation = order.length === rowById.size && new Set(order).size === order.length && order.every(id => rowById.has(id))
  if (!isPermutation) throw refuse(`The new order for ${proposal.routine_title} doesn't match the routine; ask again.`)

  const exercises = order.flatMap(id => {
    const row = rowById.get(id)
    return row ? [keepRow(row)] : []
  })
  await deps.updateRoutine(proposal.routine_id, routineUpdate(routine, exercises))
  return { status: 'applied', href: routineHref(proposal.routine_id) }
}

async function applyNewExercise(proposal: ProposalOf<'new_exercise'>, deps: ApplyDeps): Promise<ApplyResult> {
  const { add_to: addTo } = proposal
  const routine = addTo ? await loadUnchangedRoutine(deps, addTo) : null
  assertNameFree(await deps.getLibrary(), deps.userId, proposal.exercise)

  return withRollback(deps, async created => {
    const exerciseId = await createExercise(deps, proposal.exercise, created)
    if (!addTo || !routine) return { status: 'applied', href: `/exercises/${exerciseId}` }

    const added = { exercise_id: exerciseId, target_sets: addTo.target_sets, target_reps: addTo.target_reps }
    const exercises = [...sortedRows(routine).map(keepRow), added]
    await deps.updateRoutine(addTo.routine_id, routineUpdate(routine, exercises))
    return { status: 'applied', href: routineHref(addTo.routine_id) }
  })
}

async function applyRoutine(proposal: ProposalOf<'routine'>, deps: ApplyDeps): Promise<ApplyResult> {
  await checkEntries(deps, proposal.exercises)

  return withRollback(deps, async created => {
    const exercises = await resolveEntries(deps, proposal.exercises, created)
    const routineId = await createRoutine(deps, { title: proposal.title, notes: proposal.notes ?? undefined, exercises }, created)
    return { status: 'applied', href: routineHref(routineId) }
  })
}

type SplitDay = ProposalOf<'split'>['days'][number]

async function checkSplitDays(deps: ApplyDeps, days: SplitDay[]): Promise<void> {
  for (const day of days) {
    if (day.kind === 'routine') await loadOwnedRoutine(deps, day.routine_id, day.title)
  }
  await checkEntries(deps, days.flatMap(day => day.kind === 'new_routine' ? day.exercises : []))
}

async function resolveSplitDay(deps: ApplyDeps, day: SplitDay, created: CreatedRecords): Promise<string | null> {
  if (day.kind === 'rest') return null
  if (day.kind === 'routine') return day.routine_id
  const exercises = await resolveEntries(deps, day.exercises, created)
  return createRoutine(deps, { title: day.title, exercises }, created)
}

async function applySplit(proposal: ProposalOf<'split'>, deps: ApplyDeps): Promise<ApplyResult> {
  await checkSplitDays(deps, proposal.days)

  return withRollback(deps, async created => {
    const items: SplitInput['items'] = []
    for (const day of proposal.days) items.push({ routineId: await resolveSplitDay(deps, day, created) })

    const { id: splitId } = await deps.saveSplit({ name: proposal.name, items })
    created.splitIds.push(splitId)
    await deps.setActiveSplit(splitId)
    return { status: 'applied', href: `/routines/split/${splitId}` }
  })
}

const APPLIERS: { [K in CoachProposal['kind']]: (proposal: ProposalOf<K>, deps: ApplyDeps) => Promise<ApplyResult> } = {
  swap:         applySwap,
  reorder:      applyReorder,
  new_exercise: applyNewExercise,
  routine:      applyRoutine,
  split:        applySplit,
}

const FAILURE_MESSAGES: { [K in CoachProposal['kind']]: (proposal: ProposalOf<K>) => string } = {
  swap:         p => `Couldn't update ${p.routine_title}; try again.`,
  reorder:      p => `Couldn't update ${p.routine_title}; try again.`,
  new_exercise: p => `Couldn't create ${p.exercise.name}; try again.`,
  routine:      p => `Couldn't create ${p.title}; try again.`,
  split:        p => `Couldn't create ${p.name}; try again.`,
}

// ── Entry point ──────────────────────────────────────────────────────────────

// The only path from a coach proposal to the lifter's data. Checks run before
// any write; a stale or refused proposal changes nothing.
export async function applyProposal(proposal: CoachProposal, deps: ApplyDeps): Promise<ApplyResult> {
  if (proposal.status === 'applied') return { status: 'already_applied' }
  if (proposal.status === 'dismissed') return { status: 'failed', message: 'You passed on this one; ask again.' }

  try {
    const apply = APPLIERS[proposal.kind] as (proposal: CoachProposal, deps: ApplyDeps) => Promise<ApplyResult>
    return await apply(proposal, deps)
  } catch (error: unknown) {
    if (error instanceof ApplyRefusal) return error.result
    console.error(`Coach apply failed for ${proposal.kind} proposal ${proposal.id}:`, error)
    const describe = FAILURE_MESSAGES[proposal.kind] as (proposal: CoachProposal) => string
    return { status: 'failed', message: describe(proposal) }
  }
}
