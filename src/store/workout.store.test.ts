import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkoutStore } from './workout.store'
import { ActiveWorkout, Exercise } from '@/types/database'

describe('Workout Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useWorkoutStore.setState({
      activeWorkout: null,
      userBodyweight: 75
    })
  })

  it('should initialize bodyweight correctly for case-insensitive equipment', () => {
    const store = useWorkoutStore.getState()
    useWorkoutStore.setState({ userBodyweight: 75 })

    store.startRoutine({
      id: 'routine-1',
      user_id: 'user-1',
      title: 'Test Routine',
      notes: null,
      created_at: new Date().toISOString(),
      routine_exercises: [
        {
          id: 're-1',
          routine_id: 'routine-1',
          exercise_id: 'ex-1',
          order_index: 0,
          target_sets: 1,
          target_reps: 10,
          progression_model: 'double',
          rep_sum_target: null,
          exercise: {
            id: 'ex-1',
            name: 'Pull Up',
            muscle_group: 'back',
            secondary_muscles: null,
            equipment: 'Bodyweight', // Capitalized!
            movement_pattern: 'pull',
            is_custom: false,
            created_by: null,
            created_at: null,
            youtube_video_id: null
          }
        }
      ]
    })

    const updatedStore = useWorkoutStore.getState()
    const activeWorkout = updatedStore.activeWorkout
    expect(activeWorkout).not.toBeNull()
    expect(activeWorkout?.exercises[0].sets[0].weight_kg).toBe(75)
  })

  it('should properly deep clone when adding a set', () => {
    const store = useWorkoutStore.getState()
    
    const exercise: Exercise = {
      id: 'ex-2',
      name: 'Squat',
      muscle_group: 'legs',
      secondary_muscles: null,
      equipment: 'barbell',
      movement_pattern: 'squat',
      is_custom: false,
      created_by: null,
      created_at: null,
      youtube_video_id: null
    }
    
    // Start empty workout
    useWorkoutStore.setState({
      activeWorkout: {
        id: null,
        title: 'Workout',
        started_at: new Date(),
        openExerciseId: null,
        rest: null,
        exercises: []
      },
      userBodyweight: 75
    })
    
    useWorkoutStore.getState().addExercise(exercise)
    
    const storeAfterAddEx = useWorkoutStore.getState()
    const firstExerciseObj = storeAfterAddEx.activeWorkout!.exercises[0]
    
    useWorkoutStore.getState().addSet(0)
    
    const storeAfterAddSet = useWorkoutStore.getState()
    const newExerciseObj = storeAfterAddSet.activeWorkout!.exercises[0]
    
    // Ensure we are replacing the exercise object reference, not mutating it
    expect(firstExerciseObj).not.toBe(newExerciseObj)
    // Ensure we are replacing the sets array reference
    expect(firstExerciseObj.sets).not.toBe(newExerciseObj.sets)
    // There should now be 2 sets (addExercise adds 1, addSet adds another)
    expect(newExerciseObj.sets.length).toBe(2)
  })
})

describe('rest timer', () => {
  beforeEach(() => {
    useWorkoutStore.getState().startWorkout('Push A')
  })

  it('stores rest as an end time', () => {
    const before = Date.now()
    useWorkoutStore.getState().startRest(90, 'Lateral Raise')
    const rest = useWorkoutStore.getState().activeWorkout?.rest
    expect(rest?.totalSeconds).toBe(90)
    expect(rest?.nextLabel).toBe('Lateral Raise')
    expect(rest?.endsAt).toBeGreaterThanOrEqual(before + 90_000)
  })

  it('adds time from now when rest has already run out', () => {
    useWorkoutStore.getState().startRest(90, null)
    const expired = Date.now() - 5_000
    useWorkoutStore.setState(state => ({
      activeWorkout: state.activeWorkout && { ...state.activeWorkout, rest: { endsAt: expired, totalSeconds: 90, nextLabel: null } },
    }))
    useWorkoutStore.getState().extendRest(30)
    expect(useWorkoutStore.getState().activeWorkout?.rest?.endsAt).toBeGreaterThanOrEqual(Date.now() + 29_000)
  })

  it('clears rest when skipped', () => {
    useWorkoutStore.getState().startRest(90, null)
    useWorkoutStore.getState().clearRest()
    expect(useWorkoutStore.getState().activeWorkout?.rest).toBeNull()
  })
})

describe('removing the open exercise', () => {
  it('opens the next exercise with work left', () => {
    useWorkoutStore.getState().startWorkout('Push A')
    const bench = { id: 'e1', name: 'Bench', muscle_group: 'chest', secondary_muscles: null, equipment: 'barbell', movement_pattern: 'push', is_custom: null, created_by: null, created_at: null, youtube_video_id: null }
    useWorkoutStore.getState().addExercise(bench)
    useWorkoutStore.getState().addExercise({ ...bench, id: 'e2', name: 'Row' })
    const [first, second] = useWorkoutStore.getState().activeWorkout?.exercises ?? []
    useWorkoutStore.getState().setOpenExercise(first.clientId)
    useWorkoutStore.getState().removeExercise(0)
    expect(useWorkoutStore.getState().activeWorkout?.openExerciseId).toBe(second.clientId)
  })
})

describe('copying a past workout', () => {
  it('does not copy RPEs from a past workout, so no effort is recorded without the user', () => {
    useWorkoutStore.getState().copyWorkout({
      title: 'Push A',
      workout_exercises: [{
        exercise: { id: 'ex-1', name: 'Bench Press', muscle_group: 'chest', equipment: 'barbell' },
        sets: [{ set_number: 1, weight_kg: 80, reps: 5, rpe: 9, is_warmup: false }],
      }],
    })
    const copiedSet = useWorkoutStore.getState().activeWorkout?.exercises[0].sets[0]
    expect(copiedSet?.rpe).toBeNull()
    expect(copiedSet?.rpe_source ?? null).toBeNull()
  })
})
