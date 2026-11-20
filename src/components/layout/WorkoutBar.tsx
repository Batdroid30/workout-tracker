'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useWorkoutStore } from '@/store/workout.store'
import { useNow } from '@/hooks/useNow'
import { useHydrated } from '@/hooks/useHydrated'
import { formatDuration } from '@/lib/time'
import { workoutProgress } from '@/lib/workout-session'

const LOGGER_PATH = '/workout'

// The minimized workout: on every screen but the logger, one tap from resuming.
export function WorkoutBar() {
  const pathname = usePathname() || ''
  const workout = useWorkoutStore(state => state.activeWorkout)
  const hydrated = useHydrated()
  const now = useNow()
  const isShown = hydrated && workout !== null && pathname !== LOGGER_PATH

  // Pages reserve room for the tab bar; this tells them to leave room for the bar too.
  useEffect(() => {
    const root = document.documentElement
    if (isShown) root.dataset.workoutBar = 'on'
    else delete root.dataset.workoutBar
    return () => { delete root.dataset.workoutBar }
  }, [isShown])

  if (!isShown || !workout) return null

  const { done, total } = workoutProgress(workout)
  const elapsed = formatDuration(now - new Date(workout.started_at).getTime())

  return (
    <Link
      href={LOGGER_PATH}
      aria-label={`Resume ${workout.title}, ${elapsed} in, ${done} of ${total} exercises done`}
      className="focus-ring fixed left-3.5 right-3.5 z-40 flex h-14 items-center gap-3 rounded-sheet border border-border-strong bg-surface-raised px-4 shadow-[var(--shadow-overlay)]"
      style={{ bottom: 'calc(18px + 64px + 10px + env(safe-area-inset-bottom))' }}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-pill bg-accent shadow-[0_0_0_4px_var(--lime-soft)]" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold text-primary">{workout.title}</span>
        <span className="mono text-sm text-secondary"> · {elapsed} · {done} of {total}</span>
      </span>
      <span className="flex shrink-0 items-center text-sm text-secondary">
        Resume
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  )
}
