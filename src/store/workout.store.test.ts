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
