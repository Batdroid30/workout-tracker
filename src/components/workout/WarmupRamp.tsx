'use client'

import { Plus } from 'lucide-react'

/** Rounds a weight to the nearest barbell-friendly increment (default 2.5 kg). */
function snapToBar(weight: number, step = 2.5): number {
  return Math.round(weight / step) * step
}

interface WarmupRampProps {
  workingWeight: number
  /** Called when the user taps a suggestion — adds it as a warmup set. */
  onAddSet?: (weight: number, reps: number) => void
}

const RAMP: { pct: number; reps: number }[] = [
  { pct: 0.4, reps: 5 },
  { pct: 0.6, reps: 3 },
  { pct: 0.8, reps: 2 },
]

/**
 * Shows three progressive warmup sets (40/60/80 % of working weight).
 * Each suggestion is tappable — tap to add it as a warmup set.
 * Only renders when working weight ≥ 20 kg.
 */
export function WarmupRamp({ workingWeight, onAddSet }: WarmupRampProps) {
  if (workingWeight < 20) return null

  const sets = RAMP.map(r => ({ weight: snapToBar(workingWeight * r.pct), reps: r.reps }))

  return (
    <div className="px-4 py-2.5 border-b border-[#1e293b] bg-[#0c1324]/60">
      <p className="text-[9px] font-black text-[#334155] uppercase tracking-widest mb-2">
        Warmup ramp — tap to add
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {sets.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <button
              onClick={() => onAddSet?.(s.weight, s.reps)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#151b2d] border border-[#334155] hover:border-[#CCFF00]/40 hover:bg-[#CCFF00]/5 active:scale-95 transition-all"
              aria-label={`Add warmup ${s.weight}kg × ${s.reps}`}
            >
              <Plus className="w-2.5 h-2.5 text-[#CCFF00]/60" />
              <span className="text-[11px] font-black text-[#adb4ce]">
                {s.weight}<span className="text-[9px] text-[#334155] ml-0.5">kg</span>
              </span>
              <span className="text-[9px] text-[#4a5568] ml-0.5">×{s.reps}</span>
            </button>
            {i < sets.length - 1 && (
              <span className="text-[#1e293b] text-xs mx-0.5">›</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
