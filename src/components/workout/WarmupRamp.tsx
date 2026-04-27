'use client'

import { Plus } from 'lucide-react'

const BAR_KG = 20

/** Rounds to the nearest standard barbell increment (default 2.5 kg). */
function snapToBar(weight: number, step = 2.5): number {
  return Math.round(weight / step) * step
}

interface WarmupStep {
  weight: number
  reps: number
  /** Display label, e.g. "40%" or "Bar". */
  label: string
}

/**
 * Builds a progressive warmup ramp for a given working weight.
 *
 * Light lifts (< 80 kg)  → 3 steps: 40 % · 60 % · 80 %
 * Heavy lifts (≥ 80 kg)  → 4 steps: 40 % · 60 % · 80 % · 90 %×1
 *
 * Steps that compute ≤ bar weight (20 kg) or collapse to the working weight
 * are silently dropped — no point in a "warmup" that equals the work set.
 */
function buildWarmupRamp(workingWeight: number): WarmupStep[] {
  const basePcts: { pct: number; reps: number }[] =
    workingWeight >= 80
      ? [
          { pct: 0.40, reps: 8 },
          { pct: 0.60, reps: 5 },
          { pct: 0.80, reps: 3 },
          { pct: 0.90, reps: 1 },
        ]
      : [
          { pct: 0.40, reps: 8 },
          { pct: 0.60, reps: 5 },
          { pct: 0.80, reps: 2 },
        ]

  return basePcts
    .map(({ pct, reps }) => ({
      weight: snapToBar(workingWeight * pct),
      reps,
      label: `${Math.round(pct * 100)}%`,
    }))
    .filter(s => s.weight > BAR_KG && s.weight < workingWeight)
}

interface WarmupRampProps {
  workingWeight: number
  /** Called when the user taps a suggestion — adds it as a warmup set. */
  onAddSet?: (weight: number, reps: number) => void
}

/**
 * Shows a progressive warmup ramp based on the working weight.
 * Each chip is tappable and adds that set instantly.
 * Only renders when working weight > bar (20 kg).
 */
export function WarmupRamp({ workingWeight, onAddSet }: WarmupRampProps) {
  if (workingWeight <= BAR_KG) return null

  const steps = buildWarmupRamp(workingWeight)
  if (steps.length === 0) return null

  return (
    <div className="px-4 py-2.5 border-b border-[#1e293b] bg-[#0c1324]/60">
      <p className="text-[9px] font-black text-[#334155] uppercase tracking-widest mb-2">
        Warmup ramp · tap to add
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <button
              onClick={() => onAddSet?.(s.weight, s.reps)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#151b2d] border border-[#334155] hover:border-[#CCFF00]/40 hover:bg-[#CCFF00]/5 active:scale-95 transition-all"
              aria-label={`Add warmup ${s.weight}kg × ${s.reps}`}
            >
              <Plus className="w-2.5 h-2.5 text-[#CCFF00]/50 shrink-0" />
              {/* Percentage label */}
              <span className="text-[8px] font-black text-[#4a5568] uppercase">{s.label}</span>
              {/* Weight */}
              <span className="text-[11px] font-black text-[#adb4ce]">
                {s.weight}<span className="text-[9px] text-[#334155] ml-0.5">kg</span>
              </span>
              {/* Reps */}
              <span className="text-[9px] text-[#4a5568]">×{s.reps}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="text-[#1e293b] text-[10px]">›</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
