'use client'

import { useState, useTransition } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2, RefreshCw } from 'lucide-react'
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
  /** Training-week position in the phase (src/lib/training-cycle.ts). */
  phaseWeek:       number          | null
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

export function PhaseTransitionCard({ experienceLevel, trainingPhase, phaseWeek }: PhaseTransitionCardProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [switching, setSwitching]  = useState<TrainingPhase | null>(null)

  if (!trainingPhase || phaseWeek === null) return null

  const experience   = experienceLevel ?? 'intermediate'
  const threshold    = DELOAD_THRESHOLDS[experience][trainingPhase]
  const weeksInPhase = phaseWeek - 1

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
    <InsightCard title="Time to switch phases?" icon={<RefreshCw className="w-3.5 h-3.5 text-caution" />} variant="warning" dismissKey="phase_transition_dismissed_at">
      <p className="t-caption text-primary leading-relaxed mb-3">
        You've been <span className="text-primary font-medium">{trainingPhase}</span> for{' '}
        <span className="text-primary font-medium">{Math.floor(weeksInPhase)} weeks</span>.
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
                'flex flex-col items-start gap-1 p-3 rounded-control border text-left min-w-0 transition-all',
                isCurrent
                  ? 'bg-surface-raised border-border opacity-50 cursor-not-allowed'
                  : 'bg-surface-raised border-border hover:border-border-strong hover:bg-surface-raised active:scale-[0.97]',
                pending && !isLoading && 'opacity-50',
              )}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {isLoading
                  ? <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  : <opt.Icon className={cn('w-3 h-3', isCurrent ? 'text-tertiary' : 'text-secondary')} />
                }
                <span className={cn('text-xs font-medium', isCurrent ? 'text-tertiary' : 'text-primary')}>
                  {opt.label}
                </span>
              </div>
              <span className="text-xs text-tertiary leading-snug">
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
