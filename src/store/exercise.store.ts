'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Exercise } from '@/types/database'

// ─── Exercise catalog cache ───────────────────────────────────────────────────
//
// The exercise catalog (~50–200 rows depending on user customs) barely changes
// between sessions. Fetching it on every workout screen mount is wasteful on
// the Supabase free tier.
//
// Strategy:
//   • localStorage-persist the full list with a 24h TTL
//   • One DB query per 24h per device (RLS-scoped, so customs are included)
//   • Reads are synchronous from memory after the first load
//   • Manual `refresh()` available when the user adds a custom exercise
//
// Security: getSupabaseClient() is RLS-scoped — users only see public
// exercises + their own customs. No userId is passed; the DB resolves it
// from the auth session.

const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface ExerciseStore {
  exercises:  Exercise[]
  fetchedAt:  number | null
  isLoading:  boolean

  /** Load if cache is empty or stale. Returns immediately if fresh. */
  load:    () => Promise<void>
  /** Force a re-fetch — call after the user adds a custom exercise. */
  refresh: () => Promise<void>
  /** Lookup helper for components that already have the id. */
  getById: (id: string) => Exercise | undefined
}

async function fetchExercises(): Promise<Exercise[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, secondary_muscles, equipment, movement_pattern, is_custom, created_by, created_at')
    .order('name', { ascending: true })

  if (error || !data) return []
  return data as Exercise[]
}

export const useExerciseStore = create<ExerciseStore>()(
  persist(
    (set, get) => ({
      exercises: [],
      fetchedAt: null,
      isLoading: false,

      load: async () => {
        const { fetchedAt, exercises, isLoading } = get()
        if (isLoading) return

        const fresh = fetchedAt && (Date.now() - fetchedAt) < TTL_MS
        if (fresh && exercises.length > 0) return

        set({ isLoading: true })
        try {
          const data = await fetchExercises()
          set({ exercises: data, fetchedAt: Date.now() })
        } finally {
          set({ isLoading: false })
        }
      },

      refresh: async () => {
        set({ isLoading: true })
        try {
          const data = await fetchExercises()
          set({ exercises: data, fetchedAt: Date.now() })
        } finally {
          set({ isLoading: false })
        }
      },

      getById: (id) => get().exercises.find(e => e.id === id),
    }),
    {
      name: 'exercise-cache-v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist the data — never the loading flag
      partialize: (state) => ({
        exercises: state.exercises,
        fetchedAt: state.fetchedAt,
      }),
    },
  ),
)
