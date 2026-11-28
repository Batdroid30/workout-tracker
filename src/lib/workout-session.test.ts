import { describe, it, expect } from 'vitest'
import {
  exerciseBlocks,
  exerciseTally,
  finishSituation,
  firstOpenExerciseId,
  migrateActiveWorkout,
  moveBlock,
  restLabelAfter,
  toFinishPayload,
  workoutProgress,
} from './workout-session'
import type { ActiveExercise, ActiveSet, ActiveWorkout } from '@/types/database'

const set = (overrides: Partial<ActiveSet> = {}): ActiveSet => ({
  id: crypto.randomUUID(), set_number: 1, weight_kg: 50, reps: 8, rpe: null,
  is_warmup: false, completed: false, saved: false, ...overrides,
})

const exercise = (name: string, overrides: Partial<ActiveExercise> = {}): ActiveExercise => ({
  clientId: name,
  workout_exercise_id: null,
  exercise: {
    id: `ex-${name}`, name, muscle_group: 'chest', secondary_muscles: [], equipment: 'barbell',
    movement_pattern: 'horizontal_push', created_by: null, is_custom: false, created_at: '2026-01-01', youtube_video_id: null,
  },
  sets: [set(), set()],
  order_index: 0,
  ...overrides,
})

const names = (exercises: ActiveExercise[]) => exercises.map(e => e.clientId)

describe('exerciseBlocks', () => {
  it('groups a superset into one block in order', () => {
    const blocks = exerciseBlocks([
      exercise('A'), exercise('B', { superset_group: 'g1' }), exercise('C', { superset_group: 'g1' }), exercise('D'),
    ])
    expect(blocks.map(b => b.clientIds)).toEqual([['A'], ['B', 'C'], ['D']])
    expect(blocks[1]).toMatchObject({ id: 'g1', label: 'Superset · B + C' })
    expect(blocks[0]).toMatchObject({ id: 'A', label: 'A' })
  })
})

