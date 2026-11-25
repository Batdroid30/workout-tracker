import { describe, it, expect, vi } from 'vitest'
import { buildProposal } from './propose-tools'
import { CoachProposalSchema, routineStamp, type RoutineWithExercises } from '@/lib/coach/proposals'
import type { Exercise } from '@/types/database'

// propose-tools reuses isUsableBy from read-tools, which imports the data layer.
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
  makeExercise({ id: 'mine', name: 'My Curl', is_custom: true, created_by: USER_ID }),
  makeExercise({ id: 'theirs', name: 'Their Secret Lift', is_custom: true, created_by: 'someone-else' }),
]

const PUSH: RoutineWithExercises = {
  id: 'push',
  title: 'Push',
  exercises: [
    { exercise_id: 'pushdown', name: 'Tricep Pushdown', target_sets: 3, target_reps: 12, order_index: 1 },
    { exercise_id: 'bench', name: 'Bench Press', target_sets: 4, target_reps: 8, order_index: 0 },
  ],
}

const WORLD = { library: LIBRARY, userId: USER_ID, routines: [PUSH] }

const NEW_EXERCISE = {
  name: 'Jefferson Curl',
  muscle_group: 'back',
  secondary_muscles: ['hamstrings'],
  equipment: 'barbell',
  movement_pattern: 'hinge',
}

function expectProposal(result: ReturnType<typeof buildProposal>) {
  if (!('proposal' in result)) throw new Error(`Expected a proposal, got error: ${result.error}`)
  expect(CoachProposalSchema.safeParse(result.proposal).success).toBe(true)
  expect(result.proposal.status).toBe('pending')
  return result.proposal
}

function expectError(result: ReturnType<typeof buildProposal>): string {
  if (!('error' in result)) throw new Error('Expected an error')
  return result.error
}

describe('propose_swap', () => {
  const validSwap = {
    routine_id: 'push', position: 2, exercise_id: 'pushdown',
    new_exercise_id: 'overhead', reason: 'Longer stretch on the triceps',
  }

  it('builds a swap that keeps the old targets and stamps the routine', () => {
    const proposal = expectProposal(buildProposal('propose_swap', validSwap, WORLD))
    expect(proposal).toMatchObject({
      kind: 'swap', label: 'Swap in Push', routine_title: 'Push', position: 2,
      old_name: 'Tricep Pushdown', new_name: 'Overhead Cable Extension',
      target_sets: 3, target_reps: 12,
    })
    expect(proposal.kind === 'swap' && proposal.stamp).toEqual(routineStamp(PUSH.exercises))
  })

  it('lets the model override the targets', () => {
    const proposal = expectProposal(buildProposal('propose_swap', { ...validSwap, target_sets: 4, target_reps: 10 }, WORLD))
    expect(proposal).toMatchObject({ target_sets: 4, target_reps: 10 })
  })

  it('rejects a routine the lifter does not have', () => {
    expect(expectError(buildProposal('propose_swap', { ...validSwap, routine_id: 'nope' }, WORLD))).toContain('nope')
  })

  it('rejects a position whose exercise does not match', () => {
    const error = expectError(buildProposal('propose_swap', { ...validSwap, position: 1 }, WORLD))
    expect(error).toContain('Position 1')
    expect(error).toContain('Bench Press')
  })

  it('rejects a position outside the routine', () => {
    expect(expectError(buildProposal('propose_swap', { ...validSwap, position: 9 }, WORLD))).toContain('position 9')
  })

  it("rejects another user's custom exercise and names it", () => {
    const error = expectError(buildProposal('propose_swap', { ...validSwap, new_exercise_id: 'theirs' }, WORLD))
    expect(error).toContain('Their Secret Lift')
  })

  it('rejects an unknown replacement id', () => {
    expect(expectError(buildProposal('propose_swap', { ...validSwap, new_exercise_id: 'ghost' }, WORLD))).toContain('ghost')
  })

  it('rejects malformed input', () => {
    expect(expectError(buildProposal('propose_swap', { routine_id: 'push' }, WORLD))).toContain('propose_swap')
  })
})

describe('propose_reorder', () => {
  const valid = { routine_id: 'push', ordered_exercise_ids: ['pushdown', 'bench'], reason: 'Triceps first' }

  it('builds a reorder with before and after names', () => {
    const proposal = expectProposal(buildProposal('propose_reorder', valid, WORLD))
    expect(proposal).toMatchObject({
      kind: 'reorder', label: 'Reorder Push',
      before: ['Bench Press', 'Tricep Pushdown'], after: ['Tricep Pushdown', 'Bench Press'],
      new_order_exercise_ids: ['pushdown', 'bench'],
    })
  })

  it.each([
    ['missing', ['bench']],
    ['extra', ['bench', 'pushdown', 'overhead']],
    ['duplicate', ['bench', 'bench']],
  ])('rejects an order with a %s exercise', (_label, ids) => {
    expect(expectError(buildProposal('propose_reorder', { ...valid, ordered_exercise_ids: ids }, WORLD))).toContain('every exercise')
  })

  it('rejects an unknown routine', () => {
    expect(expectError(buildProposal('propose_reorder', { ...valid, routine_id: 'nope' }, WORLD))).toContain('nope')
  })
})

