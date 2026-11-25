import { describe, it, expect } from 'vitest'
import { searchExercises, describeRoutines } from './read-tools'
import type { Exercise } from '@/types/database'
import type { RoutineWithExercises } from '@/lib/coach/proposals'
import type { SplitWithItems } from '@/lib/data/splits'

function makeExercise(overrides: Partial<Exercise> & { name: string }): Exercise {
  return {
    id: overrides.name,
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
  makeExercise({ name: 'Tricep Pushdown (Cable)', muscle_group: 'arms', equipment: 'cable' }),
  makeExercise({ name: 'Bench Press', muscle_group: 'chest' }),
  makeExercise({ name: 'Incline Bench Press', muscle_group: 'chest' }),
  makeExercise({ name: 'Dumbbell Bench Press', muscle_group: 'chest', equipment: 'dumbbell' }),
  makeExercise({ name: 'Bench', muscle_group: 'chest' }),
  makeExercise({ name: 'Lat Pulldown', muscle_group: 'back', equipment: 'cable' }),
]

describe('searchExercises', () => {
  it('matches the name case-insensitively', () => {
    const results = searchExercises(LIBRARY, { query: 'pushdown' })
    expect(results.map(r => r.name)).toEqual(['Tricep Pushdown (Cable)'])
  })

  it('combines muscle and equipment filters', () => {
    const results = searchExercises(LIBRARY, { muscle_group: 'chest', equipment: 'dumbbell' })
    expect(results.map(r => r.name)).toEqual(['Dumbbell Bench Press'])
  })

  it('ranks exact, then starts-with, then contains matches', () => {
    const results = searchExercises(LIBRARY, { query: 'bench' })
    expect(results.map(r => r.name)).toEqual([
      'Bench',
      'Bench Press',
      'Dumbbell Bench Press',
      'Incline Bench Press',
    ])
  })

  it('caps the result at the limit', () => {
    expect(searchExercises(LIBRARY, { query: 'bench' }, 2)).toHaveLength(2)
  })

  it('returns a muscle group on its own when the query is empty', () => {
    const results = searchExercises(LIBRARY, { muscle_group: 'back' })
    expect(results.map(r => r.name)).toEqual(['Lat Pulldown'])
  })

  it('returns only the fields the model needs', () => {
    const [result] = searchExercises(LIBRARY, { query: 'lat' })
    expect(Object.keys(result).sort()).toEqual(['equipment', 'id', 'muscle_group', 'name', 'secondary_muscles'])
  })
})

describe('describeRoutines', () => {
  const routines: RoutineWithExercises[] = [
    {
      id: 'r1',
      title: 'Push',
      exercises: [
        { exercise_id: 'e2', name: 'Fly', target_sets: 3, target_reps: 12, order_index: 5 },
        { exercise_id: 'e1', name: 'Bench', target_sets: 4, target_reps: 8, order_index: 2 },
      ],
    },
  ]

  it('lists exercises by position', () => {
    const { routines: described } = describeRoutines(routines, null)
    expect(described[0].exercises).toEqual([
      { position: 1, exercise_id: 'e1', name: 'Bench', target_sets: 4, target_reps: 8 },
      { position: 2, exercise_id: 'e2', name: 'Fly', target_sets: 3, target_reps: 12 },
    ])
  })

  it('has no active split when none is given', () => {
    expect(describeRoutines(routines, null).active_split).toBeNull()
  })

  it('names split days by routine title or Rest', () => {
    const split: SplitWithItems = {
      id: 's1',
      name: 'PPL',
      isActive: true,
      skip: null,
      items: [
        { id: 'i2', position: 1, routineId: null, routineTitle: null },
        { id: 'i1', position: 0, routineId: 'r1', routineTitle: 'Push' },
      ],
    }
    expect(describeRoutines(routines, split).active_split).toEqual({ name: 'PPL', days: ['Push', 'Rest'] })
  })
})
