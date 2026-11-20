import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { migrateActiveWorkout, moveBlock as reorderBlocks, newClientId, newSession } from '@/lib/workout-session'
import type { ActiveWorkout, ActiveExercise, ActiveSet, Exercise } from '@/types/database'

interface WorkoutStore {
  activeWorkout: ActiveWorkout | null
  userBodyweight: number | null
  /** false when no bodyweight has ever been logged and 75 kg is being assumed; null until known */
  bodyweightLogged: boolean | null

  // Actions
  startWorkout: (title?: string) => void
  startFromTemplate: (exercises: ActiveExercise[], title?: string) => void
  startRoutine: (routine: any) => void
  copyWorkout: (pastWorkout: any) => void
  addExercise: (exercise: Exercise, restSeconds?: number) => void
  replaceExercise: (exerciseIndex: number, newExercise: Exercise) => void
  moveBlock: (fromBlockId: string, toBlockId: string) => void
  setOpenExercise: (clientId: string | null) => void
  startRest: (seconds: number, nextLabel: string | null) => void
  extendRest: (seconds: number) => void
  clearRest: () => void
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
  setBodyweightLogged: (logged: boolean) => void
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      userBodyweight: null,
      bodyweightLogged: null,

      startWorkout: (title = 'Workout') => set({
        activeWorkout: newSession({ id: null, title, started_at: new Date(), exercises: [] }),
      }),

      startFromTemplate: (exercises, title = 'Workout') => set({
        activeWorkout: newSession({ id: null, title, started_at: new Date(), exercises }),
      }),

      startRoutine: (routine) => set({
        activeWorkout: newSession({
          id: null,
          title: routine.title,
          routine_id: routine.id,
          has_routine_been_modified: false,
          started_at: new Date(),
          exercises: routine.routine_exercises.map((re: any, idx: number) => {
            const isBw = re.exercise.equipment?.toLowerCase() === 'bodyweight' && !re.exercise.name.toLowerCase().match(/weighted/i)
            const isWeightedBw = re.exercise.equipment?.toLowerCase() === 'bodyweight' && !!re.exercise.name.toLowerCase().match(/weighted/i)
            
            const sets = []
            for (let i = 0; i < re.target_sets; i++) {
              sets.push({
                id: crypto.randomUUID(),
                set_number: i + 1,
                weight_kg: isBw || isWeightedBw ? (get().userBodyweight ?? 75) : 0,
                reps: re.target_reps,
                rpe: null,
                is_warmup: false,
                completed: false,
                saved: false,
              })
            }
            return {
              clientId: newClientId(),
              workout_exercise_id: null,
              exercise: re.exercise,
              order_index: idx,
              sets,
              progression_model: re.progression_model ?? 'double',
              rep_sum_target:    re.rep_sum_target ?? null,
            }
          })
        }),
      }),

