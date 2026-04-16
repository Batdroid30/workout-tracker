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
    <div className="fixed bottom-[60px] left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 z-40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-brand">
          <Timer className="w-5 h-5 animate-pulse" />
          <span className="font-mono font-bold text-xl">{mins}:{secs < 10 ? '0' : ''}{secs}</span>
        </div>
        <button onClick={onSkip} className="h-8 w-8 flex items-center justify-center bg-zinc-800 rounded-full text-zinc-400 active:scale-95">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-brand transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
