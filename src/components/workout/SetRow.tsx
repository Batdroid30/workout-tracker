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
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -60))
    } else {
      setSwipeOffset(0)
    }
  }

  const handleTouchEnd = () => {
    if (swipeOffset < -30) {
      setSwipeOffset(-60)
    } else {
      setSwipeOffset(0)
    }
    touchStartX.current = null
  }

  const handleDoneClick = () => {
    setSwipeOffset(0)
    onDone()
  }

  return (
    <div className="relative group overflow-hidden rounded-xl">
      {/* Background Delete Button */}
      <div className="absolute inset-y-0 right-0 w-[60px] bg-red-500/20 flex items-center justify-end rounded-xl">
        <button 
          onClick={onRemove}
          className="w-full h-full flex items-center justify-center text-red-500 hover:bg-red-500/30 transition-colors rounded-r-xl"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div 
        className={cn(
          "relative bg-black transition-transform duration-200",
          swipeOffset === 0 && "group-hover:-translate-x-[60px]" // Desktop hover fallback
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={cn(
          "flex items-center gap-2 py-2",
          set.completed ? "opacity-40 grayscale" : "opacity-100"
        )}>
          {/* Set Number */}
      <div className="w-8 shrink-0 flex flex-col items-center justify-center">
        <span className="font-bold text-sm text-zinc-500 bg-zinc-900 rounded-md w-6 h-6 flex items-center justify-center">{set.set_number}</span>
      </div>

      {/* Ghost text / Previous Set */}
      <div className="w-16 shrink-0 flex justify-center text-xs font-mono text-zinc-500">
        {prevSetText}
      </div>

      {/* Weight Stepper */}
      <div className="flex-1 min-w-[76px] sm:min-w-[90px]">
        <NumberStepper 
          value={set.weight_kg} 
          onChange={(val) => onChange({ weight_kg: val })}
          step={2.5}
        />
      </div>

      {/* Reps Stepper */}
      <div className="flex-1 min-w-[76px] sm:min-w-[90px]">
        <NumberStepper 
          value={set.reps} 
          onChange={(val) => onChange({ reps: val })}
          step={1}
        />
      </div>

      {/* Done Checkmark */}
      <button 
        onClick={handleDoneClick}
        className={cn(
          "w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-95",
          set.completed 
            ? "bg-green-500/20 text-green-500" 
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        )}
      >
        <Check className="w-6 h-6" />
      </button>
        </div>
      </div>
    </div>
  )
}
