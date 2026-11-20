'use client'

import { useEffect } from 'react'
import { useNow } from '@/hooks/useNow'
import { formatDuration, restRemainingMs } from '@/lib/time'
import type { ActiveWorkout } from '@/types/database'

const OVER_VISIBLE_MS = 3000
const VIBRATE_MS = 200
const EXTEND_SECONDS = 30

interface RestBarProps {
  rest: ActiveWorkout['rest']
  onExtend: (seconds: number) => void
  onSkip: () => void
}

// Floating rest countdown. It reads an end time, so it is right the moment the
// lifter comes back to the app, however long the phone slept.
export function RestBar({ rest, onExtend, onSkip }: RestBarProps) {
  const now = useNow()
  const remaining = restRemainingMs(rest, now)
  const isOver = remaining === 0

  useEffect(() => {
    if (!isOver) return
    if (document.visibilityState === 'visible') navigator.vibrate?.(VIBRATE_MS)
    const timer = setTimeout(onSkip, OVER_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [isOver, onSkip])

  if (!rest || remaining === null) return null

  const progress = rest.totalSeconds > 0 ? 1 - remaining / (rest.totalSeconds * 1000) : 1
  const label = rest.nextLabel ? `Rest · then ${rest.nextLabel}` : 'Rest'

  return (
    <div
      role="timer"
      aria-live="polite"
      className="fixed left-3.5 right-3.5 z-40 overflow-hidden rounded-sheet border border-border-strong bg-surface-raised shadow-[var(--shadow-overlay)]"
      style={{ bottom: 'calc(18px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex h-16 items-center gap-3 pl-5 pr-2">
        {isOver ? (
          <p className="flex-1 text-base font-semibold text-positive">Rest over</p>
        ) : (
          <>
            <span className="t-stat">{formatDuration(remaining)}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-secondary">{label}</span>
            <button
              type="button"
              onClick={() => onExtend(EXTEND_SECONDS)}
              className="focus-ring min-h-11 rounded-pill border border-border bg-surface px-4 text-sm font-medium text-primary"
            >
              +30s
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onSkip}
          className="focus-ring min-h-11 rounded-pill border border-border bg-surface px-4 text-sm font-medium text-primary"
        >
          {isOver ? 'Close' : 'Skip'}
        </button>
      </div>
      <div className="h-[3px] bg-border">
        <div className="h-full bg-secondary transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </div>
    </div>
  )
}
