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
      className="fixed bottom-[72px] left-0 right-0 px-4 py-3 z-40"
      style={{
        background: 'rgba(6,7,13,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Timer className={`w-4 h-4 animate-pulse ${urgent ? 'text-orange-400' : 'text-[var(--accent)]'}`} />
          <span className={`mono text-xl tracking-tighter tabular-nums ${urgent ? 'text-orange-400' : 'text-[var(--text-hi)]'}`}>
            {mins}:{secs < 10 ? '0' : ''}{secs}
          </span>
          <span className="text-[10px] font-medium text-[var(--text-faint)] uppercase tracking-widest">Rest</span>
        </div>

        <div className="flex items-center gap-2">
          {[{ label: '−30', delta: -30 }, { label: '+30', delta: 30 }].map(btn => (
            <button
              key={btn.label}
              onPointerDown={() => adjust(btn.delta)}
              className="h-9 px-3 rounded-[var(--radius-inner)] mono text-[10px] text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors active:scale-95 touch-manipulation"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
            >
              {btn.label}
            </button>
          ))}

          <button
            onPointerDown={handleSkip}
            className="h-9 px-4 flex items-center gap-1.5 rounded-[var(--radius-inner)] text-[var(--text-mid)] hover:text-[var(--text-hi)] mono text-[10px] uppercase tracking-widest transition-colors active:scale-95 touch-manipulation"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
          >
            <X className="w-3.5 h-3.5" /> Skip
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full transition-all duration-1000 ease-linear rounded-full"
          style={{
            width: `${progress}%`,
            background: urgent ? '#f97316' : 'var(--accent)',
          }}
        />
      </div>
    </div>
  )
}
