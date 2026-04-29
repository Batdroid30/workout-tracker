'use client'

import { useState, useTransition } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { InsightCard } from './InsightCard'
import { updateTrainingProfileAction } from '@/app/(app)/profile/actions'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import type { TrainingPhase, ExperienceLevel } from '@/types/database'

// ─── Phase transition prompt ──────────────────────────────────────────────────
//
// Shown when the user has been on a single training phase noticeably longer
// than the recommended cycle length for their experience level + phase.
// Most cycles cap out at ~6-10 weeks before diminishing returns set in.
//
// Threshold: DELOAD_THRESHOLDS + 4 weeks of grace. The +4 prevents this card
// from competing with the DeloadCard, which fires earlier on the same signal.
//
// Tap a phase tile → updateTrainingProfileAction is called, which also resets
// phase_started_at to now (per the action's existing contract). The dashboard
// re-renders fresh data via router.refresh().

const TRANSITION_GRACE_WEEKS = 4

interface PhaseTransitionCardProps {
  experienceLevel: ExperienceLevel | null
  trainingPhase:   TrainingPhase   | null
  phaseStartedAt:  string          | null
}

interface PhaseOption {
  key:   TrainingPhase
  label: string
  blurb: string
  Icon:  typeof TrendingUp
}

const PHASE_OPTIONS: PhaseOption[] = [
  { key: 'bulking',     label: 'Bulking',      blurb: 'Surplus, build size',     Icon: TrendingUp   },
  { key: 'cutting',     label: 'Cutting',      blurb: 'Deficit, lose fat',       Icon: TrendingDown },
  { key: 'maingaining', label: 'Maingaining',  blurb: 'Maintenance, slow gains', Icon: Minus        },
]

export function PhaseTransitionCard({
  experienceLevel,
  trainingPhase,
  phaseStartedAt,
}: PhaseTransitionCardProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [switching, setSwitching] = useState<TrainingPhase | null>(null)

  // Need all three pieces to compute overdue status — bail out cleanly otherwise.
  if (!trainingPhase || !phaseStartedAt) return null

  const experience  = experienceLevel ?? 'intermediate'
  const threshold   = DELOAD_THRESHOLDS[experience][trainingPhase]
  const weeksInPhase = (Date.now() - new Date(phaseStartedAt).getTime()) / (7 * 86400000)

  // Card stays hidden until well past the deload threshold, so it doesn't
  // double up with the DeloadCard's mesocycle signal.
  if (weeksInPhase < threshold + TRANSITION_GRACE_WEEKS) return null

  const handleSwitch = (next: TrainingPhase) => {
    if (next === trainingPhase || switching) return
    setSwitching(next)
    startTransition(async () => {
      try {
        await updateTrainingProfileAction({ training_phase: next })
        router.refresh()
      } finally {
        setSwitching(null)
      }
    })
  }

  return (
    <InsightCard
      title="Time to switch phases?"
      icon="🔄"
      variant="warning"
      dismissKey="phase_transition_dismissed_at"
    >
      <p className="text-sm text-[#dce1fb] font-body leading-relaxed mb-3">
        You've been <span className="text-white font-black">{trainingPhase}</span> for{' '}
        <span className="text-white font-black">{Math.floor(weeksInPhase)} weeks</span>.
        Most cycles cap out around {threshold} weeks before progress slows. Pick what's next.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {PHASE_OPTIONS.map(opt => {
          const isCurrent = opt.key === trainingPhase
          const isLoading = switching === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => handleSwitch(opt.key)}
              disabled={isCurrent || pending}
              className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                isCurrent
                  ? 'bg-[#0c1324] border-[#334155] opacity-50 cursor-not-allowed'
                  : 'bg-[#0c1324] border-[#334155] hover:border-[#CCFF00]/40 hover:bg-[#CCFF00]/5 active:scale-[0.97]'
              } ${pending && !isLoading ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                {isLoading
                  ? <Loader2 className="w-3 h-3 text-[#CCFF00] animate-spin" />
                  : <opt.Icon className={`w-3 h-3 ${isCurrent ? 'text-[#4a5568]' : 'text-[#CCFF00]/60'}`} />
                }
                <span className={`text-[11px] font-black uppercase tracking-tight ${isCurrent ? 'text-[#4a5568]' : 'text-white'}`}>
                  {opt.label}
                </span>
              </div>
              <span className="text-[9px] font-body text-[#4a5568] leading-snug">
                {isCurrent ? 'Current' : opt.blurb}
              </span>
            </button>
          )
        })}
      </div>

      <p className="text-[10px] text-[#4a5568] font-body mt-3">
        Switching resets your mesocycle clock. You can change again anytime in your profile.
      </p>
    </InsightCard>
  )
}
