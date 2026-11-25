import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyProposal, type ApplyDeps, type CurrentRoutine, type RoutineRow } from './apply-proposal'
import { routineStamp, type CoachProposal, type NewExercise } from '@/lib/coach/proposals'
import type { Exercise } from '@/types/database'

// apply-proposal reuses isUsableBy from read-tools, which imports the data layer.
vi.mock('@/lib/data/exercises', () => ({ getExercises: vi.fn() }))
vi.mock('@/lib/data/routines', () => ({ getRoutines: vi.fn() }))
vi.mock('@/lib/data/splits', () => ({ getSplits: vi.fn() }))

const USER_ID = 'user-1'

function makeExercise(overrides: Partial<Exercise> & { id: string; name: string }): Exercise {
  return {
    muscle_group: 'chest',
    secondary_muscles: null,
    equipment: 'barbell',
    movement_pattern: 'push',
    is_custom: false,
    created_by: null,
    created_at: null,
    youtube_video_id: null,
    ...overrides,
  }
}

const LIBRARY: Exercise[] = [
  makeExercise({ id: 'bench', name: 'Bench Press' }),
  makeExercise({ id: 'pushdown', name: 'Tricep Pushdown', muscle_group: 'triceps' }),
  makeExercise({ id: 'overhead', name: 'Overhead Cable Extension', muscle_group: 'triceps' }),
  makeExercise({ id: 'fly', name: 'Cable Fly' }),
  makeExercise({ id: 'squat', name: 'Back Squat', muscle_group: 'quads' }),
  makeExercise({ id: 'theirs', name: 'Their Secret Lift', is_custom: true, created_by: 'someone-else' }),
]

// Stored out of order on purpose: position and stamps follow order_index.
const PUSH_ROWS: RoutineRow[] = [
  { exercise_id: 'pushdown', target_sets: 3, target_reps: 12, order_index: 1, progression_model: 'double', rep_sum_target: null },
  { exercise_id: 'bench', target_sets: 4, target_reps: 8, order_index: 0, progression_model: 'rep_sum', rep_sum_target: 30 },
  { exercise_id: 'fly', target_sets: 2, target_reps: 15, order_index: 2, progression_model: 'double', rep_sum_target: null },
]

const PUSH: CurrentRoutine = { title: 'Push', notes: null, rows: PUSH_ROWS }

const JEFFERSON: NewExercise = {
  name: 'Jefferson Curl',
  muscle_group: 'hamstrings',
  secondary_muscles: [],
  equipment: 'barbell',
  movement_pattern: 'hinge',
}

const NORDIC: NewExercise = { ...JEFFERSON, name: 'Nordic Curl', equipment: null }

const WRITE_DEPS = [
  'updateRoutine', 'createRoutine', 'deleteRoutine', 'createExercise',
  'deleteExercise', 'saveSplit', 'deleteSplit', 'setActiveSplit',
] as const

interface FakeWorld {
  routines?: Record<string, CurrentRoutine>
  library?: Exercise[]
}

function makeDeps({ routines = { push: PUSH }, library = LIBRARY }: FakeWorld = {}) {
  let createdExercises = 0
  let createdRoutines = 0
  return {
    userId: USER_ID,
    getRoutine: vi.fn(async (routineId: string) => routines[routineId] ?? null),
    getLibrary: vi.fn(async () => library),
    updateRoutine: vi.fn(async () => {}),
    createRoutine: vi.fn(async () => ({ id: `routine-${++createdRoutines}` })),
    deleteRoutine: vi.fn(async () => {}),
    createExercise: vi.fn(async () => ({ id: `exercise-${++createdExercises}` })),
    deleteExercise: vi.fn(async () => {}),
    saveSplit: vi.fn(async () => ({ id: 'split-1' })),
    deleteSplit: vi.fn(async () => {}),
    setActiveSplit: vi.fn(async () => {}),
  } satisfies ApplyDeps
}

type FakeDeps = ReturnType<typeof makeDeps>

function expectNoWrites(deps: FakeDeps): void {
  for (const name of WRITE_DEPS) expect(deps[name], name).not.toHaveBeenCalled()
}

const base = { id: 'proposal-1', status: 'pending' as const, label: 'Label' }

