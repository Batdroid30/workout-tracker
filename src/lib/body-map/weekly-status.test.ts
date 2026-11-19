import { describe, expect, it } from 'vitest'
import { trainedStatusByMuscle } from './weekly-status'

describe('trainedStatusByMuscle', () => {
  it('omits muscles with zero sets', () => {
    expect(trainedStatusByMuscle([
      { muscleGroup: 'chest', setCount: 0, status: 'below_mv' },
      { muscleGroup: 'quads', setCount: 12, status: 'optimal' },
    ])).toEqual({ quads: 'optimal' })
  })

  it('returns {} for an untrained week', () => {
    expect(trainedStatusByMuscle([{ muscleGroup: 'chest', setCount: 0, status: 'below_mv' }])).toEqual({})
  })
})
