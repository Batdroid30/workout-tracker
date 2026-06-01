import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActiveWorkout, ActiveExercise, ActiveSet, Exercise } from '@/types/database'

interface WorkoutStore {
  activeWorkout: ActiveWorkout | null
  userBodyweight: number | null

  // Actions
  startWorkout: (title?: string) => void
  startFromTemplate: (exercises: ActiveExercise[], title?: string) => void
  startRoutine: (routine: any) => void
  copyWorkout: (pastWorkout: any) => void
  addExercise: (exercise: Exercise, restSeconds?: number) => void
  replaceExercise: (exerciseIndex: number, newExercise: Exercise) => void
  moveExerciseUp: (exerciseIndex: number) => void
  moveExerciseDown: (exerciseIndex: number) => void
  addSet: (exerciseIndex: number) => void
  addWarmupSet: (exerciseIndex: number, weight?: number, reps?: number) => void
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<ActiveSet>) => void
  markSetDone: (exerciseIndex: number, setIndex: number) => void
  completeAllSets: () => void
  updateTitle: (title: string) => void
  updateExerciseRestSeconds: (exerciseIndex: number, seconds: number) => void
  removeExercise: (exerciseIndex: number) => void
  removeSet: (exerciseIndex: number, setIndex: number) => void
  insertSet: (exerciseIndex: number, setIndex: number, set: ActiveSet) => void
  pairAsSuperset: (indexA: number, indexB: number) => void
  unpairSuperset: (index: number) => void
  finishWorkout: () => void
  discardWorkout: () => void
  setUserBodyweight: (weight: number | null) => void
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      userBodyweight: null,

      startWorkout: (title = 'Workout') => set({
        activeWorkout: {
          id: null,
          title,
          started_at: new Date(),
          exercises: [],
        }
      }),

      startFromTemplate: (exercises, title = 'Workout') => set({
        activeWorkout: {
          id: null,
          title,
          started_at: new Date(),
          exercises,
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
              sets,
              progression_model: re.progression_model ?? 'double',
              rep_sum_target:    re.rep_sum_target ?? null,
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

      addExercise: (exercise, restSeconds?) => set((state) => {
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
          rest_seconds: restSeconds,
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

      addWarmupSet: (exerciseIndex, weight = 0, reps = 0) => set((state) => {
        if (!state.activeWorkout) return state
        const exercises = [...state.activeWorkout.exercises]
        const exercise = exercises[exerciseIndex]
        exercises[exerciseIndex] = {
          ...exercise,
          sets: [...exercise.sets, {
            id: crypto.randomUUID(),
            set_number: exercise.sets.length + 1,
            weight_kg: weight,
            reps,
            rpe: null,
            is_warmup: true,
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

  insertSet: (exerciseIndex, setIndex, insertedSet) => set((state) => {
    if (!state.activeWorkout) return state
    const exercises = [...state.activeWorkout.exercises]
    const sets = [...exercises[exerciseIndex].sets]
    sets.splice(setIndex, 0, insertedSet)
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets }
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

  updateExerciseRestSeconds: (exerciseIndex, seconds) => set((state) => {
    if (!state.activeWorkout) return state
    const exercises = [...state.activeWorkout.exercises]
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], rest_seconds: seconds }
    return { activeWorkout: { ...state.activeWorkout, exercises } }
  }),

  pairAsSuperset: (indexA, indexB) => set((state) => {
    if (!state.activeWorkout) return state
    const exercises = [...state.activeWorkout.exercises]
    const groupId = crypto.randomUUID()
    const lo = Math.min(indexA, indexB)
    const hi = Math.max(indexA, indexB)

    // Move the higher-index exercise to be immediately after the lower one
    // so the superset group is always consecutive in the list.
    if (hi !== lo + 1) {
      const [moved] = exercises.splice(hi, 1)
      exercises.splice(lo + 1, 0, moved)
    }

    exercises[lo]     = { ...exercises[lo],     superset_group: groupId }
    exercises[lo + 1] = { ...exercises[lo + 1], superset_group: groupId }
    exercises.forEach((ex, i) => { ex.order_index = i })

    return { activeWorkout: { ...state.activeWorkout, exercises } }
  }),

  unpairSuperset: (index) => set((state) => {
    if (!state.activeWorkout) return state
    const groupId = state.activeWorkout.exercises[index]?.superset_group
    if (!groupId) return state
    const exercises = state.activeWorkout.exercises.map(ex =>
      ex.superset_group === groupId ? { ...ex, superset_group: undefined } : ex
    )
    return { activeWorkout: { ...state.activeWorkout, exercises } }
  }),

  finishWorkout: () => set({ activeWorkout: null }),
  discardWorkout: () => set({ activeWorkout: null }),
  setUserBodyweight: (weight) => set({ userBodyweight: weight }),
}),
    { name: 'active-workout' }     // localStorage key
  )
)
