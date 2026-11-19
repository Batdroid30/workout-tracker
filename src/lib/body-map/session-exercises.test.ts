import { describe, expect, it } from 'vitest'
import { toSessionExercises } from './session-exercises'

describe('toSessionExercises', () => {
  it('counts only non-warmup sets with reps', () => {
    const result = toSessionExercises([
      {
        exercise: { muscle_group: 'chest', secondary_muscles: ['triceps'] },
        sets: [
          { reps: 8, is_warmup: false },
          { reps: 8, is_warmup: true },
          { reps: 0, is_warmup: false },
          { reps: 5, is_warmup: null },
        ],
      },
    ])
    expect(result).toEqual([{ muscleGroup: 'chest', secondaryMuscles: ['triceps'], workingSetCount: 2 }])
  })

  it('tolerates missing sets and non-array secondary muscles (null)', () => {
    const result = toSessionExercises([
      { exercise: { muscle_group: null, secondary_muscles: null }, sets: null },
    ])
    expect(result).toEqual([{ muscleGroup: null, secondaryMuscles: null, workingSetCount: 0 }])
  })
})
