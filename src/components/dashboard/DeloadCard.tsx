'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, X, Loader2, Activity } from 'lucide-react'
import { Button, IconButton } from '@/components/ui'
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
      const data = await getDeloadRoutineAction(assessment.confidence)
      setRoutine(data)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <InsightCard title="Recovery Check" icon={<Activity className="w-3.5 h-3.5 text-caution" />} variant="warning" dismissKey="deload_dismissed_at">
        <p className="t-caption text-primary leading-relaxed mb-3">
          {CONFIDENCE_COPY[assessment.confidence]}
        </p>

        <div className="space-y-1.5 mb-3">
          {assessment.signals.map((signal, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 block bg-caution" />
              <p className="t-caption text-secondary">{signal}</p>
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerate}
          leadingIcon={<Sparkles className="w-3.5 h-3.5" />}
          className="mb-2"
        >
          Generate my deload week
        </Button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-tertiary hover:text-secondary transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          What is a deload?
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <p className="t-caption text-tertiary leading-relaxed">
              A deload is a planned lighter training week. Same frequency, but reduce working weight by ~30–40% and stay 3+ reps away from failure.
            </p>
            <p className="t-caption text-tertiary leading-relaxed">
              It lets joints, tendons, and your nervous system recover so you come back stronger.
            </p>
            <div className="bg-surface-raised rounded-control p-3 border border-border space-y-1.5">
              <p className="t-label text-primary mb-2">This week, aim for:</p>
              <p className="t-caption text-secondary">· Same days, same exercises</p>
              <p className="t-caption text-secondary">· 60% of your usual working weight</p>
              <p className="t-caption text-secondary">· Stop 3–4 reps before failure on every set</p>
              <p className="t-caption text-secondary">· One week only, then back to normal</p>
            </div>
          </div>
        )}
      </InsightCard>

      {sheetOpen && (
        <DeloadRoutineSheet
          routine={routine}
          isLoading={generating}
          confidence={assessment.confidence}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}

const DELOAD_SHEET_COPY: Record<FatigueAssessment['confidence'], { subtitle: string; description: string }> = {
  low: {
    subtitle:    'Light taper week',
    description: 'Same exercises, same days. Work at 75% of your usual load for 3 sets — just enough to take the foot off the gas without losing any progress.',
  },
  medium: {
    subtitle:    'Standard deload week',
    description: 'Same exercises, same days. Drop to 65% of your usual load for 3 sets. This lets your joints, tendons and nervous system recover so you come back stronger.',
  },
  high: {
    subtitle:    'Deep recovery week',
    description: 'Strong fatigue signals detected. Work at 55% of your usual load for 2 sets per exercise — treat this week as restoration, not training. One week is all it takes.',
  },
}

function DeloadRoutineSheet({ routine, isLoading, confidence, onClose }: {
  routine:    DeloadPrescription[] | null
  isLoading:  boolean
  confidence: FatigueAssessment['confidence']
  onClose:    () => void
}) {
  const copy = DELOAD_SHEET_COPY[confidence]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[500px] lg:border-l lg:border-border animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="t-label mb-0.5">{copy.subtitle}</p>
          <h2 className="t-display-s">Your deload week</h2>
        </div>
        <IconButton onClick={onClose} aria-label="Close">
          <X className="w-5 h-5" />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-xs text-tertiary mb-4 leading-relaxed">
          {copy.description}
        </p>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {!isLoading && routine?.length === 0 && (
          <div className="text-center py-12">
            <p className="t-caption text-tertiary">No recent training data found.</p>
            <p className="t-caption text-tertiary mt-2">Log a few sessions first.</p>
          </div>
        )}

        {!isLoading && routine && routine.length > 0 && (
          <div className="space-y-2">
            {routine.map(rx => (
              <div key={rx.exerciseId} className="card p-4">
                <div className="min-w-0 mb-2">
                  <h3 className="t-caption font-medium text-primary truncate">{rx.exerciseName}</h3>
                  <p className="t-label mt-0.5">{rx.muscleGroup}</p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="mono text-2xl font-medium text-primary tabular-nums">
                    {rx.sets}<span className="text-tertiary mx-0.5">×</span>{rx.reps}
                  </span>
                  <span className="mono text-base font-medium text-secondary tabular-nums">
                    @ {rx.weight_kg}<span className="text-xs text-tertiary ml-0.5">kg</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 border-t border-border">
        <p className="t-caption text-center">Resume normal training next week. You'll come back stronger.</p>
      </div>
    </div>
  )
}