describe('propose_new_exercise', () => {
  it('builds a library-only proposal', () => {
    const proposal = expectProposal(buildProposal('propose_new_exercise', NEW_EXERCISE, WORLD))
    expect(proposal).toMatchObject({ kind: 'new_exercise', label: 'New exercise', add_to: null })
  })

  it('builds a proposal that also adds to a routine', () => {
    const proposal = expectProposal(buildProposal(
      'propose_new_exercise',
      { ...NEW_EXERCISE, add_to: { routine_id: 'push', target_sets: 3, target_reps: 10 } },
      WORLD,
    ))
    expect(proposal).toMatchObject({ label: 'New exercise · add to Push' })
    expect(proposal.kind === 'new_exercise' && proposal.add_to?.stamp).toEqual(routineStamp(PUSH.exercises))
  })

  it('names the existing exercise when the name duplicates one', () => {
    const error = expectError(buildProposal('propose_new_exercise', { ...NEW_EXERCISE, name: 'bench-press' }, WORLD))
    expect(error).toContain('Bench Press')
    expect(error).toContain('bench')
  })

  it("ignores other users' custom exercises when checking duplicates", () => {
    expectProposal(buildProposal('propose_new_exercise', { ...NEW_EXERCISE, name: 'Their Secret Lift' }, WORLD))
  })

  it('enforces the create-exercise limits', () => {
    expect(expectError(buildProposal('propose_new_exercise', { ...NEW_EXERCISE, name: '   ' }, WORLD))).toContain('propose_new_exercise')
    expect(expectError(buildProposal('propose_new_exercise', { ...NEW_EXERCISE, name: 'x'.repeat(101) }, WORLD))).toContain('propose_new_exercise')
    expect(expectError(buildProposal('propose_new_exercise', { ...NEW_EXERCISE, movement_pattern: 'fly' }, WORLD))).toContain('propose_new_exercise')
  })

  it('rejects add_to for an unknown routine', () => {
    const input = { ...NEW_EXERCISE, add_to: { routine_id: 'nope', target_sets: 3, target_reps: 10 } }
    expect(expectError(buildProposal('propose_new_exercise', input, WORLD))).toContain('nope')
  })
})

describe('propose_routine', () => {
  it('builds a routine mixing library and new exercises', () => {
    const proposal = expectProposal(buildProposal('propose_routine', {
      title: 'Pull', notes: 'Heavy',
      exercises: [
        { exercise_id: 'bench', target_sets: 3, target_reps: 8 },
        { new_exercise: NEW_EXERCISE, target_sets: 2, target_reps: 10 },
      ],
    }, WORLD))
    expect(proposal).toMatchObject({ kind: 'routine', label: 'New routine', title: 'Pull', notes: 'Heavy' })
    expect(proposal.kind === 'routine' && proposal.exercises.map(entry => entry.name)).toEqual(['Bench Press', 'Jefferson Curl'])
  })

  it("rejects another user's custom exercise", () => {
    const input = { title: 'Pull', exercises: [{ exercise_id: 'theirs', target_sets: 3, target_reps: 8 }] }
    expect(expectError(buildProposal('propose_routine', input, WORLD))).toContain('Their Secret Lift')
  })

  it('rejects a new exercise that duplicates the library', () => {
    const input = {
      title: 'Pull',
      exercises: [{ new_exercise: { ...NEW_EXERCISE, name: 'Bench Press' }, target_sets: 3, target_reps: 8 }],
    }
    expect(expectError(buildProposal('propose_routine', input, WORLD))).toContain('Bench Press')
  })

  it('rejects an empty routine', () => {
    expect(expectError(buildProposal('propose_routine', { title: 'Pull', exercises: [] }, WORLD))).toContain('propose_routine')
  })
})

describe('propose_split', () => {
  const newRoutineDay = {
    kind: 'new_routine', title: 'Legs',
    exercises: [{ exercise_id: 'bench', target_sets: 3, target_reps: 8 }],
  }

  it('builds a split from owned, new and rest days', () => {
    const proposal = expectProposal(buildProposal('propose_split', {
      name: 'PPL', days: [{ kind: 'routine', routine_id: 'push' }, newRoutineDay, { kind: 'rest' }],
    }, WORLD))
    expect(proposal).toMatchObject({
      kind: 'split', label: 'New split', name: 'PPL',
      days: [{ kind: 'routine', routine_id: 'push', title: 'Push' }, { kind: 'new_routine', title: 'Legs' }, { kind: 'rest' }],
    })
  })

  it('rejects a routine id the lifter does not own', () => {
    const error = expectError(buildProposal('propose_split', { name: 'PPL', days: [{ kind: 'routine', routine_id: 'nope' }] }, WORLD))
    expect(error).toContain('nope')
  })

  it('rejects a split with no routine day', () => {
    expect(expectError(buildProposal('propose_split', { name: 'PPL', days: [{ kind: 'rest' }] }, WORLD))).toContain('at least one')
  })

  it('rejects more than 14 days', () => {
    const days = Array.from({ length: 15 }, () => ({ kind: 'routine', routine_id: 'push' }))
    expect(expectError(buildProposal('propose_split', { name: 'PPL', days }, WORLD))).toContain('14')
  })

  it('rejects a new-routine day with a duplicate new exercise', () => {
    const day = { kind: 'new_routine', title: 'Legs', exercises: [{ new_exercise: { ...NEW_EXERCISE, name: 'Bench Press' }, target_sets: 3, target_reps: 8 }] }
    expect(expectError(buildProposal('propose_split', { name: 'PPL', days: [day] }, WORLD))).toContain('Bench Press')
  })
})