function swapProposal(overrides: Partial<Extract<CoachProposal, { kind: 'swap' }>> = {}): CoachProposal {
  return {
    ...base,
    kind: 'swap',
    routine_id: 'push',
    routine_title: 'Push',
    position: 2,
    old_exercise_id: 'pushdown',
    old_name: 'Tricep Pushdown',
    new_exercise_id: 'overhead',
    new_name: 'Overhead Cable Extension',
    target_sets: 3,
    target_reps: 10,
    reason: 'Long head',
    stamp: routineStamp(PUSH_ROWS),
    ...overrides,
  }
}

function reorderProposal(): CoachProposal {
  return {
    ...base,
    kind: 'reorder',
    routine_id: 'push',
    routine_title: 'Push',
    before: ['Bench Press', 'Tricep Pushdown', 'Cable Fly'],
    after: ['Cable Fly', 'Bench Press', 'Tricep Pushdown'],
    new_order_exercise_ids: ['fly', 'bench', 'pushdown'],
    reason: 'Pre-exhaust',
    stamp: routineStamp(PUSH_ROWS),
  }
}

function routineProposal(exercises: Extract<CoachProposal, { kind: 'routine' }>['exercises']): CoachProposal {
  return { ...base, kind: 'routine', title: 'Posterior', notes: 'Slow eccentrics', exercises }
}

function splitProposal(days: Extract<CoachProposal, { kind: 'split' }>['days']): CoachProposal {
  return { ...base, kind: 'split', name: 'PPL', days }
}

const NEW_JEFFERSON_ENTRY = { name: 'Jefferson Curl', new_exercise: JEFFERSON, target_sets: 3, target_reps: 8 }
const NEW_NORDIC_ENTRY = { name: 'Nordic Curl', new_exercise: NORDIC, target_sets: 3, target_reps: 6 }
const SQUAT_ENTRY = { name: 'Back Squat', exercise_id: 'squat', target_sets: 5, target_reps: 5 }

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('applyProposal — swap', () => {
  it('replaces only the row at the position and keeps every other row as it was', async () => {
    const deps = makeDeps()
    const result = await applyProposal(swapProposal(), deps)

    expect(result).toEqual({ status: 'applied', href: '/routines/push/edit' })
    expect(deps.updateRoutine).toHaveBeenCalledTimes(1)
    expect(deps.updateRoutine).toHaveBeenCalledWith('push', {
      title: 'Push',
      notes: undefined,
      exercises: [
        { exercise_id: 'bench', target_sets: 4, target_reps: 8, progression_model: 'rep_sum', rep_sum_target: 30 },
        { exercise_id: 'overhead', target_sets: 3, target_reps: 10 },
        { exercise_id: 'fly', target_sets: 2, target_reps: 15, progression_model: 'double', rep_sum_target: null },
      ],
    })
  })

  it('keeps the routine notes', async () => {
    const deps = makeDeps({ routines: { push: { ...PUSH, notes: 'Heavy day' } } })
    await applyProposal(swapProposal(), deps)
    expect(deps.updateRoutine).toHaveBeenCalledWith('push', expect.objectContaining({ notes: 'Heavy day' }))
  })

  // Review Focus 1: a second proposal on a routine the first already changed.
  it('is stale with no writes when the routine changed since the proposal', async () => {
    const changed = PUSH_ROWS.map(row => row.exercise_id === 'pushdown' ? { ...row, target_reps: 10 } : row)
    const deps = makeDeps({ routines: { push: { ...PUSH, rows: changed } } })

    const result = await applyProposal(swapProposal(), deps)

    expect(result).toEqual({ status: 'stale', message: 'Push changed since; ask again.' })
    expectNoWrites(deps)
  })

  it('is stale when an earlier swap already replaced the exercise', async () => {
    const swapped = PUSH_ROWS.map(row => row.exercise_id === 'pushdown' ? { ...row, exercise_id: 'overhead' } : row)
    const deps = makeDeps({ routines: { push: { ...PUSH, rows: swapped } } })

    const result = await applyProposal(swapProposal(), deps)

    expect(result).toEqual({ status: 'stale', message: 'Push changed since; ask again.' })
    expectNoWrites(deps)
  })

  it('is stale when the row at the position no longer holds the old exercise, even if the stamp matches', async () => {
    const deps = makeDeps()
    const result = await applyProposal(swapProposal({ position: 1 }), deps)

    expect(result).toEqual({ status: 'stale', message: 'Push changed since; ask again.' })
    expectNoWrites(deps)
  })

  it('is stale when the routine is gone or not the caller\'s', async () => {
    const deps = makeDeps({ routines: {} })
    const result = await applyProposal(swapProposal(), deps)

    expect(result).toEqual({ status: 'stale', message: 'Push changed since; ask again.' })
    expectNoWrites(deps)
  })

  it('fails with no writes when the new exercise is another lifter\'s custom exercise', async () => {
    const deps = makeDeps()
    const result = await applyProposal(swapProposal({ new_exercise_id: 'theirs' }), deps)

    expect(result.status).toBe('failed')
    expectNoWrites(deps)
  })

  it('fails in plain words when the routine update throws', async () => {
    const deps = makeDeps()
    deps.updateRoutine.mockRejectedValueOnce(new Error('db down'))

    const result = await applyProposal(swapProposal(), deps)

    expect(result).toEqual({ status: 'failed', message: expect.stringContaining('Push') })
  })
})