      copyWorkout: (pastWorkout) => set({
        activeWorkout: newSession({
          id: null,
          title: pastWorkout.title || 'Workout',
          started_at: new Date(),
          exercises: pastWorkout.workout_exercises.map((we: any, idx: number) => ({
            clientId: newClientId(),
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
        }),
      }),

      addExercise: (exercise, restSeconds?) => set((state) => {
        if (!state.activeWorkout) return state

        const isBw = exercise.equipment?.toLowerCase() === 'bodyweight' && !exercise.name.toLowerCase().match(/weighted/i)
        const isWeightedBw = exercise.equipment?.toLowerCase() === 'bodyweight' && !!exercise.name.toLowerCase().match(/weighted/i)

        const newExercise: ActiveExercise = {
          clientId: newClientId(),
          workout_exercise_id: null,
          exercise,
          sets: [{
            id: crypto.randomUUID(),
            set_number: 1,
            weight_kg: isBw || isWeightedBw ? (state.userBodyweight ?? 75) : 0,
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
            openExerciseId: newExercise.clientId,
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

      moveBlock: (fromBlockId, toBlockId) => set((state) => {
        if (!state.activeWorkout) return state
        const exercises = reorderBlocks(state.activeWorkout.exercises, fromBlockId, toBlockId)
        if (exercises === state.activeWorkout.exercises) return state
        return {
          activeWorkout: {
            ...state.activeWorkout,
            exercises,
            has_routine_been_modified: state.activeWorkout.routine_id ? true : false,
          },
        }
      }),

      setOpenExercise: (clientId) => set((state) => (
        state.activeWorkout ? { activeWorkout: { ...state.activeWorkout, openExerciseId: clientId } } : state
      )),

      // The rest timer is an end time, so it stays right while the phone
      // sleeps or the lifter is on another screen.
      startRest: (seconds, nextLabel) => set((state) => (
        state.activeWorkout
          ? { activeWorkout: { ...state.activeWorkout, rest: { endsAt: Date.now() + seconds * 1000, totalSeconds: seconds, nextLabel } } }
          : state
      )),

      extendRest: (seconds) => set((state) => {
        const rest = state.activeWorkout?.rest
        if (!state.activeWorkout || !rest) return state
        const endsAt = Math.max(rest.endsAt, Date.now()) + seconds * 1000
        return { activeWorkout: { ...state.activeWorkout, rest: { ...rest, endsAt, totalSeconds: rest.totalSeconds + seconds } } }
      }),

      clearRest: () => set((state) => (
        state.activeWorkout ? { activeWorkout: { ...state.activeWorkout, rest: null } } : state
      )),

      addSet: (exerciseIndex) => set((state) => {
        if (!state.activeWorkout) return state
        const exercises = [...state.activeWorkout.exercises]
        const exercise = { ...exercises[exerciseIndex] }
        const prevSet = exercise.sets[exercise.sets.length - 1]
        
        const isBw = exercise.exercise.equipment?.toLowerCase() === 'bodyweight' && !exercise.exercise.name.toLowerCase().match(/weighted/i)
        const isWeightedBw = exercise.exercise.equipment?.toLowerCase() === 'bodyweight' && !!exercise.exercise.name.toLowerCase().match(/weighted/i)
        
        // Pre-fill with previous set values — saves time in the gym
        exercise.sets = [...exercise.sets, {
          id: crypto.randomUUID(),
          set_number: exercise.sets.length + 1,
          weight_kg: prevSet ? prevSet.weight_kg : (isBw || isWeightedBw ? (state.userBodyweight ?? 75) : 0),
          reps: prevSet?.reps ?? 0,
          rpe: null,
          is_warmup: false,
          completed: false,
          saved: false,
        }]
        exercises[exerciseIndex] = exercise
        return { activeWorkout: { ...state.activeWorkout, exercises } }
      }),

      addWarmupSet: (exerciseIndex, weight = 0, reps = 0) => set((state) => {
        if (!state.activeWorkout) return state
        const exercises = [...state.activeWorkout.exercises]
        const exercise = { ...exercises[exerciseIndex] }
        exercise.sets = [...exercise.sets, {
          id: crypto.randomUUID(),
          set_number: exercise.sets.length + 1,
          weight_kg: weight,
          reps,
          rpe: null,
          is_warmup: true,
          completed: false,
          saved: false,
        }]
        exercises[exerciseIndex] = exercise
        return { activeWorkout: { ...state.activeWorkout, exercises } }
      }),

      updateSet: (exerciseIndex, setIndex, updates) => set((state) => {
        if (!state.activeWorkout) return state
        const exercises = [...state.activeWorkout.exercises]
        const exercise = { ...exercises[exerciseIndex] }
        const sets = [...exercise.sets]
        sets[setIndex] = {
          ...sets[setIndex],
          ...updates,
        }
        exercise.sets = sets
        exercises[exerciseIndex] = exercise
        return { activeWorkout: { ...state.activeWorkout, exercises } }
      }),

      markSetDone: (exerciseIndex, setIndex) => set((state) => {
        if (!state.activeWorkout) return state
        const exercises = [...state.activeWorkout.exercises]
        const exercise = { ...exercises[exerciseIndex] }
        const sets = [...exercise.sets]
        // Toggle — tapping ✓ on a completed set reopens it for editing
        sets[setIndex] = {
          ...sets[setIndex],
          completed: !sets[setIndex].completed
        }
        exercise.sets = sets
        exercises[exerciseIndex] = exercise
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
    const exercise = { ...exercises[exerciseIndex] }
    exercise.sets = exercise.sets.filter((_, i) => i !== setIndex)
    exercises[exerciseIndex] = exercise
    return { activeWorkout: { ...state.activeWorkout, exercises } }
  }),

  insertSet: (exerciseIndex, setIndex, insertedSet) => set((state) => {
    if (!state.activeWorkout) return state
    const exercises = [...state.activeWorkout.exercises]
    const exercise = { ...exercises[exerciseIndex] }
    const sets = [...exercise.sets]
    sets.splice(setIndex, 0, insertedSet)
    exercise.sets = sets
    exercises[exerciseIndex] = exercise
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
  setBodyweightLogged: (logged) => set({ bodyweightLogged: logged }),
}),
    { name: 'active-workout', version: 1, migrate: migrateActiveWorkout }     // localStorage key
  )
)
