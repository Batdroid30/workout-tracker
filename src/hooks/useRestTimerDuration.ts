'use client'

import { useState, useCallback } from 'react'

const STORAGE_KEY     = 'rest_timer_seconds'
const DEFAULT_SECONDS = 90

function readFromStorage(): number {
  if (typeof window === 'undefined') return DEFAULT_SECONDS
  const stored = localStorage.getItem(STORAGE_KEY)
  const parsed = stored ? Number(stored) : NaN
  return isNaN(parsed) || parsed < 10 ? DEFAULT_SECONDS : parsed
}

/** Persists the user's preferred rest duration across sessions via localStorage. */
export function useRestTimerDuration() {
  const [seconds, setSeconds] = useState<number>(readFromStorage)

  const updateSeconds = useCallback((value: number) => {
    const clamped = Math.max(10, Math.min(600, value))
    setSeconds(clamped)
    localStorage.setItem(STORAGE_KEY, String(clamped))
  }, [])

  return { seconds, updateSeconds }
}
