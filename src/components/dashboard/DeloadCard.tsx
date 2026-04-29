'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, X, Loader2 } from 'lucide-react'
import { InsightCard } from './InsightCard'
import type { FatigueAssessment } from '@/lib/algorithms'
import type { DeloadPrescription } from '@/lib/algorithms'
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
  const [expanded,    setExpanded]    = useState(false)
  const [routine,     setRoutine]     = useState<DeloadPrescription[] | null>(null)
  const [generating,  setGenerating]  = useState(false)
  const [sheetOpen,   setSheetOpen]   = useState(false)

  // Lazy fetch — only hit the DB when the user actually asks for the routine.
  // Cached on the component for the lifetime of the dashboard view.
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
      <InsightCard
        title="Recovery Check"
        icon="🔋"
        variant="warning"
        dismissKey="deload_dismissed_at"
      >
        <p className="text-sm text-[#dce1fb] font-body leading-relaxed mb-3">
          {CONFIDENCE_COPY[assessment.confidence]}
        </p>

        <div className="space-y-1.5 mb-3">
          {assessment.signals.map((signal, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-orange-400 text-xs mt-0.5">✦</span>
              <p className="text-[11px] text-[#adb4ce] font-body">{signal}</p>
            </div>
          ))}
        </div>

        {/* ── Generate routine button — primary CTA ─────────────────────── */}
        <button
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 h-10 mb-2 rounded-lg bg-[#CCFF00]/10 hover:bg-[#CCFF00]/15 border border-[#CCFF00]/30 hover:border-[#CCFF00]/50 active:scale-[0.98] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#CCFF00]" />
          <span className="text-[11px] font-black text-[#CCFF00] uppercase tracking-widest">
            Generate my deload week
          </span>
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] font-black text-[#4a5568] hover:text-[#adb4ce] uppercase tracking-widest transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          What is a deload?
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#1e293b] space-y-2">
            <p className="text-[11px] text-[#4a5568] font-body leading-relaxed">
              A deload is a planned lighter training week. Same frequency, but reduce your working weight by ~30–40% and stay 3+ reps away from failure.
            </p>
            <p className="text-[11px] text-[#4a5568] font-body leading-relaxed">
              It lets your joints, tendons, and nervous system recover so you can come back stronger the following week.
            </p>
            <div className="bg-[#0c1324] rounded-lg p-3 mt-2 space-y-1.5 border border-[#1e293b]">
              <p className="text-[10px] font-black text-[#CCFF00] uppercase tracking-widest mb-2">This week, aim for:</p>
              <p className="text-[11px] text-[#adb4ce] font-body">· Same days, same exercises</p>
              <p className="text-[11px] text-[#adb4ce] font-body">· 60% of your usual working weight</p>
              <p className="text-[11px] text-[#adb4ce] font-body">· Stop 3–4 reps before failure on every set</p>
              <p className="text-[11px] text-[#adb4ce] font-body">· One week only, then back to normal</p>
            </div>
          </div>
        )}
      </InsightCard>

      {/* ── Deload routine sheet ──────────────────────────────────────────── */}
      {sheetOpen && (
        <DeloadRoutineSheet
          routine={routine}
          isLoading={generating}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}

// ─── Routine sheet ───────────────────────────────────────────────────────────
//
// Bottom-sheet on mobile, side-sheet on desktop — matches the project pattern.
// Read-only for now; just shows the prescription so the user can log it
// during the week. Starting a workout from it is a future enhancement.

interface DeloadRoutineSheetProps {
  routine:   DeloadPrescription[] | null
  isLoading: boolean
  onClose:   () => void
}

function DeloadRoutineSheet({ routine, isLoading, onClose }: DeloadRoutineSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070d1f] lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[500px] lg:border-l lg:border-[#334155] animate-in slide-in-from-bottom duration-300">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#334155]">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#4a5568] leading-none mb-0.5">
            One week only
          </p>
          <h2 className="text-lg font-black italic uppercase tracking-tight text-white">
            Your deload week
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 hover:bg-[#151b2d] rounded-lg transition-colors text-[#adb4ce]"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs font-body text-[#4a5568] mb-4 leading-relaxed">
          Same days, same exercises. Just lighter — 60% of your last working weight,
          two fewer reps per set. Three sets each. Stop well short of failure.
        </p>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[#CCFF00] animate-spin" />
          </div>
        )}

        {!isLoading && routine && routine.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-[#4a5568] font-body">
              No recent training data found.
            </p>
            <p className="text-[11px] text-[#334155] font-body mt-2">
              Log a few sessions first, then come back for your deload prescription.
            </p>
          </div>
        )}

        {!isLoading && routine && routine.length > 0 && (
          <div className="space-y-2">
            {routine.map(rx => (
              <div
                key={rx.exerciseId}
                className="glass-panel rounded-xl border border-[#334155] p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">
                      {rx.exerciseName}
                    </h3>
                    <p className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.15em] mt-0.5">
                      {rx.muscleGroup}
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-black text-[#CCFF00] tabular-nums tracking-tight">
                    {rx.sets}<span className="text-[#CCFF00]/40 mx-0.5">×</span>{rx.reps}
                  </span>
                  <span className="text-base font-black text-[#adb4ce] tabular-nums">
                    @ {rx.weight_kg}<span className="text-[10px] text-[#4a5568] ml-0.5">kg</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="p-4 border-t border-[#334155]">
        <p className="text-[10px] text-[#4a5568] font-body text-center">
          Resume normal training next week. You'll come back stronger.
        </p>
      </div>
    </div>
  )
}
