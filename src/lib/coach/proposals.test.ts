import { describe, expect, it } from 'vitest'
import {
  CoachProposalSchema,
  findDuplicateExercise,
  isStale,
  normaliseExerciseName,
  proposalHistoryLine,
  routineStamp,
  type CoachProposal,
  type NewExercise,
  type RoutineStamp,
} from './proposals'

const NEW_EXERCISE: NewExercise = {
  name: 'Jefferson Curl',
  muscle_group: 'hamstrings',
  secondary_muscles: ['back'],
  equipment: null,
  movement_pattern: 'hinge',
}

const STAMP: RoutineStamp = [
  { exercise_id: 'a', target_sets: 3, target_reps: 8 },
  { exercise_id: 'b', target_sets: 3, target_reps: 10 },
]

const swapProposal: CoachProposal = {
  id: 'p1',
  status: 'dismissed',
  label: 'Swap',
  kind: 'swap',
  routine_id: 'r1',
  routine_title: 'Push',
  position: 1,
  old_exercise_id: 'b',
  old_name: 'Tricep Pushdown',
  new_exercise_id: 'c',
  new_name: 'Overhead Cable Extension',
  target_sets: 3,
  target_reps: 10,
  reason: 'Longer muscle length',
  stamp: STAMP,
}

const oneOfEachKind: CoachProposal[] = [
  swapProposal,
  {
    id: 'p2', status: 'pending', label: 'Reorder', kind: 'reorder',
    routine_id: 'r1', routine_title: 'Push',
    before: ['Bench', 'Fly'], after: ['Fly', 'Bench'],
    new_order_exercise_ids: ['b', 'a'], reason: 'Pre-exhaust', stamp: STAMP,
  },
  {
    id: 'p3', status: 'pending', label: 'New exercise', kind: 'new_exercise',
    exercise: NEW_EXERCISE,
    add_to: { routine_id: 'r1', routine_title: 'Pull', target_sets: 3, target_reps: 8, stamp: STAMP },
  },
  {
    id: 'p4', status: 'applied', label: 'Routine', kind: 'routine',
    title: 'Legs', notes: null,
    exercises: [
      { name: 'Squat', exercise_id: 'a', target_sets: 4, target_reps: 6 },
      { name: 'Jefferson Curl', new_exercise: NEW_EXERCISE, target_sets: 3, target_reps: 8 },
    ],
  },
  {
    id: 'p5', status: 'pending', label: 'Split', kind: 'split', name: 'PPL',
    days: [
      { kind: 'routine', routine_id: 'r1', title: 'Push' },
      { kind: 'new_routine', title: 'Pull', exercises: [{ name: 'Row', exercise_id: 'a', target_sets: 3, target_reps: 8 }] },
      { kind: 'rest' },
    ],
  },
]

describe('normaliseExerciseName', () => {
  it('lower-cases and keeps alphanumerics only', () => {
    expect(normaliseExerciseName('Tricep Pushdown (Cable)')).toBe('triceppushdowncable')
  })
})

describe('findDuplicateExercise', () => {
  const library = [
    { id: '1', name: 'Tricep Pushdown (Cable)' },
    { id: '2', name: 'Bench Press' },
  ]

  it('matches despite differing punctuation and case', () => {
    expect(findDuplicateExercise('tricep push-down (cable)', library)).toEqual(library[0])
  })

  it('returns null when nothing matches', () => {
    expect(findDuplicateExercise('Jefferson Curl', library)).toBeNull()
  })
})

describe('routineStamp', () => {
  it('orders rows by order_index and drops the index', () => {
    const stamp = routineStamp([
      { exercise_id: 'b', target_sets: 3, target_reps: 10, order_index: 1 },
      { exercise_id: 'a', target_sets: 3, target_reps: 8, order_index: 0 },
    ])
    expect(stamp).toEqual(STAMP)
  })
})

describe('isStale', () => {
  it('is false for an equal stamp', () => {
    expect(isStale(STAMP, STAMP.map(entry => ({ ...entry })))).toBe(false)
  })

  it('is true when sets differ', () => {
    expect(isStale(STAMP, [{ ...STAMP[0], target_sets: 4 }, STAMP[1]])).toBe(true)
  })

  it('is true when reps differ', () => {
    expect(isStale(STAMP, [STAMP[0], { ...STAMP[1], target_reps: 12 }])).toBe(true)
  })

  it('is true when order differs', () => {
    expect(isStale(STAMP, [STAMP[1], STAMP[0]])).toBe(true)
  })

  it('is true when an exercise differs', () => {
    expect(isStale(STAMP, [STAMP[0], { ...STAMP[1], exercise_id: 'z' }])).toBe(true)
  })

  it('is true when the length differs', () => {
    expect(isStale(STAMP, [STAMP[0]])).toBe(true)
  })
})

describe('proposalHistoryLine', () => {
  it('describes a dismissed swap', () => {
    expect(proposalHistoryLine(swapProposal)).toBe(
      '[Proposed: swap in Push, Tricep Pushdown → Overhead Cable Extension · dismissed]',
    )
  })
})

describe('CoachProposalSchema', () => {
  it.each(oneOfEachKind.map(proposal => [proposal.kind, proposal] as const))(
    'round-trips a %s proposal',
    (_kind, proposal) => {
      expect(CoachProposalSchema.parse(proposal)).toEqual(proposal)
    },
  )

  it('rejects an unknown kind', () => {
    expect(CoachProposalSchema.safeParse({ ...swapProposal, kind: 'teleport' }).success).toBe(false)
  })
})
