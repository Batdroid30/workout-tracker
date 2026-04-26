import useSWR from 'swr'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Exercise } from '@/types/database'

const fetchExercises = async (): Promise<Exercise[]> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Fetches the full exercise catalogue with SWR caching.
 *
 * - First call: fetches from Supabase, caches in memory.
 * - Subsequent calls (same session): returns cached data instantly, no DB hit.
 * - Re-validates in the background when the window regains focus (SWR default).
 * - `enabled = false` skips the fetch entirely (e.g. picker not yet open).
 */
export function useExercises(enabled = true) {
  const { data, error, isLoading } = useSWR<Exercise[]>(
    enabled ? 'exercises' : null,
    fetchExercises,
    {
      // Don't re-fetch on every focus — exercise list changes rarely
      revalidateOnFocus: false,
      // Keep stale data while revalidating so the list never flickers
      keepPreviousData: true,
    },
  )

  return {
    exercises: data ?? [],
    loading:   isLoading,
    error:     error ?? null,
  }
}
