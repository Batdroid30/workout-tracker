'use client'
import { useState, useEffect } from 'react'
import { Timer, X } from 'lucide-react'

export function RestTimer({ seconds = 90, onSkip }: { seconds?: number, onSkip: () => void }) {
  const [timeLeft, setTimeLeft] = useState(seconds)

  useEffect(() => {
    if (timeLeft <= 0) return
    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(interval)
  }, [timeLeft])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const progress = (timeLeft / seconds) * 100

  if (timeLeft <= 0) return null

  return (
    <div className="fixed bottom-[72px] left-0 right-0 bg-[#070d1f]/95 backdrop-blur border-t border-[#334155] px-4 py-3 z-40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-[#CCFF00] animate-pulse" />
          <span className="font-black text-xl text-white tracking-tighter tabular-nums">
            {mins}:{secs < 10 ? '0' : ''}{secs}
          </span>
          <span className="text-[10px] font-black text-[#4a5568] uppercase tracking-widest">Rest</span>
        </div>
        <button
          onClick={onSkip}
          className="h-7 px-3 flex items-center gap-1 bg-[#151b2d] border border-[#334155] rounded-lg text-[#adb4ce] hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors active:scale-95"
        >
          <X className="w-3 h-3" /> Skip
        </button>
      </div>
      <div className="h-1 bg-[#151b2d] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#CCFF00] transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
