'use client'

import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { Chip } from '@/components/ui'
import type { PRCheckResult, PRType } from '@/types/database'
import { formatVolume, formatWeightedPR } from '@/lib/load'
import { useWorkoutStore } from '@/store/workout.store'

interface PRBannerProps {
  prs: PRCheckResult[]
  exerciseName: string
  isWeighted?: boolean
  isAssisted?: boolean
  onDismiss: () => void
  duration?: number
}

const PR_CONFIG: Record<PRType, { label: string }> = {
  best_weight: { label: 'Weight PR' },
  best_1rm:    { label: 'Est. 1RM' },
  best_volume: { label: 'Volume' },
}

function formatValue(prType: PRType, value: number, weightedBodyweightKg: number | null): string {
  if (prType === 'best_1rm') return `${value.toFixed(1)} kg`
  if (prType === 'best_volume') return `${formatVolume(value)} kg`
  if (weightedBodyweightKg !== null) return formatWeightedPR(value, weightedBodyweightKg)
  return `${value} kg`
}

export function PRBanner({ prs, exerciseName, isWeighted, isAssisted, onDismiss, duration = 5000 }: PRBannerProps) {
  const userBodyweight = useWorkoutStore(s => s.userBodyweight) ?? 75
  const weightedBodyweightKg = isWeighted ? userBodyweight : null
  const [visible,  setVisible]  = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const step      = 50
    const decrement = (step / duration) * 100
    const interval  = setInterval(() => {
      setProgress(p => {
        if (p <= 0) { clearInterval(interval); return 0 }
        return p - decrement
      })
    }, step)
    const dismissTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, duration)
    return () => { clearInterval(interval); clearTimeout(dismissTimer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (prs.length === 0) return null

  return (
    <div
      className={`fixed bottom-[72px] left-3 right-3 z-50 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
    >
      <div
        className="rounded-card bg-surface-raised border border-border shadow-[var(--shadow-overlay)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-control flex items-center justify-center shrink-0 bg-accent-soft"
            >
              <Trophy className="w-4 h-4 text-accent" />
            </div>
            <div>
              <Chip tone="accent">
                {prs.length === 1 ? 'New record' : `${prs.length} new records`}
              </Chip>
              <p className="text-xs text-tertiary truncate max-w-[180px] mt-0.5">{exerciseName}</p>
            </div>
          </div>
          <button
            onPointerDown={onDismiss}
            className="text-xs font-medium text-secondary hover:text-primary px-3 min-h-11 rounded-pill bg-surface border border-border transition-colors active:scale-95"
          >
            Got it
          </button>
        </div>

        {/* PR rows */}
        <div className="px-4 pb-3 space-y-1.5">
          {prs.map(pr => {
            const cfg = PR_CONFIG[pr.pr_type]
            return (
              <div key={pr.pr_type} className="flex items-center justify-between rounded-control px-3 py-2 bg-surface">
                <span className="text-xs font-semibold text-secondary">
                  {isAssisted && pr.pr_type === 'best_weight' ? 'Less assistance' : cfg.label}
                </span>
                <span className="mono text-sm text-primary tabular-nums">
                  {pr.old_value !== null && (
                    <span className="text-xs text-tertiary mr-2 line-through">{formatValue(pr.pr_type, pr.old_value, weightedBodyweightKg)}</span>
                  )}
                  {formatValue(pr.pr_type, pr.new_value, weightedBodyweightKg)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Countdown bar */}
        <div className="h-0.5 bg-surface">
          <div
            className="h-full transition-none bg-accent"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
