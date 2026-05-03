'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, X, Loader2 } from 'lucide-react'
import { InsightCard } from './InsightCard'
import type { FatigueAssessment, DeloadPrescription } from '@/lib/algorithms'
import { getDeloadRoutineAction } from '@/app/(app)/dashboard/actions'

const CONFIDENCE_COPY = {
  low:    'Your data suggests a lighter week could help.',
  medium: 'Your body is likely due for a deload this week.',
  high:   'Strong signs you need a deload week — your progress is stalling.',
} as const

interface DeloadCardProps {
  assessment: FatigueAssessment
}

export function DeloadCard({ assessment }: DeloadCardProps) {
  const [expanded,   setExpanded]   = useState(false)
  const [routine,    setRoutine]    = useState<DeloadPrescription[] | null>(null)
  const [generating, setGenerating] = useState(false)
  const [sheetOpen,  setSheetOpen]  = useState(false)

  const handleGenerate = async () => {
    setSheetOpen(true)
    if (routine !== null) return
    setGenerating(true)
    try {
      const data = await getDeloadRoutineAction()
      setRoutine(data)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <InsightCard title="Recovery Check" icon="🔋" variant="warning" dismissKey="deload_dismissed_at">
        <p className="text-[13px] text-[var(--text-hi)] leading-relaxed mb-3">
          {CONFIDENCE_COPY[assessment.confidence]}
        </p>

        <div className="space-y-1.5 mb-3">
          {assessment.signals.map((signal, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[var(--rose)] text-xs mt-0.5">✦</span>
              <p className="text-[11px] text-[var(--text-mid)]">{signal}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 h-10 mb-2 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)] border border-[var(--accent-line)] active:scale-[0.98] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-[11px] font-medium text-[var(--accent)] uppercase tracking-widest">
            Generate my deload week
          </span>
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-low)] hover:text-[var(--text-mid)] uppercase tracking-widest transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          What is a deload?
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-2">
            <p className="text-[11px] text-[var(--text-low)] leading-relaxed">
              A deload is a planned lighter training week. Same frequency, but reduce working weight by ~30–40% and stay 3+ reps away from failure.
            </p>
            <p className="text-[11px] text-[var(--text-low)] leading-relaxed">
              It lets joints, tendons, and your nervous system recover so you come back stronger.
            </p>
            <div className="bg-white/[0.03] rounded-[14px] p-3 border border-white/[0.06] space-y-1.5">
              <p className="t-label text-[var(--accent)] mb-2">This week, aim for:</p>
              <p className="text-[11px] text-[var(--text-mid)]">· Same days, same exercises</p>
              <p className="text-[11px] text-[var(--text-mid)]">· 60% of your usual working weight</p>
              <p className="text-[11px] text-[var(--text-mid)]">· Stop 3–4 reps before failure on every set</p>
              <p className="text-[11px] text-[var(--text-mid)]">· One week only, then back to normal</p>
            </div>
          </div>
        )}
      </InsightCard>

      {sheetOpen && (
        <DeloadRoutineSheet routine={routine} isLoading={generating} onClose={() => setSheetOpen(false)} />
      )}
    </>
  )
}

function DeloadRoutineSheet({ routine, isLoading, onClose }: {
  routine: DeloadPrescription[] | null
  isLoading: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-0)] lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[500px] lg:border-l lg:border-[var(--glass-border)] animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border)]">
        <div>
          <p className="t-label mb-0.5">One week only</p>
          <h2 className="t-display-s">Your deload week</h2>
        </div>
        <button onClick={onClose} className="p-2.5 hover:bg-white/[0.04] rounded-xl transition-colors text-[var(--text-mid)]" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-[12px] text-[var(--text-low)] mb-4 leading-relaxed">
          Same days, same exercises. Just lighter — 60% of your last working weight, two fewer reps per set. Three sets each.
        </p>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
          </div>
        )}

        {!isLoading && routine?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[13px] text-[var(--text-low)]">No recent training data found.</p>
            <p className="text-[11px] text-[var(--text-faint)] mt-2">Log a few sessions first.</p>
          </div>
        )}

        {!isLoading && routine && routine.length > 0 && (
          <div className="space-y-2">
            {routine.map(rx => (
              <div key={rx.exerciseId} className="glass p-4">
                <div className="min-w-0 mb-2">
                  <h3 className="text-[13px] font-medium text-[var(--text-hi)] truncate">{rx.exerciseName}</h3>
                  <p className="t-label mt-0.5">{rx.muscleGroup}</p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="mono text-2xl font-medium text-[var(--accent)] tabular-nums">
                    {rx.sets}<span className="text-[var(--accent-line)] mx-0.5">×</span>{rx.reps}
                  </span>
                  <span className="mono text-base font-medium text-[var(--text-mid)] tabular-nums">
                    @ {rx.weight_kg}<span className="text-[10px] text-[var(--text-low)] ml-0.5">kg</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 border-t border-[var(--glass-border)]">
        <p className="t-caption text-center">Resume normal training next week. You'll come back stronger.</p>
      </div>
    </div>
  )
}