describe('moveBlock', () => {
  const workout = [exercise('A'), exercise('B', { superset_group: 'g1' }), exercise('C', { superset_group: 'g1' }), exercise('D')]

  it('moves a single exercise before a superset', () => {
    expect(names(moveBlock(workout, 'D', 'g1'))).toEqual(['A', 'D', 'B', 'C'])
  })

  it('moves a superset as one block and keeps it together', () => {
    expect(names(moveBlock(workout, 'g1', 'D'))).toEqual(['A', 'D', 'B', 'C'])
  })

  it('renumbers the order', () => {
    expect(moveBlock(workout, 'D', 'A').map(e => e.order_index)).toEqual([0, 1, 2, 3])
  })

  it('changes nothing when dropped on itself', () => {
    expect(names(moveBlock(workout, 'g1', 'g1'))).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('exerciseTally', () => {
  it('counts working sets only', () => {
    const tally = exerciseTally(exercise('A', {
      sets: [set({ is_warmup: true }), set({ completed: true }), set({ completed: true }), set({ completed: true })],
    }))
    expect(tally).toEqual({ done: 3, total: 3, complete: true })
  })

  it('is not complete with no working sets', () => {
    expect(exerciseTally(exercise('A', { sets: [] })).complete).toBe(false)
  })
})

describe('workoutProgress', () => {
  it('counts exercises with every working set ticked', () => {
    const done = { sets: [set({ completed: true })] }
    const workout: ActiveWorkout = {
      id: null, title: 'Push A', started_at: new Date(), openExerciseId: null, rest: null,
      exercises: [exercise('A', done), exercise('B', done), exercise('C', done), exercise('D'), exercise('E')],
    }
    expect(workoutProgress(workout)).toEqual({ done: 3, total: 5 })
  })
})

describe('firstOpenExerciseId', () => {
  it('opens the first exercise with work left', () => {
    expect(firstOpenExerciseId([exercise('A', { sets: [set({ completed: true })] }), exercise('B')])).toBe('B')
  })

  it('falls back to the first exercise when everything is done', () => {
    expect(firstOpenExerciseId([exercise('A', { sets: [set({ completed: true })] })])).toBe('A')
  })

  it('has nothing to open in an empty workout', () => {
    expect(firstOpenExerciseId([])).toBeNull()
  })
})

describe('migrateActiveWorkout', () => {
  const v0 = {
    activeWorkout: {
      id: null,
      title: 'Push A',
      started_at: '2026-11-20T10:00:00.000Z',
      routine_id: 'r1',
      exercises: [
        { workout_exercise_id: null, exercise: { id: 'e1', name: 'Bench' }, order_index: 0, sets: [{ id: 's1', set_number: 1, weight_kg: 60, reps: 8, rpe: null, is_warmup: false, completed: true, saved: false }] },
        { workout_exercise_id: null, exercise: { id: 'e2', name: 'Row' }, order_index: 1, sets: [{ id: 's2', set_number: 1, weight_kg: 50, reps: 8, rpe: null, is_warmup: false, completed: false, saved: false }] },
      ],
    },
    userBodyweight: 80,
    bodyweightLogged: true,
  }

  it('keeps a workout in progress and upgrades it', () => {
    const migrated = migrateActiveWorkout(v0, 0)
    const workout = migrated.activeWorkout
    expect(workout?.title).toBe('Push A')
    expect(workout?.routine_id).toBe('r1')
    expect(workout?.started_at).toBeInstanceOf(Date)
    expect(workout?.started_at.toISOString()).toBe('2026-11-20T10:00:00.000Z')
    expect(workout?.rest).toBeNull()
    const ids = workout?.exercises.map(e => e.clientId) ?? []
    expect(ids.every(id => id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(2)
    expect(workout?.openExerciseId).toBe(ids[1])
    expect(workout?.exercises[0].sets[0].weight_kg).toBe(60)
    expect(migrated).toMatchObject({ userBodyweight: 80, bodyweightLogged: true })
  })

  it('keeps the suggestion fields on a persisted set', () => {
    const withFields = structuredClone(v0)
    Object.assign(withFields.activeWorkout.exercises[0].sets[0], { rpe_source: 'prompt', suggested_weight_kg: 30, suggested_reps: 8 })
    const migratedSet = migrateActiveWorkout(withFields, 0).activeWorkout?.exercises[0].sets[0]
    expect(migratedSet).toMatchObject({ rpe_source: 'prompt', suggested_weight_kg: 30, suggested_reps: 8 })
  })

  it('keeps no workout as no workout', () => {
    expect(migrateActiveWorkout({ activeWorkout: null, userBodyweight: null, bodyweightLogged: null }, 0).activeWorkout).toBeNull()
  })

  it('survives a corrupted saved workout', () => {
    expect(migrateActiveWorkout({ activeWorkout: { title: 42 } }, 0).activeWorkout).toBeNull()
    expect(migrateActiveWorkout('nonsense', 0).activeWorkout).toBeNull()
  })
})

describe('toFinishPayload', () => {
  it('leaves out what only the phone needs', () => {
    const payload = toFinishPayload({
      id: null, title: 'Push A', started_at: new Date(), openExerciseId: 'A',
      rest: { endsAt: 1, totalSeconds: 90, nextLabel: null }, exercises: [exercise('A')],
    })
    expect(payload).not.toHaveProperty('openExerciseId')
    expect(payload).not.toHaveProperty('rest')
    expect(payload.exercises[0]).not.toHaveProperty('clientId')
  })
})

describe('restLabelAfter', () => {
  it('names the next exercise when the current one is finished', () => {
    const exercises = [
      exercise('Bench', { sets: [set({ completed: true })] }),
      exercise('Lateral Raise'),
    ]
    expect(restLabelAfter(exercises, 0)).toBe('Lateral Raise')
  })

  it('stays quiet while the current exercise has sets left', () => {
    expect(restLabelAfter([exercise('Bench', { sets: [set({ completed: true }), set()] }), exercise('Row')], 0)).toBeNull()
  })

  it('stays quiet when everything is done', () => {
    expect(restLabelAfter([exercise('Bench', { sets: [set({ completed: true })] })], 0)).toBeNull()
  })
})

describe('finishSituation', () => {
  const workout = (exercises: ActiveExercise[]): ActiveWorkout => ({
    id: null, title: 'Push A', started_at: new Date(), openExerciseId: null, rest: null, exercises,
  })

  it('knows when nothing has been added', () => {
    expect(finishSituation(workout([]))).toEqual({ kind: 'empty' })
  })

  it('is ready when every set with data is ticked', () => {
    expect(finishSituation(workout([exercise('A', { sets: [set({ completed: true }), set({ weight_kg: 0, reps: 0 })] })]))).toEqual({ kind: 'ready' })
  })

  it('counts sets with data that are not ticked', () => {
    const exercises = [exercise('A', { sets: [set({ completed: true }), set(), set()] })]
    expect(finishSituation(workout(exercises))).toEqual({ kind: 'unticked', count: 2 })
  })
})

describe('finishSituation with nothing done', () => {
  it('treats exercises with nothing logged as an empty workout', () => {
    const untouched = exercise('A', { sets: [set({ weight_kg: 0, reps: 0 })] })
    expect(finishSituation({ id: null, title: 'Push A', started_at: new Date(), openExerciseId: null, rest: null, exercises: [untouched] }))
      .toEqual({ kind: 'empty' })
  })
})
