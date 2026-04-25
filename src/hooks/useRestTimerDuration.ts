'use client'

import { useState, useCallback, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

const STORAGE_KEY     = 'rest_timer_seconds'
const DEFAULT_SECONDS = 90

function readFromStorage(): number {
  if (typeof window === 'undefined') return DEFAULT_SECONDS
  const stored = localStorage.getItem(STORAGE_KEY)
  const parsed = stored ? Number(stored) : NaN
  return isNaN(parsed) || parsed < 10 ? DEFAULT_SECONDS : parsed
}

/**
 * Persists the user's preferred rest duration using a local-first pattern:
 * - Reads from localStorage immediately (no loading state, instant render)
 * - Syncs from Supabase profiles table on mount (updates local if different)
 * - Writes to localStorage optimistically + upserts to Supabase in background
 */
export function useRestTimerDuration() {
  const [seconds, setSeconds] = useState<number>(readFromStorage)

  // On mount: fetch from Supabase and reconcile with localStorage
  useEffect(() => {
    let cancelled = false

    async function syncFromSupabase() {
      const supabase = getSupabaseClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data } = await supabase
        .from('profiles')
        .select('rest_timer_seconds')
        .eq('id', user.id)
        .single()

      if (cancelled || !data) return

      const remote = data.rest_timer_seconds
      if (typeof remote === 'number' && remote >= 10) {
        // Remote is source of truth — update local state and cache
        setSeconds(remote)
        localStorage.setItem(STORAGE_KEY, String(remote))
      }
    }

    syncFromSupabase()
    return () => { cancelled = true }
  }, [])

  const updateSeconds = useCallback(async (value: number) => {
    const clamped = Math.max(10, Math.min(600, value))

    // Optimistic local update
    setSeconds(clamped)
    localStorage.setItem(STORAGE_KEY, String(clamped))

    // Background Supabase sync — fire and forget
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .upsert(
        { id: user.id, rest_timer_seconds: clamped, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
  }, [])

  return { seconds, updateSeconds }
}
