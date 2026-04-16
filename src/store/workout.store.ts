import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActiveWorkout, ActiveExercise, ActiveSet, Exercise } from '@/types/database'

interface WorkoutStore {
  activeWorkout: ActiveWorkout | null
  
  // Actions
  startWorkout: (title?: string) => void
  addExercise: (exercise: Exercise) => void
  addSet: (exerciseIndex: number) => void
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<ActiveSet>) => void
  markSetDone: (exerciseIndex: number, setIndex: number) => void
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

      addExercise: (exercise) => set((state) => ({
        activeWorkout: state.activeWorkout ? {
          ...state.activeWorkout,
          exercises: [...state.activeWorkout.exercises, {
            workout_exercise_id: null,
            exercise,
            sets: [],
            order_index: state.activeWorkout.exercises.length,
          }]
        } : null
      })),

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
        exercises[exerciseIndex].sets[setIndex].completed = true
        return { activeWorkout: { ...state.activeWorkout, exercises } }
      }),

      finishWorkout: () => set({ activeWorkout: null }),
      discardWorkout: () => set({ activeWorkout: null }),
    }),
    { name: 'active-workout' }     // localStorage key
  )
)
