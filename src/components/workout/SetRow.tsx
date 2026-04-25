'use client'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { Check, Trash2 } from 'lucide-react'
import { useState, useRef } from 'react'
import type { ActiveSet } from '@/types/database'
import { cn } from '@/lib/utils'

interface SetRowProps {
  set: ActiveSet
  prevSetText?: string
  onChange: (updates: Partial<ActiveSet>) => void
  onDone: () => void
  onRemove: () => void
}

export function SetRow({ set, prevSetText = "-", onChange, onDone, onRemove }: SetRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.touches[0].clientX - touchStartX.current
    if (diff < 0) setSwipeOffset(Math.max(diff, -60))
    else setSwipeOffset(0)
  }

  const handleTouchEnd = () => {
    if (swipeOffset < -30) setSwipeOffset(-60)
    else setSwipeOffset(0)
    touchStartX.current = null
  }

  const handleDoneClick = () => {
    setSwipeOffset(0)
    onDone()
  }

  return (
    <div className="relative group overflow-hidden rounded-lg mb-1">
      {/* Background Delete */}
      <div className="absolute inset-y-0 right-0 w-[60px] bg-red-500/10 flex items-center justify-end rounded-lg">
        <button
          onClick={onRemove}
          className="w-full h-full flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors rounded-r-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div
        className={cn(
          "relative bg-[#070d1f] transition-transform duration-200",
          swipeOffset === 0 && "group-hover:-translate-x-[60px]"
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={cn(
          "flex items-center gap-2 py-2",
          set.completed ? "opacity-40" : "opacity-100"
        )}>
          {/* Set Number */}
          <div className="w-8 shrink-0 flex items-center justify-center">
            <span className={cn(
              "font-black text-xs w-6 h-6 flex items-center justify-center rounded",
              set.is_warmup ? "bg-orange-500/10 text-orange-400" : "bg-[#151b2d] text-[#adb4ce]"
            )}>
              {set.is_warmup ? 'W' : set.set_number}
            </span>
          </div>

          {/* Previous */}
          <div className="w-16 shrink-0 flex justify-center text-[11px] font-body text-[#4a5568]">
            {prevSetText}
          </div>

          {/* Weight */}
          <div className="flex-1 min-w-[76px]">
            <NumberStepper
              value={set.weight_kg}
              onChange={(val) => onChange({ weight_kg: val })}
              step={2.5}
            />
          </div>

          {/* Reps */}
          <div className="flex-1 min-w-[76px]">
            <NumberStepper
              value={set.reps}
              onChange={(val) => onChange({ reps: val })}
              step={1}
            />
          </div>

          {/* Done */}
          <button
            onClick={handleDoneClick}
            className={cn(
              "w-12 h-10 shrink-0 rounded-lg flex items-center justify-center transition-all active:scale-95 font-black text-xs uppercase tracking-wider border",
              set.completed
                ? "bg-[#CCFF00] text-[#020617] border-[#CCFF00]"
                : "bg-[#151b2d] text-[#334155] border-[#334155] hover:border-[#CCFF00]/50 hover:text-[#CCFF00]/50"
            )}
          >
            {set.completed ? <Check className="w-4 h-4" strokeWidth={3} /> : <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
