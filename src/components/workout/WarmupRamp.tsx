'use client'

import { Plus } from 'lucide-react'

const BAR_KG = 20

function snapToBar(weight: number, step = 2.5): number {
  return Math.round(weight / step) * step
}

interface WarmupStep {
  weight: number
  reps: number
  label: string
}

function buildWarmupRamp(workingWeight: number): WarmupStep[] {
  const basePcts: { pct: number; reps: number }[] =
    workingWeight >= 80
      ? [{ pct: 0.40, reps: 8 }, { pct: 0.60, reps: 5 }, { pct: 0.80, reps: 3 }, { pct: 0.90, reps: 1 }]
      : [{ pct: 0.40, reps: 8 }, { pct: 0.60, reps: 5 }, { pct: 0.80, reps: 2 }]

  return basePcts
    .map(({ pct, reps }) => ({ weight: snapToBar(workingWeight * pct), reps, label: `${Math.round(pct * 100)}%` }))
    .filter(s => s.weight > BAR_KG && s.weight < workingWeight)
}

interface WarmupRampProps {
  workingWeight: number
  onAddSet?: (weight: number, reps: number) => void
}

export function WarmupRamp({ workingWeight, onAddSet }: WarmupRampProps) {
  if (workingWeight <= BAR_KG) return null

  const steps = buildWarmupRamp(workingWeight)
  if (steps.length === 0) return null

  return (
    <div
      className="px-4 py-2.5 border-b border-border bg-surface"
    >
      <p className="text-xs font-medium text-tertiary mb-2">
        Warmup ramp · tap to add
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <button
              onClick={() => onAddSet?.(s.weight, s.reps)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-surface-raised border border-border transition-all active:scale-95"
              aria-label={`Add warmup ${s.weight}kg × ${s.reps}`}
            >
              <Plus className="w-2.5 h-2.5 text-caution shrink-0" />
              <span className="text-xs font-medium text-tertiary">{s.label}</span>
              <span className="mono text-xs text-secondary">
                {s.weight}<span className="text-xs text-tertiary ml-0.5">kg</span>
              </span>
              <span className="text-xs text-tertiary">×{s.reps}</span>
            </button>
            {i < steps.length - 1 && <span className="text-tertiary text-xs">›</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
