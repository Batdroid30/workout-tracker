'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Timer, X } from 'lucide-react'

interface RestTimerProps {
  seconds?: number
  onSkip: () => void
  onComplete?: () => void
}

/**
 * Countdown rest timer docked above the bottom nav.
 * +30 / -30 buttons let the user adjust mid-countdown.
 * Calls onComplete when the clock hits zero, onSkip when dismissed early.
 */
export function RestTimer({ seconds = 90, onSkip, onComplete }: RestTimerProps) {
  const [total,    setTotal]    = useState(seconds)
  const [timeLeft, setTimeLeft] = useState(seconds)

  const onSkipRef     = useRef(onSkip)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onSkipRef.current     = onSkip     }, [onSkip])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    if (timeLeft <= 0) { onCompleteRef.current?.(); return }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  const adjust      = useCallback((delta: number) => {
    setTotal(prev => Math.max(10, prev + delta))
    setTimeLeft(t => Math.max(1, t + delta))
  }, [])
  const handleSkip  = useCallback(() => onSkipRef.current(), [])

  const mins     = Math.floor(timeLeft / 60)
  const secs     = timeLeft % 60
  const progress = (timeLeft / total) * 100
  const urgent   = timeLeft <= 10

  if (timeLeft <= 0) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 px-4 pt-3 z-40 bg-bg border-t border-border"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Timer className={`w-4 h-4 animate-pulse ${urgent ? 'text-caution' : 'text-secondary'}`} />
          <span className={`mono text-xl tracking-tighter tabular-nums ${urgent ? 'text-caution' : 'text-primary'}`}>
            {mins}:{secs < 10 ? '0' : ''}{secs}
          </span>
          <span className="text-xs font-medium text-tertiary">Rest</span>
        </div>

        <div className="flex items-center gap-2">
          {[{ label: '−30', delta: -30 }, { label: '+30', delta: 30 }].map(btn => (
            <button
              key={btn.label}
              onPointerDown={() => adjust(btn.delta)}
              className="min-h-11 px-3 rounded-control mono text-xs text-secondary hover:text-primary bg-surface border border-border transition-colors active:scale-95 touch-manipulation"
            >
              {btn.label}
            </button>
          ))}

          <button
            onPointerDown={handleSkip}
            className="min-h-11 px-4 flex items-center gap-1.5 rounded-control text-secondary hover:text-primary mono text-xs bg-surface border border-border transition-colors active:scale-95 touch-manipulation"
          >
            <X className="w-3.5 h-3.5" /> Skip
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden bg-surface-raised">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${urgent ? 'bg-caution' : 'bg-primary'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
