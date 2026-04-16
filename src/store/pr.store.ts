import { create } from 'zustand'
import type { PersonalRecord, PRCheckResult } from '@/types/database'

interface PRStore {
  // Cache: exercise_id → array of PRs
  prs: Record<string, PersonalRecord[]>
  newPRs: PRCheckResult[]           // PRs hit in this session — for celebration UI
  
  loadPRsForExercises: (exerciseIds: string[]) => Promise<void>
  checkLocalPR: (exerciseId: string, weight: number, reps: number) => PRCheckResult[]
  addNewPR: (result: PRCheckResult) => void
  clearNewPRs: () => void
}

export const usePRStore = create<PRStore>((set, get) => ({
  prs: {},
  newPRs: [],

  loadPRsForExercises: async (exerciseIds) => {
    // To be implemented when API is ready
  },

  checkLocalPR: (exerciseId, weight, reps) => {
    // To be implemented: actual PR check logic against cached PRs
    return []
  },

  addNewPR: (result) => set((state) => ({
    newPRs: [...state.newPRs, result]
  })),

  clearNewPRs: () => set({ newPRs: [] })
}))
