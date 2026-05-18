'use client'

import { useState } from 'react'
import { X, Zap } from 'lucide-react'
import type { ActiveExercise } from '@/types/database'

interface FailureTrainingTipProps {
  exercises: ActiveExercise[]
}

const THRESHOLD = 3

export function FailureTrainingTip({ exercises }: FailureTrainingTipProps) {
  const [dismissed, setDismissed] = useState(false)

  const rpe10Count = exercises.reduce((total, ex) =>
    total + ex.sets.filter(s => s.completed && !s.is_warmup && s.rpe === 10).length,
  0)

  if (dismissed || rpe10Count < THRESHOLD) return null

  return (
    <div
      className="flex items-start gap-3 px-3.5 py-3 rounded-[var(--radius-inner)] mb-2"
      style={{ background: 'rgba(230,163,154,0.08)', border: '1px solid rgba(230,163,154,0.25)' }}
    >
      <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--rose)' }} />

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--rose)' }}>
          High Failure Volume ({rpe10Count} sets at RPE 10)
        </p>
        <p className="text-[11px] text-[var(--text-low)] leading-relaxed">
          Repeatedly training to absolute failure spikes cortisol and blunts recovery without adding meaningful gains over stopping at RPE 8–9 (1–2 RIR). Consider leaving a rep in reserve on remaining sets.
        </p>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded transition-colors hover:bg-white/[0.06]"
        aria-label="Dismiss"
        style={{ color: 'var(--text-faint)' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
