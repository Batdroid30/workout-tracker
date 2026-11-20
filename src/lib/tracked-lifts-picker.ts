import { MAX_TRACKED_LIFTS } from '@/app/(app)/progress/tracked-lifts-schemas'

export interface PickerState {
  picked: string[]
  error: string | null
}

export type PickerAction =
  | { type: 'toggle'; id: string }
  | { type: 'move'; from: string; to: string }
  | { type: 'reset' }
  | { type: 'seed'; ids: string[] }

export function pickerReducer(state: PickerState, action: PickerAction): PickerState {
  switch (action.type) {
    case 'toggle': {
      if (state.picked.includes(action.id)) return { picked: state.picked.filter(id => id !== action.id), error: null }
      if (state.picked.length >= MAX_TRACKED_LIFTS) return { ...state, error: `Pick up to ${MAX_TRACKED_LIFTS} lifts` }
      return { picked: [...state.picked, action.id], error: null }
    }
    case 'move': {
      const from = state.picked.indexOf(action.from)
      const to = state.picked.indexOf(action.to)
      if (from === -1 || to === -1 || from === to) return state
      const picked = [...state.picked]
      const [moved] = picked.splice(from, 1)
      picked.splice(to, 0, moved)
      return { ...state, picked }
    }
    case 'reset':
      return { picked: [], error: null }
    case 'seed':
      return { picked: action.ids, error: null }
  }
}

export interface PickerOption {
  id: string
  name: string
  detail: string
  hasData: boolean
}

// get_user_exercise_frequency counts sets, so the label says sets.
export function toPickerOptions({ exercises, frequency, initial, withData }: {
  exercises: { id: string; name: string; muscle_group: string }[]
  frequency: Record<string, number>
  initial: { id: string; name: string }[]
  withData: string[]
}): PickerOption[] {
  const hasData = new Set(withData)
  const fromStore = exercises.map(exercise => ({
    id: exercise.id,
    name: exercise.name,
    detail: `${exercise.muscle_group} · ${frequency[exercise.id] ?? 0} sets`,
    hasData: hasData.has(exercise.id),
  }))
  const known = new Set(fromStore.map(option => option.id))
  const missing = initial
    .filter(lift => !known.has(lift.id))
    .map(lift => ({ id: lift.id, name: lift.name, detail: '', hasData: hasData.has(lift.id) }))
  return [...missing, ...fromStore].sort((a, b) => (frequency[b.id] ?? 0) - (frequency[a.id] ?? 0))
}
