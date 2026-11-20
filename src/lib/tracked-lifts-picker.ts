import { MAX_TRACKED_LIFTS } from '@/app/(app)/progress/tracked-lifts-schemas'

export interface PickerState {
  picked: string[]
  error: string | null
}

export type PickerAction =
  | { type: 'toggle'; id: string }
  | { type: 'move'; from: string; to: string }
  | { type: 'reset' }

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
  }
}
