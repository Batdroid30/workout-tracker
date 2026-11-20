'use client'

import { useSyncExternalStore } from 'react'

const DEFAULT_INTERVAL_MS = 1000

// The current time, refreshed every interval while the page is visible and
// immediately when it becomes visible again. Hidden pages don't tick at all.
export function useNow(intervalMs: number = DEFAULT_INTERVAL_MS): number {
  return useSyncExternalStore(
    onChange => {
      let timer: ReturnType<typeof setInterval> | null = null
      const stop = () => {
        if (timer) clearInterval(timer)
        timer = null
      }
      const sync = () => {
        stop()
        if (document.visibilityState !== 'visible') return
        onChange()
        timer = setInterval(onChange, intervalMs)
      }
      sync()
      document.addEventListener('visibilitychange', sync)
      return () => {
        stop()
        document.removeEventListener('visibilitychange', sync)
      }
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  )
}
