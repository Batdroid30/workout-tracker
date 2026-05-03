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
      className="px-4 py-2.5"
      style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}
    >
      <p className="text-[9px] font-medium text-[var(--text-faint)] uppercase tracking-widest mb-2">
        Warmup ramp · tap to add
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <button
              onClick={() => onAddSet?.(s.weight, s.reps)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
              aria-label={`Add warmup ${s.weight}kg × ${s.reps}`}
            >
              <Plus className="w-2.5 h-2.5 text-orange-400/60 shrink-0" />
              <span className="text-[8px] font-medium text-[var(--text-faint)] uppercase">{s.label}</span>
              <span className="mono text-[11px] text-[var(--text-mid)]">
                {s.weight}<span className="text-[9px] text-[var(--text-faint)] ml-0.5">kg</span>
              </span>
              <span className="text-[9px] text-[var(--text-faint)]">×{s.reps}</span>
            </button>
            {i < steps.length - 1 && <span className="text-[var(--text-faint)] text-[10px]">›</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
