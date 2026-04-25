import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActiveWorkout, ActiveExercise, ActiveSet, Exercise } from '@/types/database'

interface WorkoutStore {
  activeWorkout: ActiveWorkout | null
  
  // Actions
  startWorkout: (title?: string) => void
  startRoutine: (routine: any) => void
  copyWorkout: (pastWorkout: any) => void
  addExercise: (exercise: Exercise) => void
  replaceExercise: (exerciseIndex: number, newExercise: Exercise) => void
  moveExerciseUp: (exerciseIndex: number) => void
  moveExerciseDown: (exerciseIndex: number) => void
  addSet: (exerciseIndex: number) => void
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<ActiveSet>) => void
  markSetDone: (exerciseIndex: number, setIndex: number) => void
  completeAllSets: () => void
  updateTitle: (title: string) => void
  removeExercise: (exerciseIndex: number) => void
  removeSet: (exerciseIndex: number, setIndex: number) => void
  finishWorkout: () => void
  discardWorkout: () => void
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      activeWorkout: null,

      startWorkout: (title = 'Workout') => set({
        activeWorkout: {
          id: null,
          title,
          started_at: new Date(),
          exercises: [],
        }
      }),

      startRoutine: (routine) => set({
        activeWorkout: {
          id: null,
          title: routine.title,
          routine_id: routine.id,
          has_routine_been_modified: false,
          started_at: new Date(),
          exercises: routine.routine_exercises.map((re: any, idx: number) => {
            const sets = []
            for (let i = 0; i < re.target_sets; i++) {
              sets.push({
                id: crypto.randomUUID(),
                set_number: i + 1,
                weight_kg: 0,
                reps: re.target_reps,
                rpe: null,
                is_warmup: false,
                completed: false,
                saved: false,
              })
            }
            return {
              workout_exercise_id: null,
              exercise: re.exercise,
              order_index: idx,
              sets
            }
          })
        }
      }),

      copyWorkout: (pastWorkout) => set({
        activeWorkout: {
          id: null,
          title: pastWorkout.title || 'Workout',
          started_at: new Date(),
          exercises: pastWorkout.workout_exercises.map((we: any, idx: number) => ({
            workout_exercise_id: null,
            exercise: we.exercise,
            order_index: idx,
            sets: we.sets.map((s: any) => ({
              id: crypto.randomUUID(),
              set_number: s.set_number,
              weight_kg: s.weight_kg,
              reps: s.reps,
              rpe: s.rpe,
              is_warmup: s.is_warmup,
              completed: false, // Must do it again!
              saved: false,
            }))
          }))
        }
      }),

      addExercise: (exercise) => set((state) => {
        if (!state.activeWorkout) return state
        
        const newExercise: ActiveExercise = {
          workout_exercise_id: null,
          exercise,
          sets: [{
            id: crypto.randomUUID(),
            set_number: 1,
            weight_kg: 0,
            reps: 0,
            rpe: null,
            is_warmup: false,
            completed: false,
            saved: false,
          }],
          order_index: state.activeWorkout.exercises.length,
        }

        return {
          activeWorkout: {
            ...state.activeWorkout,
            exercises: [...state.activeWorkout.exercises, newExercise],
            has_routine_been_modified: state.activeWorkout.routine_id ? true : false
          }
        }
      }),

      replaceExercise: (exerciseIndex, newExerciseDef) => set((state) => {
        if (!state.activeWorkout) return state
        const exercises = [...state.activeWorkout.exercises]
        exercises[exerciseIndex] = {
          ...exercises[exerciseIndex],
          exercise: newExerciseDef,
          // Keep sets, just change the underlying exercise
        }
        return { 
          activeWorkout: { 
            ...state.activeWorkout, 
            exercises,
            has_routine_been_modified: state.activeWorkout.routine_id ? true : false
          } 
        }
      }),

      moveExerciseUp: (exerciseIndex) => set((state) => {
        if (!state.activeWorkout || exerciseIndex === 0) return state
        const exercises = [...state.activeWorkout.exercises]
        const temp = exercises[exerciseIndex - 1]
        exercises[exerciseIndex - 1] = exercises[exerciseIndex]
        exercises[exerciseIndex] = temp
        // update order_index
        exercises[exerciseIndex - 1].order_index = exerciseIndex - 1
        exercises[exerciseIndex].order_index = exerciseIndex
        return { 
          activeWorkout: { 
            ...state.activeWorkout, 
            exercises,
            has_routine_been_modified: state.activeWorkout.routine_id ? true : false
          } 
        }
      }),

      moveExerciseDown: (exerciseIndex) => set((state) => {
        if (!state.activeWorkout || exerciseIndex === state.activeWorkout.exercises.length - 1) return state
        const exercises = [...state.activeWorkout.exercises]
        const temp = exercises[exerciseIndex + 1]
        exercises[exerciseIndex + 1] = exercises[exerciseIndex]
        exercises[exerciseIndex] = temp
        // update order_index
        exercises[exerciseIndex].order_index = exerciseIndex
        exercises[exerciseIndex + 1].order_index = exerciseIndex + 1
        return { 
          activeWorkout: { 
            ...state.activeWorkout, 
            exercises,
            has_routine_been_modified: state.activeWorkout.routine_id ? true : false
          } 
        }
      }),

      addSet: (exerciseIndex) => set((state) => {
        if (!state.activeWorkout) return state
        const exercises = [...state.activeWorkout.exercises]
        const exercise = exercises[exerciseIndex]
        const prevSet = exercise.sets[exercise.sets.length - 1]
        
        // Pre-fill with previous set values — saves time in the gym
        exercises[exerciseIndex] = {
          ...exercise,
          sets: [...exercise.sets, {
            id: crypto.randomUUID(),
            set_number: exercise.sets.length + 1,
            weight_kg: prevSet?.weight_kg ?? 0,
            reps: prevSet?.reps ?? 0,
            rpe: null,
            is_warmup: false,
            completed: false,
            saved: false,
          }]
        }
        return { activeWorkout: { ...state.activeWorkout, exercises } }
      }),

      updateSet: (exerciseIndex, setIndex, updates) => set((state) => {
        if (!state.activeWorkout) return state
        const exercises = [...state.activeWorkout.exercises]
        exercises[exerciseIndex].sets[setIndex] = {
          ...exercises[exerciseIndex].sets[setIndex],
          ...updates,
        }
        return { activeWorkout: { ...state.activeWorkout, exercises } }
      }),

      markSetDone: (exerciseIndex, setIndex) => set((state) => {
        if (!state.activeWorkout) return state
        const exercises = [...state.activeWorkout.exercises]
        // Toggle — tapping ✓ on a completed set reopens it for editing
        exercises[exerciseIndex].sets[setIndex].completed =
          !exercises[exerciseIndex].sets[setIndex].completed
        return { activeWorkout: { ...state.activeWorkout, exercises } }
      }),

  removeExercise: (exerciseIndex) => set((state) => ({
    activeWorkout: state.activeWorkout ? {
      ...state.activeWorkout,
      exercises: state.activeWorkout.exercises.filter((_, i) => i !== exerciseIndex),
      has_routine_been_modified: state.activeWorkout.routine_id ? true : false
    } : null
  })),

  removeSet: (exerciseIndex, setIndex) => set((state) => {
    if (!state.activeWorkout) return state
    const exercises = [...state.activeWorkout.exercises]
    exercises[exerciseIndex] = {
      ...exercises[exerciseIndex],
      sets: exercises[exerciseIndex].sets.filter((_, i) => i !== setIndex)
    }
    return { activeWorkout: { ...state.activeWorkout, exercises } }
  }),

  completeAllSets: () => set((state) => {
    if (!state.activeWorkout) return state
    const exercises = state.activeWorkout.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => (s.weight_kg > 0 || s.reps > 0) ? { ...s, completed: true } : s)
    }))
    return { activeWorkout: { ...state.activeWorkout, exercises } }
  }),

  updateTitle: (title) => set((state) => ({
    activeWorkout: state.activeWorkout ? { ...state.activeWorkout, title } : null
  })),

  finishWorkout: () => set({ activeWorkout: null }),
  discardWorkout: () => set({ activeWorkout: null }),
}),
    { name: 'active-workout' }     // localStorage key
  )
)