describe('applyProposal — reorder', () => {
  it('writes the rows in the new order, each keeping its own sets, reps and progression', async () => {
    const deps = makeDeps()
    const result = await applyProposal(reorderProposal(), deps)

    expect(result).toEqual({ status: 'applied', href: '/routines/push/edit' })
    expect(deps.updateRoutine).toHaveBeenCalledWith('push', {
      title: 'Push',
      notes: undefined,
      exercises: [
        { exercise_id: 'fly', target_sets: 2, target_reps: 15, progression_model: 'double', rep_sum_target: null },
        { exercise_id: 'bench', target_sets: 4, target_reps: 8, progression_model: 'rep_sum', rep_sum_target: 30 },
        { exercise_id: 'pushdown', target_sets: 3, target_reps: 12, progression_model: 'double', rep_sum_target: null },
      ],
    })
  })

  it('is stale with no writes when the routine changed since the proposal', async () => {
    const deps = makeDeps({ routines: { push: { ...PUSH, rows: PUSH_ROWS.slice(0, 2) } } })
    const result = await applyProposal(reorderProposal(), deps)

    expect(result).toEqual({ status: 'stale', message: 'Push changed since; ask again.' })
    expectNoWrites(deps)
  })

  it('fails with no writes when the new order is not a permutation of the routine', async () => {
    const deps = makeDeps()
    const tampered = { ...reorderProposal(), new_order_exercise_ids: ['fly', 'fly', 'bench'] }

    const result = await applyProposal(tampered, deps)

    expect(result.status).toBe('failed')
    expectNoWrites(deps)
  })
})

// Review Focus 3: Confirm tapped twice, or after a reload.
describe('applyProposal — status', () => {
  it('returns already_applied with no writes for an applied proposal', async () => {
    const deps = makeDeps()
    const result = await applyProposal({ ...swapProposal(), status: 'applied' }, deps)

    expect(result).toEqual({ status: 'already_applied' })
    expectNoWrites(deps)
    expect(deps.getRoutine).not.toHaveBeenCalled()
  })

  it('refuses a dismissed proposal with no writes', async () => {
    const deps = makeDeps()
    const result = await applyProposal({ ...routineProposal([SQUAT_ENTRY]), status: 'dismissed' }, deps)

    expect(result.status).toBe('failed')
    expectNoWrites(deps)
  })
})

