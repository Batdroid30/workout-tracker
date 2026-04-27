'use client'

import { create } from 'zustand'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { PersonalRecord, PRCheckResult, PRType } from '@/types/database'

interface PRStore {
  // Cache: exercise_id → array of PRs (one per pr_type)
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
    if (exerciseIds.length === 0) return

    // Only fetch IDs not already cached
    const uncached = exerciseIds.filter(id => !get().prs[id])
    if (uncached.length === 0) return

    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // RLS enforced — user can only read their own personal_records
    const { data } = await supabase
      .from('personal_records')
      .select('id, user_id, exercise_id, pr_type, reps, value, set_id, achieved_at')
      .eq('user_id', user.id)
      .in('exercise_id', uncached)

    if (!data) return

    const updated = { ...get().prs }
    for (const id of uncached) {
      updated[id] = data.filter((r: { exercise_id: string }) => r.exercise_id === id) as PersonalRecord[]
    }
    set({ prs: updated })
  },

  checkLocalPR: (exerciseId, weight, reps) => {
    const exercisePRs = get().prs[exerciseId] ?? []
    const prMap = new Map<PRType, number>(
      exercisePRs.map(pr => [pr.pr_type, pr.value])
    )

    const checks: { type: PRType; value: number }[] = [
      { type: 'best_weight', value: weight },
      { type: 'best_volume', value: weight * reps },
      { type: 'best_1rm',    value: weight * (1 + reps / 30) },
    ]

    const results: PRCheckResult[] = []
    const updatedPRs = [...exercisePRs]

    for (const check of checks) {
      const current = prMap.get(check.type) ?? 0
      if (check.value > current) {
        results.push({
          pr_type:   check.type,
          old_value: current === 0 ? null : current,
          new_value: check.value,
          is_pr:     true,
        })
        // Update in-memory cache immediately so the next set in this session
        // compares against the new bar rather than the old DB value
        prMap.set(check.type, check.value)
        const idx = updatedPRs.findIndex(p => p.pr_type === check.type)
        const updated = { exercise_id: exerciseId, pr_type: check.type, value: check.value } as PersonalRecord
        if (idx >= 0) updatedPRs[idx] = updated
        else updatedPRs.push(updated)
      }
    }

    if (results.length > 0) {
      set({ prs: { ...get().prs, [exerciseId]: updatedPRs } })
    }

    return results
  },

  addNewPR: (result) => set((state) => ({
    newPRs: [...state.newPRs, result]
  })),

  clearNewPRs: () => set({ newPRs: [] }),
}))
