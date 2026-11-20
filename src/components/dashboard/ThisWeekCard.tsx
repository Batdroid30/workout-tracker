'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Pencil, Target, X } from 'lucide-react'
import { updateWeeklyGoalAction } from '@/app/(app)/profile/actions'
import { cn } from '@/lib/utils'
import { getButtonClassName } from '@/components/ui'
import type { Mission, MissionPriority } from '@/lib/data/phase-coach'
import type { WeeklySummary, NextWorkoutSuggestion } from '@/lib/data/insights'
import { getCurrentDUPScheme } from '@/lib/workout-intelligence'

interface ThisWeekCardProps {
  thisWeekCount:  number
  goalSessions:   number
  weeklySummary:  WeeklySummary
  missions:       Mission[]
  nextWorkout:    NextWorkoutSuggestion | null
  isDeloadWeek?:  boolean
}

const PRIORITY_BAR_CLASS: Record<MissionPriority, string> = {
  critical: 'bg-negative',
  high:     'bg-caution',
  normal:   'bg-border-strong',
}

export function ThisWeekCard({
  thisWeekCount,
  goalSessions,
  weeklySummary,
  missions,
  nextWorkout,
  isDeloadWeek = false,
}: ThisWeekCardProps) {
  const [editing,   setEditing]   = useState(false)
  const [draftGoal, setDraftGoal] = useState(goalSessions)
  const [isPending, startTransition] = useTransition()

  const sessionPct = Math.min(100, Math.round((thisWeekCount / goalSessions) * 100))
  const reached    = thisWeekCount >= goalSessions
  const remaining  = Math.max(0, goalSessions - thisWeekCount)
  const dupScheme  = getCurrentDUPScheme()

  const saveGoal = () => {
    startTransition(async () => {
      await updateWeeklyGoalAction(draftGoal)
      setEditing(false)
    })
  }

  return (
    <div className="card border border-border-strong p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-primary" />
          <h3 className="t-label">This week</h3>
        </div>
        {isDeloadWeek ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised border border-border-strong">
            <span className="text-xs font-semibold text-primary">
              Deload week
            </span>
            <span className="text-xs text-tertiary">
              recover &amp; rebuild
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised border border-border-strong">
            <span className="text-xs font-semibold text-primary">
              {dupScheme.label}
            </span>
            <span className="text-xs text-tertiary">
              {dupScheme.repRange.min}–{dupScheme.repRange.max} reps
            </span>
          </div>
        )}
      </div>

      {/* Sessions + progress */}
      <div className="mb-4">
        {editing ? (
          <GoalEditor
            draftGoal={draftGoal}
            isPending={isPending}
            onChange={setDraftGoal}
            onSave={saveGoal}
            onCancel={() => { setEditing(false); setDraftGoal(goalSessions) }}
          />
        ) : (
          <div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="mono font-bold tabular-nums tracking-tighter leading-none text-primary"
                    style={{ fontSize: '3.25rem' }}
                  >
                    {thisWeekCount}
                  </span>
                  <span className="text-base text-tertiary">/ {goalSessions}</span>
                </div>
                <p className="text-xs mt-1 text-tertiary">sessions this week</p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="transition-colors p-2 rounded-xl text-tertiary hover:bg-surface-raised"
                aria-label="Edit weekly goal"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${sessionPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              {reached ? (
                <p className="t-label text-primary">Goal reached</p>
              ) : (
                <p className="t-caption">{remaining} more session{remaining !== 1 ? 's' : ''} to go</p>
              )}
              <VolumeDelta pct={weeklySummary.volumeChangePct} />
            </div>
          </div>
        )}
      </div>

      {/* Missions */}
      {missions.length > 0 && (
        <div className="mb-4">
          <p className="t-label mb-2.5">Missions</p>
          <div className="space-y-2">
            {missions.map(m => (
              <div
                key={m.id}
                className="flex gap-3 p-3 rounded-control bg-surface-raised border border-border"
              >
                <div className={cn('w-0.5 rounded-full self-stretch shrink-0', PRIORITY_BAR_CLASS[m.priority])} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary">{m.headline}</p>
                  <p className="t-caption mt-0.5 leading-relaxed text-tertiary">{m.detail}</p>
                </div>
                <span className="text-lg shrink-0 leading-none mt-0.5">{m.icon}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next session footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <div className="flex-1 min-w-0">
          {nextWorkout ? (
            <>
              <p className="t-label mb-1">Next session</p>
              <p className="t-caption font-medium text-primary truncate">{nextWorkout.focus}</p>
              <p className="text-xs text-tertiary truncate mt-0.5">{nextWorkout.reason}</p>
            </>
          ) : (
            <>
              <p className="t-label mb-1">Ready when you are</p>
              <p className="text-xs text-tertiary mt-0.5">Pick any session to keep momentum.</p>
            </>
          )}
        </div>
        <Link
          href="/routines"
          className={cn(getButtonClassName({ variant: 'secondary', size: 'sm', fullWidth: false }), 'shrink-0')}
        >
          Start <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}

interface GoalEditorProps {
  draftGoal: number
  isPending: boolean
  onChange:  (n: number) => void
  onSave:    () => void
  onCancel:  () => void
}

function GoalEditor({ draftGoal, isPending, onChange, onSave, onCancel }: GoalEditorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="t-caption text-tertiary">Sessions per week:</span>
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onChange(Math.max(1, draftGoal - 1))}
          className="w-7 h-7 bg-surface-raised border border-border rounded-lg text-secondary flex items-center justify-center hover:border-border-strong transition-colors"
        >−</button>
        <span className="w-6 text-center text-sm font-medium text-primary mono tabular-nums">{draftGoal}</span>
        <button
          onClick={() => onChange(Math.min(14, draftGoal + 1))}
          className="w-7 h-7 bg-surface-raised border border-border rounded-lg text-secondary flex items-center justify-center hover:border-border-strong transition-colors"
        >+</button>
      </div>
      <button
        onClick={onSave}
        disabled={isPending}
        className="ml-2 w-7 h-7 bg-primary text-bg rounded-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onCancel}
        className="w-7 h-7 bg-surface-raised border border-border rounded-lg text-tertiary flex items-center justify-center hover:text-primary transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function VolumeDelta({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="t-caption">—</span>
  if (pct === 0)    return <span className="t-caption">same volume</span>
  const up = pct > 0
  return (
    <span className={cn('text-xs font-medium mono', up ? 'text-positive' : 'text-caution')}>
      {up ? '↑' : '↓'} {Math.abs(pct)}% vol
    </span>
  )
}