describe('applyProposal — new exercise', () => {
  it('creates the exercise and links to it when there is no routine to add it to', async () => {
    const deps = makeDeps()
    const proposal: CoachProposal = { ...base, kind: 'new_exercise', exercise: JEFFERSON, add_to: null }

    const result = await applyProposal(proposal, deps)

    expect(deps.createExercise).toHaveBeenCalledWith(JEFFERSON)
    expect(result).toEqual({ status: 'applied', href: '/exercises/exercise-1' })
  })

  it('appends the new exercise to the routine', async () => {
    const deps = makeDeps()
    const proposal: CoachProposal = {
      ...base,
      kind: 'new_exercise',
      exercise: JEFFERSON,
      add_to: { routine_id: 'push', routine_title: 'Push', target_sets: 3, target_reps: 8, stamp: routineStamp(PUSH_ROWS) },
    }

    const result = await applyProposal(proposal, deps)

    expect(result).toEqual({ status: 'applied', href: '/routines/push/edit' })
    const [, input] = deps.updateRoutine.mock.calls[0] as unknown as [string, { exercises: { exercise_id: string }[] }]
    expect(input.exercises.map(entry => entry.exercise_id)).toEqual(['bench', 'pushdown', 'fly', 'exercise-1'])
  })

  it('is stale with no writes when the target routine changed', async () => {
    const deps = makeDeps({ routines: { push: { ...PUSH, rows: PUSH_ROWS.slice(1) } } })
    const proposal: CoachProposal = {
      ...base,
      kind: 'new_exercise',
      exercise: JEFFERSON,
      add_to: { routine_id: 'push', routine_title: 'Push', target_sets: 3, target_reps: 8, stamp: routineStamp(PUSH_ROWS) },
    }

    const result = await applyProposal(proposal, deps)

    expect(result).toEqual({ status: 'stale', message: 'Push changed since; ask again.' })
    expectNoWrites(deps)
  })

  it('deletes the created exercise when adding it to the routine fails', async () => {
    const deps = makeDeps()
    deps.updateRoutine.mockRejectedValueOnce(new Error('db down'))
    const proposal: CoachProposal = {
      ...base,
      kind: 'new_exercise',
      exercise: JEFFERSON,
      add_to: { routine_id: 'push', routine_title: 'Push', target_sets: 3, target_reps: 8, stamp: routineStamp(PUSH_ROWS) },
    }

    const result = await applyProposal(proposal, deps)

    expect(result.status).toBe('failed')
    expect(deps.deleteExercise).toHaveBeenCalledWith('exercise-1')
  })

  it('fails with no writes when the library gained an exercise of the same name since', async () => {
    const deps = makeDeps({ library: [...LIBRARY, makeExercise({ id: 'jc', name: 'Jefferson curl' })] })
    const proposal: CoachProposal = { ...base, kind: 'new_exercise', exercise: JEFFERSON, add_to: null }

    const result = await applyProposal(proposal, deps)

    expect(result).toEqual({ status: 'failed', message: expect.stringContaining('Jefferson curl') })
    expectNoWrites(deps)
  })
})

describe('applyProposal — new routine', () => {
  it('creates the new exercises first, then the routine using their ids', async () => {
    const deps = makeDeps()
    const result = await applyProposal(routineProposal([SQUAT_ENTRY, NEW_JEFFERSON_ENTRY]), deps)

    expect(result).toEqual({ status: 'applied', href: '/routines/routine-1/edit' })
    expect(deps.createExercise).toHaveBeenCalledWith(JEFFERSON)
    expect(deps.createRoutine).toHaveBeenCalledWith({
      title: 'Posterior',
      notes: 'Slow eccentrics',
      exercises: [
        { exercise_id: 'squat', target_sets: 5, target_reps: 5 },
        { exercise_id: 'exercise-1', target_sets: 3, target_reps: 8 },
      ],
    })
    expect(deps.createExercise.mock.invocationCallOrder[0])
      .toBeLessThan(deps.createRoutine.mock.invocationCallOrder[0])
  })

  it('fails with no writes when an existing exercise is not usable by the caller', async () => {
    const deps = makeDeps()
    const theirs = { name: 'Their Secret Lift', exercise_id: 'theirs', target_sets: 3, target_reps: 8 }

    const result = await applyProposal(routineProposal([theirs, NEW_JEFFERSON_ENTRY]), deps)

    expect(result.status).toBe('failed')
    expectNoWrites(deps)
  })

  // Review Focus 5: nothing remains after a failure partway through.
  it('deletes both created exercises when creating the routine throws', async () => {
    const deps = makeDeps()
    deps.createRoutine.mockRejectedValueOnce(new Error('db down'))

    const result = await applyProposal(routineProposal([NEW_JEFFERSON_ENTRY, NEW_NORDIC_ENTRY]), deps)

    expect(result).toEqual({ status: 'failed', message: expect.any(String) })
    expect(deps.createExercise).toHaveBeenCalledTimes(2)
    expect(deps.deleteExercise).toHaveBeenCalledWith('exercise-1')
    expect(deps.deleteExercise).toHaveBeenCalledWith('exercise-2')
    expect(deps.deleteRoutine).not.toHaveBeenCalled()
  })

  it('still deletes the rest and reports failure when one clean-up delete throws', async () => {
    const deps = makeDeps()
    deps.createRoutine.mockRejectedValueOnce(new Error('db down'))
    deps.deleteExercise.mockRejectedValueOnce(new Error('also down'))

    const result = await applyProposal(routineProposal([NEW_JEFFERSON_ENTRY, NEW_NORDIC_ENTRY]), deps)

    expect(result.status).toBe('failed')
    expect(deps.deleteExercise).toHaveBeenCalledTimes(2)
  })
})

