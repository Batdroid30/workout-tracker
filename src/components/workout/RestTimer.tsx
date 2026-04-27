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
 *
 * Fix notes:
 *  - onComplete / onSkip held in refs so they never appear in effect deps,
 *    preventing the interval from being recreated on every parent re-render.
 *  - Skip button uses onPointerDown (fires before scroll capture) with a
 *    large touch target so it reliably registers on mobile.
 */
export function RestTimer({ seconds = 90, onSkip, onComplete }: RestTimerProps) {
  const [total,    setTotal]    = useState(seconds)
  const [timeLeft, setTimeLeft] = useState(seconds)

  // Stable refs so callbacks never cause the effect to re-run
  const onSkipRef     = useRef(onSkip)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onSkipRef.current     = onSkip     }, [onSkip])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  // Single interval for the countdown — only depends on stable values
  useEffect(() => {
    if (timeLeft <= 0) {
      onCompleteRef.current?.()
      return
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
  // timeLeft is the only real dependency here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  const adjust = useCallback((delta: number) => {
    setTotal(prev => Math.max(10, prev + delta))
    setTimeLeft(t => Math.max(1, t + delta))
  }, [])

  const handleSkip = useCallback(() => onSkipRef.current(), [])

  const mins     = Math.floor(timeLeft / 60)
  const secs     = timeLeft % 60
  const progress = (timeLeft / total) * 100
  const urgent   = timeLeft <= 10

  if (timeLeft <= 0) return null

  return (
    <div className="fixed bottom-[72px] left-0 right-0 bg-[#070d1f]/95 backdrop-blur border-t border-[#334155] px-4 py-3 z-40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Timer className={`w-4 h-4 ${urgent ? 'text-orange-400 animate-pulse' : 'text-[#CCFF00] animate-pulse'}`} />
          <span className={`font-black text-xl tracking-tighter tabular-nums ${urgent ? 'text-orange-400' : 'text-white'}`}>
            {mins}:{secs < 10 ? '0' : ''}{secs}
          </span>
          <span className="text-[10px] font-black text-[#4a5568] uppercase tracking-widest">Rest</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onPointerDown={() => adjust(-30)}
            className="h-9 px-3 bg-[#151b2d] border border-[#334155] rounded-lg text-[#adb4ce] hover:text-white text-[10px] font-black transition-colors active:scale-95 touch-manipulation"
          >
            −30
          </button>
          <button
            onPointerDown={() => adjust(30)}
            className="h-9 px-3 bg-[#151b2d] border border-[#334155] rounded-lg text-[#adb4ce] hover:text-white text-[10px] font-black transition-colors active:scale-95 touch-manipulation"
          >
            +30
          </button>

          {/* Skip — tall touch target, onPointerDown fires before scroll capture */}
          <button
            onPointerDown={handleSkip}
            className="h-9 px-4 flex items-center gap-1.5 bg-[#151b2d] border border-[#334155] rounded-lg text-[#adb4ce] hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors active:scale-95 touch-manipulation"
          >
            <X className="w-3.5 h-3.5" /> Skip
          </button>
        </div>
      </div>

      <div className="h-1 bg-[#151b2d] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${urgent ? 'bg-orange-400' : 'bg-[#CCFF00]'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
