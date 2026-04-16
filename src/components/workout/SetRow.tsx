'use client'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { Check } from 'lucide-react'
import type { ActiveSet } from '@/types/database'
import { cn } from '@/lib/utils'

interface SetRowProps {
  set: ActiveSet
  prevSetText?: string
  onChange: (updates: Partial<ActiveSet>) => void
  onDone: () => void
}

export function SetRow({ set, prevSetText = "-", onChange, onDone }: SetRowProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 py-2 transition-colors",
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
      <div className="flex-1 min-w-[90px]">
        <NumberStepper 
          value={set.weight_kg} 
          onChange={(val) => onChange({ weight_kg: val })}
          step={2.5}
        />
      </div>

      {/* Reps Stepper */}
      <div className="flex-1 min-w-[90px]">
        <NumberStepper 
          value={set.reps} 
          onChange={(val) => onChange({ reps: val })}
          step={1}
        />
      </div>

      {/* Done Checkmark */}
      <button 
        onClick={onDone}
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
  )
}
