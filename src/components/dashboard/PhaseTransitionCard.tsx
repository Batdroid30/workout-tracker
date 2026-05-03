'use client'

import { useState, useTransition } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { InsightCard } from './InsightCard'
import { updateTrainingProfileAction } from '@/app/(app)/profile/actions'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import { cn } from '@/lib/utils'
import type { TrainingPhase, ExperienceLevel } from '@/types/database'

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
  { key: 'bulking',     label: 'Bulking',     blurb: 'Surplus, build size',     Icon: TrendingUp   },
  { key: 'cutting',     label: 'Cutting',     blurb: 'Deficit, lose fat',       Icon: TrendingDown },
  { key: 'maingaining', label: 'Maingaining', blurb: 'Maintenance, slow gains', Icon: Minus        },
]

export function PhaseTransitionCard({ experienceLevel, trainingPhase, phaseStartedAt }: PhaseTransitionCardProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [switching, setSwitching]  = useState<TrainingPhase | null>(null)

  if (!trainingPhase || !phaseStartedAt) return null

  const experience   = experienceLevel ?? 'intermediate'
  const threshold    = DELOAD_THRESHOLDS[experience][trainingPhase]
  const weeksInPhase = (Date.now() - new Date(phaseStartedAt).getTime()) / (7 * 86400000)

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
    <InsightCard title="Time to switch phases?" icon="🔄" variant="warning" dismissKey="phase_transition_dismissed_at">
      <p className="text-[13px] text-[var(--text-hi)] leading-relaxed mb-3">
        You've been <span className="text-[var(--text-hi)] font-medium">{trainingPhase}</span> for{' '}
        <span className="text-[var(--text-hi)] font-medium">{Math.floor(weeksInPhase)} weeks</span>.
        Most cycles cap out around {threshold} weeks. Pick what's next.
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
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-[14px] border text-left transition-all',
                isCurrent
                  ? 'bg-white/[0.03] border-[var(--glass-border)] opacity-50 cursor-not-allowed'
                  : 'bg-white/[0.03] border-[var(--glass-border)] hover:border-[var(--accent-line)] hover:bg-[var(--accent-soft)] active:scale-[0.97]',
                pending && !isLoading && 'opacity-50',
              )}
            >
              <div className="flex items-center gap-1.5">
                {isLoading
                  ? <Loader2 className="w-3 h-3 text-[var(--accent)] animate-spin" />
                  : <opt.Icon className={cn('w-3 h-3', isCurrent ? 'text-[var(--text-faint)]' : 'text-[var(--accent)]/60')} />
                }
                <span className={cn('text-[11px] font-medium uppercase tracking-tight', isCurrent ? 'text-[var(--text-low)]' : 'text-[var(--text-hi)]')}>
                  {opt.label}
                </span>
              </div>
              <span className="text-[9px] text-[var(--text-low)] leading-snug">
                {isCurrent ? 'Current' : opt.blurb}
              </span>
            </button>
          )
        })}
      </div>

      <p className="t-caption mt-3">
        Switching resets your mesocycle clock. You can change again anytime in profile.
      </p>
    </InsightCard>
  )
}