describe('applyProposal — split', () => {
  const legsDay = { kind: 'new_routine' as const, title: 'Legs', exercises: [SQUAT_ENTRY, NEW_JEFFERSON_ENTRY] }
  const pushDay = { kind: 'routine' as const, routine_id: 'push', title: 'Push' }
  const restDay = { kind: 'rest' as const }

  it('reuses existing routines, creates new ones, rests as null, then saves and activates the split', async () => {
    const deps = makeDeps()
    const result = await applyProposal(splitProposal([pushDay, legsDay, restDay]), deps)

    expect(result).toEqual({ status: 'applied', href: '/routines/split/split-1' })
    expect(deps.createRoutine).toHaveBeenCalledTimes(1)
    expect(deps.createRoutine).toHaveBeenCalledWith({
      title: 'Legs',
      exercises: [
        { exercise_id: 'squat', target_sets: 5, target_reps: 5 },
        { exercise_id: 'exercise-1', target_sets: 3, target_reps: 8 },
      ],
    })
    expect(deps.saveSplit).toHaveBeenCalledWith({
      name: 'PPL',
      items: [{ routineId: 'push' }, { routineId: 'routine-1' }, { routineId: null }],
    })
    expect(deps.setActiveSplit).toHaveBeenCalledWith('split-1')
    expect(deps.saveSplit.mock.invocationCallOrder[0])
      .toBeLessThan(deps.setActiveSplit.mock.invocationCallOrder[0])
  })

  it('is stale with no writes when a reused routine is gone or not the caller\'s', async () => {
    const deps = makeDeps({ routines: {} })
    const result = await applyProposal(splitProposal([pushDay, legsDay]), deps)

    expect(result).toEqual({ status: 'stale', message: 'Push changed since; ask again.' })
    expectNoWrites(deps)
  })

  // Review Focus 5.
  it('deletes the created exercises and routines when a later routine fails to create', async () => {
    const deps = makeDeps()
    deps.createRoutine
      .mockResolvedValueOnce({ id: 'routine-legs' })
      .mockRejectedValueOnce(new Error('db down'))
    const hamsDay = { kind: 'new_routine' as const, title: 'Hams', exercises: [NEW_NORDIC_ENTRY] }

    const result = await applyProposal(splitProposal([legsDay, hamsDay, restDay]), deps)

    expect(result.status).toBe('failed')
    expect(deps.deleteRoutine).toHaveBeenCalledWith('routine-legs')
    expect(deps.deleteExercise).toHaveBeenCalledWith('exercise-1')
    expect(deps.deleteExercise).toHaveBeenCalledWith('exercise-2')
    expect(deps.saveSplit).not.toHaveBeenCalled()
  })

  it('deletes the split, routines and exercises when activating the split fails', async () => {
    const deps = makeDeps()
    deps.setActiveSplit.mockRejectedValueOnce(new Error('db down'))

    const result = await applyProposal(splitProposal([pushDay, legsDay]), deps)

    expect(result.status).toBe('failed')
    expect(deps.deleteSplit).toHaveBeenCalledWith('split-1')
    expect(deps.deleteRoutine).toHaveBeenCalledWith('routine-1')
    expect(deps.deleteRoutine).not.toHaveBeenCalledWith('push')
    expect(deps.deleteExercise).toHaveBeenCalledWith('exercise-1')
  })
})
